import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Users, BookOpen, Share2, Loader2, Copy, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { MasteryHeatMap } from '@/components/reports/MasteryHeatMap';
import { TopicStrengthsChart } from '@/components/reports/TopicStrengthsChart';
import { DifferentiationGrouping } from '@/components/reports/DifferentiationGrouping';
import { EmailResponsesReport } from '@/components/reports/EmailResponsesReport';
import { ScanAnalysisHistory } from '@/components/reports/ScanAnalysisHistory';
import { DiagnosticDashboard } from '@/components/reports/DiagnosticDashboard';
import { StudentProgressTracker } from '@/components/reports/StudentProgressTracker';
import { RegentsScoreReport } from '@/components/reports/RegentsScoreReport';
import { useMasteryData } from '@/hooks/useMasteryData';
import { toast } from 'sonner';

export default function Reports() {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportToScanScholar = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedClassId !== 'all') {
        params.set('class_id', selectedClassId);
      } else {
        params.set('teacher_id', user.id);
      }

      const { data, error } = await supabase.functions.invoke('get-student-analytics', {
        body: null,
        headers: {},
      });

      // If invoke doesn't work well, try direct fetch
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-student-analytics?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await response.json();
      
      // Copy to clipboard as JSON
      await navigator.clipboard.writeText(JSON.stringify(analyticsData, null, 2));
      setCopied(true);
      toast.success('Analytics data copied to clipboard! Paste it into Scan Scholar to generate worksheets.');
      
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export analytics data');
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch classes for filter
  const { data: classes } = useQuery({
    queryKey: ['classes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user!.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get mastery data
  const { students, topics, isLoading, error } = useMasteryData({
    classId: selectedClassId === 'all' ? undefined : selectedClassId,
  });

  // Calculate summary stats
  const totalStudents = students.length;
  const studentsWithData = students.filter(s => s.overallMastery > 0).length;
  const classAverage = studentsWithData > 0
    ? Math.round(students.reduce((sum, s) => sum + s.overallMastery, 0) / studentsWithData)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground">View student performance and analytics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleExportToScanScholar}
              disabled={isExporting || students.length === 0}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : copied ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              {copied ? 'Copied!' : 'Export to Scan Scholar'}
            </Button>

            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-96" />
          </div>
        ) : error ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-destructive">Error loading data: {error.message}</p>
            </CardContent>
          </Card>
        ) : students.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium text-lg mb-2">No data yet</h3>
              <p className="text-muted-foreground">
                Add students and scan their work to see analytics and reports
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalStudents}</p>
                      <p className="text-sm text-muted-foreground">Total Students</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-emerald-500/10">
                      <BarChart3 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{classAverage}%</p>
                      <p className="text-sm text-muted-foreground">Class Average</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <BookOpen className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{topics.length}</p>
                      <p className="text-sm text-muted-foreground">Topics Tracked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Strengths and Weaknesses */}
            <TopicStrengthsChart data={students} topics={topics} />

            {/* Heat Map */}
            <MasteryHeatMap
              data={students}
              topics={topics}
              title="Student Mastery by Topic"
              description="Hover over cells to see detailed performance data"
            />

            {/* Diagnostic Dashboard */}
            <DiagnosticDashboard classId={selectedClassId === 'all' ? undefined : selectedClassId} />

            {/* Student Progress Tracker */}
            <StudentProgressTracker classId={selectedClassId === 'all' ? undefined : selectedClassId} />

            {/* Regents Score Report */}
            <RegentsScoreReport classId={selectedClassId === 'all' ? undefined : selectedClassId} />

            {/* Scan Analysis History */}
            <ScanAnalysisHistory classId={selectedClassId === 'all' ? undefined : selectedClassId} />

            {/* Email Responses */}
            <EmailResponsesReport classId={selectedClassId === 'all' ? undefined : selectedClassId} />

            {/* Differentiation & Grouping */}
            <DifferentiationGrouping students={students} topics={topics} />
          </>
        )}
      </div>
    </AppLayout>
  );
}
