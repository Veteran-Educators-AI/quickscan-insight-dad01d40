import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Users, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { MasteryHeatMap } from '@/components/reports/MasteryHeatMap';
import { TopicStrengthsChart } from '@/components/reports/TopicStrengthsChart';
import { DifferentiationGrouping } from '@/components/reports/DifferentiationGrouping';
import { EmailResponsesReport } from '@/components/reports/EmailResponsesReport';
import { useMasteryData } from '@/hooks/useMasteryData';

export default function Reports() {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

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
