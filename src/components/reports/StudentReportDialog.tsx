import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  User,
  Printer,
  ZoomIn,
  ZoomOut,
  Download,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Target,
  Calendar,
  FileText,
  Award,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useStudentNames } from '@/lib/StudentNameContext';
import { cn } from '@/lib/utils';
import scanGeniusLogo from '@/assets/scan-genius-logo.png';

interface StudentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

interface GradeEntry {
  id: string;
  topic_name: string;
  grade: number;
  regents_score: number | null;
  nys_standard: string | null;
  grade_justification: string | null;
  created_at: string;
}

interface DiagnosticEntry {
  id: string;
  topic_name: string;
  recommended_level: string | null;
  standard: string | null;
  notes: string | null;
  created_at: string;
}

const LEVEL_VALUES: Record<string, number> = {
  A: 6, B: 5, C: 4, D: 3, E: 2, F: 1,
};

const LEVEL_BG_COLORS: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-teal-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  E: 'bg-red-500',
  F: 'bg-red-700',
};

export function StudentReportDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: StudentReportDialogProps) {
  const { user } = useAuth();
  const [zoom, setZoom] = useState(100);
  const [sectionsExpanded, setSectionsExpanded] = useState({
    grades: true,
    diagnostics: true,
    misconceptions: true,
  });
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch grade history
  const { data: gradeHistory, isLoading: gradesLoading } = useQuery({
    queryKey: ['student-report-grades', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grade_history')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GradeEntry[];
    },
    enabled: open && !!studentId,
  });

  // Fetch diagnostic results
  const { data: diagnosticResults, isLoading: diagnosticsLoading } = useQuery({
    queryKey: ['student-report-diagnostics', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnostic_results')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DiagnosticEntry[];
    },
    enabled: open && !!studentId,
  });

  // Fetch misconceptions
  const { data: misconceptions } = useQuery({
    queryKey: ['student-report-misconceptions', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attempt_misconceptions')
        .select(`
          *,
          misconception:misconception_tags(name, description),
          attempt:attempts!inner(student_id)
        `)
        .eq('attempt.student_id', studentId);

      if (error) throw error;
      return data;
    },
    enabled: open && !!studentId,
  });

  const isLoading = gradesLoading || diagnosticsLoading;

  // Calculate summary statistics
  const stats = {
    totalAssessments: (gradeHistory?.length || 0) + (diagnosticResults?.length || 0),
    avgGrade: gradeHistory?.length
      ? Math.round(gradeHistory.reduce((sum, g) => sum + g.grade, 0) / gradeHistory.length)
      : 0,
    avgRegents: gradeHistory?.filter(g => g.regents_score)?.length
      ? (gradeHistory.filter(g => g.regents_score).reduce((sum, g) => sum + (g.regents_score || 0), 0) /
          gradeHistory.filter(g => g.regents_score).length).toFixed(1)
      : 'N/A',
    currentLevel: diagnosticResults?.[0]?.recommended_level || 'N/A',
    topicsAssessed: new Set([
      ...(gradeHistory?.map(g => g.topic_name) || []),
      ...(diagnosticResults?.map(d => d.topic_name) || []),
    ]).size,
    misconceptionCount: misconceptions?.length || 0,
  };

  // Calculate trend
  const trend = (() => {
    if (!gradeHistory || gradeHistory.length < 2) return 'stable';
    const recent = gradeHistory.slice(0, Math.min(3, gradeHistory.length));
    const older = gradeHistory.slice(-Math.min(3, gradeHistory.length));
    const recentAvg = recent.reduce((sum, g) => sum + g.grade, 0) / recent.length;
    const olderAvg = older.reduce((sum, g) => sum + g.grade, 0) / older.length;
    if (recentAvg > olderAvg + 5) return 'up';
    if (recentAvg < olderAvg - 5) return 'down';
    return 'stable';
  })();

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Report - ${studentName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1f2937; }
            .report-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
            .report-header h1 { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
            .report-header p { color: #6b7280; font-size: 14px; }
            .logo { height: 40px; margin-bottom: 12px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .stat-box { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #1f2937; }
            .stat-label { font-size: 12px; color: #6b7280; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
            .grade-entry { padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
            .grade-topic { font-weight: 500; }
            .grade-score { font-weight: bold; }
            .grade-score.high { color: #059669; }
            .grade-score.medium { color: #d97706; }
            .grade-score.low { color: #dc2626; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
            .badge-green { background: #dcfce7; color: #166534; }
            .badge-yellow { background: #fef9c3; color: #854d0e; }
            .badge-red { background: #fee2e2; color: #991b1b; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
            .diagnostic-entry { padding: 8px 12px; border-left: 3px solid #3b82f6; background: #f8fafc; margin-bottom: 8px; }
            .misconception-item { padding: 8px 12px; background: #fef3c7; border-radius: 6px; margin-bottom: 8px; }
            .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <div class="footer">
            Generated by ScanGenius on ${format(new Date(), 'MMMM d, yyyy')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportPDF = () => {
    // Use print dialog as PDF export
    handlePrint();
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 80) return 'text-green-600';
    if (grade >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeClass = (grade: number) => {
    if (grade >= 80) return 'high';
    if (grade >= 60) return 'medium';
    return 'low';
  };

  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5" />
              Student Report: {studentName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(prev => Math.max(50, prev - 10))}
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs w-12 text-center">{zoom}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(prev => Math.min(150, prev + 10))}
                  disabled={zoom >= 150}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-100px)]">
          <div
            ref={reportRef}
            className="p-6 transition-transform origin-top-left"
            style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%` }}
          >
            {/* Report Header */}
            <div className="report-header text-center mb-6 pb-4 border-b">
              <img src={scanGeniusLogo} alt="ScanGenius" className="logo h-10 mx-auto mb-3" />
              <h1 className="text-2xl font-bold">{studentName}</h1>
              <p className="text-muted-foreground text-sm">
                Student Performance Report • Generated {format(new Date(), 'MMMM d, yyyy')}
              </p>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="stat-box p-4 rounded-lg border bg-card text-center">
                <div className="stat-value text-2xl font-bold">{stats.totalAssessments}</div>
                <div className="stat-label text-xs text-muted-foreground">Total Assessments</div>
              </div>
              <div className="stat-box p-4 rounded-lg border bg-card text-center">
                <div className={cn('stat-value text-2xl font-bold', getGradeColor(stats.avgGrade))}>
                  {stats.avgGrade}%
                </div>
                <div className="stat-label text-xs text-muted-foreground">Average Grade</div>
              </div>
              <div className="stat-box p-4 rounded-lg border bg-card text-center">
                <div className="stat-value text-2xl font-bold">{stats.avgRegents}/6</div>
                <div className="stat-label text-xs text-muted-foreground">Avg Regents Score</div>
              </div>
              <div className="stat-box p-4 rounded-lg border bg-card text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                  {stats.currentLevel !== 'N/A' && (
                    <Badge className={cn(LEVEL_BG_COLORS[stats.currentLevel], 'text-white text-lg px-3')}>
                      {stats.currentLevel}
                    </Badge>
                  )}
                  {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                  {trend === 'down' && <TrendingDown className="h-5 w-5 text-red-500" />}
                  {trend === 'stable' && <Minus className="h-5 w-5 text-blue-500" />}
                </div>
                <div className="stat-label text-xs text-muted-foreground mt-1">Current Level</div>
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.topicsAssessed}</p>
                    <p className="text-xs text-muted-foreground">Topics Assessed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.misconceptionCount}</p>
                    <p className="text-xs text-muted-foreground">Misconceptions</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    trend === 'up' && "bg-green-500/10",
                    trend === 'down' && "bg-red-500/10",
                    trend === 'stable' && "bg-blue-500/10"
                  )}>
                    {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                    {trend === 'down' && <TrendingDown className="h-5 w-5 text-red-500" />}
                    {trend === 'stable' && <Minus className="h-5 w-5 text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-lg font-bold capitalize">{trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}</p>
                    <p className="text-xs text-muted-foreground">Performance Trend</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-6" />

            {/* Grade History Section */}
            <Collapsible open={sectionsExpanded.grades} onOpenChange={() => toggleSection('grades')}>
              <CollapsibleTrigger className="w-full">
                <div className="section-title flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Grade History
                    <Badge variant="secondary">{gradeHistory?.length || 0}</Badge>
                  </div>
                  {sectionsExpanded.grades ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="section space-y-2 mt-2">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : gradeHistory?.length ? (
                    gradeHistory.map(entry => (
                      <div
                        key={entry.id}
                        className="grade-entry p-3 rounded-lg border flex items-center justify-between hover:bg-muted/30"
                      >
                        <div className="flex-1">
                          <p className="grade-topic font-medium">{entry.topic_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {entry.nys_standard && (
                              <Badge variant="outline" className="text-xs">
                                {entry.nys_standard}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {entry.grade_justification && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {entry.grade_justification}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <span className={cn('grade-score text-xl font-bold', getGradeColor(entry.grade))}>
                            {entry.grade}%
                          </span>
                          {entry.regents_score !== null && (
                            <Badge
                              className={cn(
                                'text-white',
                                entry.regents_score >= 5 && 'bg-green-500',
                                entry.regents_score >= 3 && entry.regents_score < 5 && 'bg-yellow-500',
                                entry.regents_score < 3 && 'bg-red-500'
                              )}
                            >
                              {entry.regents_score}/6
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No grade history available
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-6" />

            {/* Diagnostic Results Section */}
            <Collapsible open={sectionsExpanded.diagnostics} onOpenChange={() => toggleSection('diagnostics')}>
              <CollapsibleTrigger className="w-full">
                <div className="section-title flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <Target className="h-5 w-5 text-blue-500" />
                    Diagnostic Results
                    <Badge variant="secondary">{diagnosticResults?.length || 0}</Badge>
                  </div>
                  {sectionsExpanded.diagnostics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="section space-y-2 mt-2">
                  {diagnosticResults?.length ? (
                    diagnosticResults.map(entry => (
                      <div
                        key={entry.id}
                        className="diagnostic-entry p-3 rounded-lg border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{entry.topic_name}</p>
                            {entry.standard && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {entry.standard}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {entry.recommended_level && (
                              <Badge className={cn(LEVEL_BG_COLORS[entry.recommended_level], 'text-white')}>
                                Level {entry.recommended_level}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{entry.notes}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No diagnostic results available
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-6" />

            {/* Misconceptions Section */}
            <Collapsible open={sectionsExpanded.misconceptions} onOpenChange={() => toggleSection('misconceptions')}>
              <CollapsibleTrigger className="w-full">
                <div className="section-title flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Identified Misconceptions
                    <Badge variant="secondary">{misconceptions?.length || 0}</Badge>
                  </div>
                  {sectionsExpanded.misconceptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="section space-y-2 mt-2">
                  {misconceptions?.length ? (
                    misconceptions.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="misconception-item p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
                      >
                        <p className="font-medium text-yellow-900 dark:text-yellow-100">
                          {item.misconception?.name || 'Unknown Misconception'}
                        </p>
                        {item.misconception?.description && (
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            {item.misconception.description}
                          </p>
                        )}
                        {item.confidence && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            Confidence: {Math.round(item.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No misconceptions identified - Great work!
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
