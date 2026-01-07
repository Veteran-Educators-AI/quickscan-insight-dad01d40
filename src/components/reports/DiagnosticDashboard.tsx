import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, Target, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';

interface DiagnosticDashboardProps {
  classId?: string;
}

const LEVEL_COLORS = {
  A: 'hsl(142, 76%, 36%)', // green
  B: 'hsl(160, 84%, 39%)', // teal
  C: 'hsl(48, 96%, 53%)',  // yellow
  D: 'hsl(25, 95%, 53%)',  // orange
  E: 'hsl(0, 84%, 60%)',   // red
  F: 'hsl(0, 74%, 42%)',   // dark red
};

const LEVEL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export function DiagnosticDashboard({ classId }: DiagnosticDashboardProps) {
  const { user } = useAuth();

  const { data: diagnosticResults, isLoading } = useQuery({
    queryKey: ['diagnostic-results-dashboard', user?.id, classId],
    queryFn: async () => {
      let query = supabase
        .from('diagnostic_results')
        .select(`
          *,
          students!inner(id, first_name, last_name, class_id)
        `)
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });

      if (classId) {
        query = query.eq('students.class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate level distribution
  const levelDistribution = useMemo(() => {
    if (!diagnosticResults?.length) return [];

    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    
    diagnosticResults.forEach(result => {
      const level = result.recommended_level;
      if (level && counts[level] !== undefined) {
        counts[level]++;
      }
    });

    return LEVEL_LABELS.map(level => ({
      level,
      count: counts[level],
      fill: LEVEL_COLORS[level],
    }));
  }, [diagnosticResults]);

  // Calculate average scores per level
  const levelScores = useMemo(() => {
    if (!diagnosticResults?.length) return [];

    const scores: Record<string, { total: number; count: number }> = {};
    
    LEVEL_LABELS.forEach(level => {
      scores[level] = { total: 0, count: 0 };
    });

    diagnosticResults.forEach(result => {
      const levelMap: Record<string, { score: number | null; total: number | null }> = {
        A: { score: result.level_a_score, total: result.level_a_total },
        B: { score: result.level_b_score, total: result.level_b_total },
        C: { score: result.level_c_score, total: result.level_c_total },
        D: { score: result.level_d_score, total: result.level_d_total },
        E: { score: result.level_e_score, total: result.level_e_total },
        F: { score: result.level_f_score, total: result.level_f_total },
      };

      LEVEL_LABELS.forEach(level => {
        const { score, total } = levelMap[level];
        if (score !== null && total !== null && total > 0) {
          const percentage = (score / total) * 100;
          scores[level].total += percentage;
          scores[level].count++;
        }
      });
    });

    return LEVEL_LABELS.map(level => ({
      level,
      avgScore: scores[level].count > 0 
        ? Math.round(scores[level].total / scores[level].count) 
        : 0,
      fill: LEVEL_COLORS[level],
    }));
  }, [diagnosticResults]);

  // Calculate progress over time
  const progressOverTime = useMemo(() => {
    if (!diagnosticResults?.length) return [];

    const byDate: Record<string, { date: string; A: number; B: number; C: number; D: number; E: number; F: number; total: number }> = {};

    diagnosticResults.forEach(result => {
      const date = format(new Date(result.created_at), 'MMM d');
      
      if (!byDate[date]) {
        byDate[date] = { date, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, total: 0 };
      }

      const level = result.recommended_level;
      if (level && byDate[date][level as keyof typeof byDate[typeof date]] !== undefined) {
        (byDate[date][level as 'A' | 'B' | 'C' | 'D' | 'E' | 'F'])++;
        byDate[date].total++;
      }
    });

    return Object.values(byDate).slice(-10); // Last 10 dates
  }, [diagnosticResults]);

  // Calculate topic performance
  const topicPerformance = useMemo(() => {
    if (!diagnosticResults?.length) return [];

    const byTopic: Record<string, { topic: string; avgScore: number; count: number; totalScore: number }> = {};

    diagnosticResults.forEach(result => {
      const topic = result.topic_name;
      if (!byTopic[topic]) {
        byTopic[topic] = { topic, avgScore: 0, count: 0, totalScore: 0 };
      }

      // Calculate total score for this result
      let totalScore = 0;
      let totalPossible = 0;

      const levels = [
        { score: result.level_a_score, total: result.level_a_total },
        { score: result.level_b_score, total: result.level_b_total },
        { score: result.level_c_score, total: result.level_c_total },
        { score: result.level_d_score, total: result.level_d_total },
        { score: result.level_e_score, total: result.level_e_total },
        { score: result.level_f_score, total: result.level_f_total },
      ];

      levels.forEach(l => {
        if (l.score !== null && l.total !== null) {
          totalScore += l.score;
          totalPossible += l.total;
        }
      });

      if (totalPossible > 0) {
        byTopic[topic].totalScore += (totalScore / totalPossible) * 100;
        byTopic[topic].count++;
      }
    });

    return Object.values(byTopic)
      .map(t => ({
        ...t,
        avgScore: t.count > 0 ? Math.round(t.totalScore / t.count) : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 8);
  }, [diagnosticResults]);

  // Summary stats
  const stats = useMemo(() => {
    if (!diagnosticResults?.length) {
      return { totalAssessments: 0, uniqueStudents: 0, avgLevel: '-', topicsAssessed: 0 };
    }

    const uniqueStudents = new Set(diagnosticResults.map(r => r.student_id)).size;
    const uniqueTopics = new Set(diagnosticResults.map(r => r.topic_name)).size;
    
    const levelCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    diagnosticResults.forEach(r => {
      if (r.recommended_level) levelCounts[r.recommended_level]++;
    });
    
    // Find most common level
    const maxLevel = Object.entries(levelCounts).reduce((a, b) => a[1] > b[1] ? a : b);
    
    return {
      totalAssessments: diagnosticResults.length,
      uniqueStudents,
      avgLevel: maxLevel[1] > 0 ? maxLevel[0] : '-',
      topicsAssessed: uniqueTopics,
    };
  }, [diagnosticResults]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!diagnosticResults?.length) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-medium text-lg mb-2">No Diagnostic Results Yet</h3>
          <p className="text-muted-foreground">
            Record diagnostic worksheet results to see class-wide analytics and progress tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    A: { label: 'Level A', color: LEVEL_COLORS.A },
    B: { label: 'Level B', color: LEVEL_COLORS.B },
    C: { label: 'Level C', color: LEVEL_COLORS.C },
    D: { label: 'Level D', color: LEVEL_COLORS.D },
    E: { label: 'Level E', color: LEVEL_COLORS.E },
    F: { label: 'Level F', color: LEVEL_COLORS.F },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Diagnostic Results Dashboard
        </h2>
        <p className="text-muted-foreground text-sm">
          Class-wide diagnostic performance and advancement level analysis
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAssessments}</p>
                <p className="text-xs text-muted-foreground">Assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniqueStudents}</p>
                <p className="text-xs text-muted-foreground">Students Assessed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <Award className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgLevel}</p>
                <p className="text-xs text-muted-foreground">Most Common Level</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.topicsAssessed}</p>
                <p className="text-xs text-muted-foreground">Topics Assessed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Level Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Level Distribution</CardTitle>
            <CardDescription>How students are distributed across advancement levels</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <PieChart>
                <Pie
                  data={levelDistribution.filter(d => d.count > 0)}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ level, count }) => `${level}: ${count}`}
                >
                  {levelDistribution.map((entry) => (
                    <Cell key={entry.level} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {LEVEL_LABELS.map(level => (
                <Badge
                  key={level}
                  variant="outline"
                  style={{ borderColor: LEVEL_COLORS[level], color: LEVEL_COLORS[level] }}
                >
                  Level {level}: {levelDistribution.find(d => d.level === level)?.count || 0}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Average Score by Level */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Average Score by Level</CardTitle>
            <CardDescription>Class performance on each advancement level</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <BarChart data={levelScores}>
                <XAxis dataKey="level" />
                <YAxis domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="avgScore" name="Avg Score %">
                  {levelScores.map((entry) => (
                    <Cell key={entry.level} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Progress Over Time */}
        {progressOverTime.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assessments Over Time</CardTitle>
              <CardDescription>Level distribution by date</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64">
                <LineChart data={progressOverTime}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {LEVEL_LABELS.map(level => (
                    <Line
                      key={level}
                      type="monotone"
                      dataKey={level}
                      stroke={LEVEL_COLORS[level]}
                      strokeWidth={2}
                      dot={{ fill: LEVEL_COLORS[level] }}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Topic Performance */}
        <Card className={progressOverTime.length <= 1 ? 'md:col-span-2' : ''}>
          <CardHeader>
            <CardTitle className="text-lg">Performance by Topic</CardTitle>
            <CardDescription>Average diagnostic scores across topics</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ avgScore: { label: 'Avg Score', color: 'hsl(var(--primary))' } }} className="h-64">
              <BarChart data={topicPerformance} layout="vertical">
                <XAxis type="number" domain={[0, 100]} />
                <YAxis 
                  dataKey="topic" 
                  type="category" 
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="avgScore" 
                  name="Avg Score %" 
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
