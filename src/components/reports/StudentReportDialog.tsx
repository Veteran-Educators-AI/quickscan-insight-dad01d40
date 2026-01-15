import { useState, useRef, useMemo } from 'react';
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
  Lightbulb,
  Send,
  Sparkles,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PrintRemediationQuestionsDialog } from '@/components/print/PrintRemediationQuestionsDialog';
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
  regents_justification: string | null;
  raw_score_earned: number | null;
  raw_score_possible: number | null;
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

interface SharedAssignment {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  coin_reward: number;
  due_at: string | null;
  status: string;
  topics: any[];
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

// Suggested remedies for common misconception patterns
const REMEDIATION_SUGGESTIONS: Record<string, string[]> = {
  'sign error': ['Practice signed number operations with number lines', 'Use color coding for positive/negative values'],
  'order of operations': ['PEMDAS mnemonic practice', 'Stepwise problem breakdown exercises'],
  'fraction': ['Visual fraction models', 'Equivalent fraction practice'],
  'decimal': ['Place value reinforcement', 'Decimal-fraction conversion drills'],
  'variable': ['Substitution practice', 'Variable definition exercises'],
  'equation': ['Balance method practice', 'Inverse operation drills'],
  'graph': ['Coordinate plotting practice', 'Slope-intercept form exercises'],
  'exponent': ['Exponent rules flashcards', 'Scientific notation practice'],
  'arithmetic': ['Basic operations drills', 'Mental math exercises', 'Calculator-free practice'],
  'calculation': ['Step-by-step verification practice', 'Check work backwards technique'],
  'setup': ['Problem translation exercises', 'Identify given vs. unknown practice'],
  'formula': ['Formula reference sheet practice', 'Derivation understanding exercises'],
  'notation': ['Mathematical notation drills', 'Symbol meaning flashcards'],
  'conceptual': ['Visual representations', 'Real-world application examples'],
  'procedural': ['Step-by-step algorithm practice', 'Flowchart problem solving'],
  'incomplete': ['Showing all work practice', 'Justification writing exercises'],
  'default': ['Targeted practice problems', 'One-on-one tutoring session', 'Visual learning aids'],
};

// Extract misconceptions from grade justification text
const extractMisconceptionsFromJustification = (justification: string): string[] => {
  const misconceptionPatterns = [
    /(?:error|mistake|incorrect|wrong|misconception|misunderstanding|confused|confusing)[:\s]+([^.!?]+[.!?])/gi,
    /(?:student|learner)\s+(?:did not|didn't|failed to|struggled with|had difficulty)[^.!?]+[.!?]/gi,
    /(?:points? (?:lost|deducted)|(?:lost|deducted) points?)\s+(?:for|because|due to)[^.!?]+[.!?]/gi,
    /(?:should have|needed to|was supposed to|forgot to)[^.!?]+[.!?]/gi,
    /(?:incorrect|wrong|improper)\s+(?:use|application|understanding|approach)[^.!?]+[.!?]/gi,
  ];
  
  const found: string[] = [];
  for (const pattern of misconceptionPatterns) {
    const matches = justification.match(pattern);
    if (matches) {
      found.push(...matches.map(m => m.trim()));
    }
  }
  
  // Also check for bullet points or numbered issues
  const bulletMatches = justification.match(/[-•]\s*[^-•\n]+(?:error|mistake|incorrect|wrong|issue)[^-•\n]*/gi);
  if (bulletMatches) {
    found.push(...bulletMatches.map(m => m.replace(/^[-•]\s*/, '').trim()));
  }
  
  return [...new Set(found)].slice(0, 5); // Dedupe and limit
};

export function StudentReportDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: StudentReportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [zoom, setZoom] = useState(100);
  const [sectionsExpanded, setSectionsExpanded] = useState({
    grades: true,
    diagnostics: true,
    misconceptions: true,
    pushedAssignments: true,
  });
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Remediation worksheet state
  const [isGeneratingRemediation, setIsGeneratingRemediation] = useState(false);
  const [remediationQuestions, setRemediationQuestions] = useState<any[]>([]);
  const [showRemediationDialog, setShowRemediationDialog] = useState(false);
  const [remediationTopicName, setRemediationTopicName] = useState('');

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

  // Fetch misconceptions from dedicated analysis_misconceptions table
  const { data: analysisMisconceptions } = useQuery({
    queryKey: ['student-report-analysis-misconceptions', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_misconceptions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open && !!studentId,
  });

  // Fetch legacy misconceptions with topic info (from attempt_misconceptions)
  const { data: legacyMisconceptions } = useQuery({
    queryKey: ['student-report-misconceptions', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attempt_misconceptions')
        .select(`
          *,
          misconception:misconception_tags(name, description, topic:topics(name)),
          attempt:attempts!inner(student_id, created_at, question:questions(prompt_text))
        `)
        .eq('attempt.student_id', studentId);

      if (error) throw error;
      return data;
    },
    enabled: open && !!studentId,
  });

  // Fetch pushed assignments (shared_assignments) for this student's class
  const { data: pushedAssignments } = useQuery({
    queryKey: ['student-report-pushed-assignments', studentId],
    queryFn: async () => {
      // First get the student's class
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', studentId)
        .single();

      if (studentError || !student) return [];

      // Then fetch shared assignments for that class
      const { data, error } = await supabase
        .from('shared_assignments')
        .select('*')
        .eq('class_id', student.class_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SharedAssignment[];
    },
    enabled: open && !!studentId,
  });

  const isLoading = gradesLoading || diagnosticsLoading;

  // Combine analysis misconceptions (new table) with legacy misconceptions
  const allMisconceptions = useMemo(() => {
    const combined: any[] = [];
    
    // Add from new analysis_misconceptions table (primary source)
    if (analysisMisconceptions?.length) {
      analysisMisconceptions.forEach(m => {
        combined.push({
          type: 'analysis',
          id: m.id,
          text: m.misconception_text,
          topic: m.topic_name,
          severity: m.severity,
          remedies: m.suggested_remedies || [],
          gradeImpact: m.grade_impact,
          date: m.created_at,
        });
      });
    }
    
    // Add from legacy attempt_misconceptions table
    if (legacyMisconceptions?.length) {
      legacyMisconceptions.forEach((item: any) => {
        combined.push({
          type: 'legacy',
          id: item.misconception_id,
          text: item.misconception?.name || 'Unknown Misconception',
          description: item.misconception?.description,
          topic: item.misconception?.topic?.name,
          confidence: item.confidence,
          date: item.attempt?.created_at,
        });
      });
    }
    
    return combined;
  }, [analysisMisconceptions, legacyMisconceptions]);

  // Extract misconceptions from grade justifications when no formal misconceptions exist
  const extractedMisconceptions = useMemo(() => {
    if (allMisconceptions.length > 0) return []; // Use stored misconceptions if they exist
    
    const extracted: { text: string; topic: string; grade: number; date: string }[] = [];
    gradeHistory?.forEach(entry => {
      if (entry.grade < 80 && entry.grade_justification) {
        const found = extractMisconceptionsFromJustification(entry.grade_justification);
        found.forEach(text => {
          extracted.push({
            text,
            topic: entry.topic_name,
            grade: entry.grade,
            date: entry.created_at,
          });
        });
      }
    });
    return extracted;
  }, [gradeHistory, allMisconceptions]);

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
    misconceptionCount: allMisconceptions.length + extractedMisconceptions.length,
    pushedCount: pushedAssignments?.length || 0,
  };

  // Get suggested remedies based on misconception name
  const getSuggestedRemedies = (misconceptionName: string): string[] => {
    const nameLower = misconceptionName.toLowerCase();
    for (const [key, remedies] of Object.entries(REMEDIATION_SUGGESTIONS)) {
      if (nameLower.includes(key)) {
        return remedies;
      }
    }
    return REMEDIATION_SUGGESTIONS.default;
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

  // Generate remediation worksheet from identified misconceptions
  const handleGenerateRemediation = async () => {
    // Gather all misconceptions for generation
    const misconceptionsToRemediate = allMisconceptions.length > 0 
      ? allMisconceptions.map(m => m.text)
      : extractedMisconceptions.map(m => m.text);
    
    if (misconceptionsToRemediate.length === 0) {
      toast({
        title: 'No misconceptions found',
        description: 'There are no misconceptions to generate remediation questions for.',
        variant: 'destructive',
      });
      return;
    }

    // Get the primary topic from misconceptions
    const primaryTopic = allMisconceptions[0]?.topic || 
                         extractedMisconceptions[0]?.topic || 
                         'Math Practice';
    
    setIsGeneratingRemediation(true);
    setRemediationTopicName(primaryTopic);

    try {
      const response = await supabase.functions.invoke('generate-remediation-questions', {
        body: {
          misconceptions: misconceptionsToRemediate.slice(0, 5), // Limit to 5 misconceptions
          studentName,
          problemContext: `Generating targeted remediation for student ${studentName} based on identified misconceptions from their assessments.`,
          questionsPerMisconception: 3,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate remediation questions');
      }

      const questions = response.data?.questions || [];
      if (questions.length === 0) {
        throw new Error('No questions were generated');
      }

      setRemediationQuestions(questions);
      setShowRemediationDialog(true);
      
      toast({
        title: 'Remediation worksheet generated!',
        description: `Created ${questions.length} targeted questions addressing ${misconceptionsToRemediate.length} misconception(s).`,
      });
    } catch (error: any) {
      console.error('Error generating remediation:', error);
      toast({
        title: 'Failed to generate remediation',
        description: error.message || 'An error occurred while generating questions.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingRemediation(false);
    }
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
                <div className="section space-y-3 mt-2">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : gradeHistory?.length ? (
                    gradeHistory.map(entry => (
                      <Card key={entry.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-lg">{entry.topic_name}</p>
                                {entry.nys_standard && (
                                  <Badge variant="outline" className="text-xs">
                                    {entry.nys_standard}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(entry.created_at), 'MMMM d, yyyy h:mm a')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className={cn('text-2xl font-bold', getGradeColor(entry.grade))}>
                                  {entry.grade}%
                                </span>
                                {entry.raw_score_earned !== null && entry.raw_score_possible !== null && (
                                  <p className="text-xs text-muted-foreground">
                                    {entry.raw_score_earned}/{entry.raw_score_possible} pts
                                  </p>
                                )}
                              </div>
                              {entry.regents_score !== null && (
                                <Badge
                                  className={cn(
                                    'text-white text-lg px-3 py-1',
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
                          
                          {/* Grade Justification */}
                          {entry.grade_justification && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                <FileText className="h-4 w-4 text-primary" />
                                Grade Justification
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {entry.grade_justification}
                              </p>
                            </div>
                          )}
                          
                          {/* Regents Justification */}
                          {entry.regents_justification && (
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium mb-1 text-blue-700 dark:text-blue-300">
                                <Award className="h-4 w-4" />
                                Regents Scoring Rationale
                              </div>
                              <p className="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
                                {entry.regents_justification}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
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
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex-1">
                  <div className="section-title flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Identified Misconceptions
                      <Badge variant="secondary">{stats.misconceptionCount}</Badge>
                    </div>
                    {sectionsExpanded.misconceptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                
                {/* Generate Remediation Button */}
                {stats.misconceptionCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-3 gap-2 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateRemediation();
                    }}
                    disabled={isGeneratingRemediation}
                  >
                    {isGeneratingRemediation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4" />
                        Generate Remediation
                      </>
                    )}
                  </Button>
                )}
              </div>
              <CollapsibleContent>
                <div className="section space-y-3 mt-2">
                  {allMisconceptions.length > 0 ? (
                    allMisconceptions.map((item: any, idx: number) => {
                      const misconceptionName = item.text || 'Unknown Misconception';
                      const remedies = item.remedies?.length > 0 ? item.remedies : getSuggestedRemedies(misconceptionName);
                      
                      return (
                        <Card key={idx} className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                                    {misconceptionName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.topic && (
                                    <Badge variant="outline" className="text-xs">
                                      Topic: {item.topic}
                                    </Badge>
                                  )}
                                  {item.severity && (
                                    <Badge 
                                      className={cn(
                                        'text-xs',
                                        item.severity === 'high' && 'bg-red-500 text-white',
                                        item.severity === 'medium' && 'bg-yellow-500 text-white',
                                        item.severity === 'low' && 'bg-green-500 text-white'
                                      )}
                                    >
                                      {item.severity} severity
                                    </Badge>
                                  )}
                                  {item.gradeImpact && (
                                    <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                      -{item.gradeImpact} pts impact
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {item.confidence && (
                                <Badge 
                                  className={cn(
                                    'text-white',
                                    item.confidence >= 0.8 && 'bg-red-500',
                                    item.confidence >= 0.5 && item.confidence < 0.8 && 'bg-yellow-500',
                                    item.confidence < 0.5 && 'bg-green-500'
                                  )}
                                >
                                  {Math.round(item.confidence * 100)}% confidence
                                </Badge>
                              )}
                            </div>
                            
                            {item.description && (
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                                {item.description}
                              </p>
                            )}
                            
                            {/* Suggested Remedies */}
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2 text-sm font-medium mb-2 text-green-700 dark:text-green-300">
                                <Lightbulb className="h-4 w-4" />
                                Suggested Remediation Strategies
                              </div>
                              <ul className="space-y-1">
                                {remedies.map((remedy: string, rIdx: number) => (
                                  <li key={rIdx} className="text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    {remedy}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {item.date && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Identified on {format(new Date(item.date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : extractedMisconceptions.length > 0 ? (
                    // Show extracted misconceptions from grade justifications
                    <>
                      <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800 mb-3">
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          The following issues were identified from grade justifications and may have contributed to lower scores:
                        </p>
                      </div>
                      {extractedMisconceptions.map((item, idx) => {
                        const remedies = getSuggestedRemedies(item.text);
                        
                        return (
                          <Card key={idx} className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                    <p className="font-medium text-yellow-900 dark:text-yellow-100 text-sm">
                                      {item.text}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      Topic: {item.topic}
                                    </Badge>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        'text-xs',
                                        item.grade < 60 && 'border-red-300 text-red-600',
                                        item.grade >= 60 && item.grade < 80 && 'border-yellow-300 text-yellow-600'
                                      )}
                                    >
                                      Score: {item.grade}%
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Suggested Remedies */}
                              <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 text-sm font-medium mb-2 text-green-700 dark:text-green-300">
                                  <Lightbulb className="h-4 w-4" />
                                  Suggested Remediation Strategies
                                </div>
                                <ul className="space-y-1">
                                  {remedies.map((remedy, rIdx) => (
                                    <li key={rIdx} className="text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
                                      <span className="text-green-500 mt-0.5">•</span>
                                      {remedy}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <p className="text-xs text-muted-foreground mt-2">
                                From assessment on {format(new Date(item.date), 'MMM d, yyyy')}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No misconceptions identified - Great work!
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-6" />

            {/* Pushed Assignments to Scholar App */}
            <Collapsible open={sectionsExpanded.pushedAssignments} onOpenChange={() => toggleSection('pushedAssignments')}>
              <CollapsibleTrigger className="w-full">
                <div className="section-title flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <Send className="h-5 w-5 text-purple-500" />
                    Problem Sets Pushed to Scholar App
                    <Badge variant="secondary">{pushedAssignments?.length || 0}</Badge>
                  </div>
                  {sectionsExpanded.pushedAssignments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="section space-y-3 mt-2">
                  {pushedAssignments?.length ? (
                    pushedAssignments.map(assignment => {
                      const topics = Array.isArray(assignment.topics) ? assignment.topics : [];
                      
                      return (
                        <Card key={assignment.id} className="border-purple-200 dark:border-purple-800">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-5 w-5 text-purple-500" />
                                  <p className="font-semibold">{assignment.title}</p>
                                </div>
                                {assignment.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {assignment.description}
                                  </p>
                                )}
                              </div>
                              <Badge 
                                className={cn(
                                  'text-white',
                                  assignment.status === 'active' && 'bg-green-500',
                                  assignment.status === 'completed' && 'bg-blue-500',
                                  assignment.status === 'expired' && 'bg-gray-500'
                                )}
                              >
                                {assignment.status}
                              </Badge>
                            </div>
                            
                            {/* Rewards */}
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-1 text-sm">
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  🏆 {assignment.xp_reward} XP
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                                  🪙 {assignment.coin_reward} Coins
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Topics */}
                            {topics.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Topics Covered:</p>
                                <div className="flex flex-wrap gap-1">
                                  {topics.map((topic: any, tIdx: number) => (
                                    <Badge key={tIdx} variant="secondary" className="text-xs">
                                      {typeof topic === 'string' ? topic : topic.name || 'Unknown'}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                              <span>Pushed on {format(new Date(assignment.created_at), 'MMM d, yyyy')}</span>
                              {assignment.due_at && (
                                <span className="text-orange-600">
                                  Due: {format(new Date(assignment.due_at), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No problem sets pushed to Scholar App yet
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Remediation Questions Print Dialog */}
      <PrintRemediationQuestionsDialog
        open={showRemediationDialog}
        onOpenChange={setShowRemediationDialog}
        questions={remediationQuestions}
        studentName={studentName}
        topicName={remediationTopicName}
      />
    </Dialog>
  );
}
