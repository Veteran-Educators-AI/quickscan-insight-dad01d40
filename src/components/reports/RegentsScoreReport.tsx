import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, User, BookOpen, Target, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useStudentNames } from '@/lib/StudentNameContext';

interface RegentsScoreReportProps {
  classId?: string;
}

const REGENTS_SCORE_COLORS: Record<number, string> = {
  4: 'hsl(142, 76%, 36%)',
  3: 'hsl(217, 91%, 60%)',
  2: 'hsl(48, 96%, 53%)',
  1: 'hsl(25, 95%, 53%)',
  0: 'hsl(0, 84%, 60%)',
};

const REGENTS_SCORE_BG: Record<number, string> = {
  4: 'bg-green-500',
  3: 'bg-blue-500',
  2: 'bg-yellow-500',
  1: 'bg-orange-500',
  0: 'bg-red-500',
};

const REGENTS_SCORE_LABELS: Record<number, string> = {
  4: 'Thorough Understanding',
  3: 'Adequate Understanding',
  2: 'Partial Understanding',
  1: 'Limited Understanding',
  0: 'No Understanding',
};

export function RegentsScoreReport({ classId }: RegentsScoreReportProps) {
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedStandard, setSelectedStandard] = useState<string>('all');
  const { getDisplayName } = useStudentNames();

  // Fetch students
  const { data: students } = useQuery({
    queryKey: ['students-for-regents', user?.id, classId],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, first_name, last_name, class_id, classes!inner(teacher_id)')
        .eq('classes.teacher_id', user!.id)
        .order('last_name');

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch grade history with regents scores
  const { data: gradeHistory, isLoading } = useQuery({
    queryKey: ['regents-grade-history', user?.id, classId],
    queryFn: async () => {
      let query = supabase
        .from('grade_history')
        .select(`
          *,
          students!inner(id, first_name, last_name, class_id)
        `)
        .eq('teacher_id', user!.id)
        .not('regents_score', 'is', null)
        .order('created_at', { ascending: true });

      if (classId) {
        query = query.eq('students.class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get unique standards
  const standards = useMemo(() => {
    if (!gradeHistory) return [];
    const uniqueStandards = [...new Set(gradeHistory
      .map(h => h.nys_standard)
      .filter((s): s is string => !!s))];
    return uniqueStandards.sort();
  }, [gradeHistory]);

  // Process data for visualizations
  const processedData = useMemo(() => {
    if (!gradeHistory?.length) return null;

    // Filter by selected student and standard
    let filtered = gradeHistory;
    if (selectedStudentId !== 'all') {
      filtered = filtered.filter(h => h.student_id === selectedStudentId);
    }
    if (selectedStandard !== 'all') {
      filtered = filtered.filter(h => h.nys_standard === selectedStandard);
    }

    // Student progress over time
    const studentProgress: Record<string, {
      studentId: string;
      studentName: string;
      scores: Array<{ date: string; score: number; topic: string; standard: string | null; grade: number }>;
      avgScore: number;
      trend: 'up' | 'down' | 'stable';
    }> = {};

    filtered.forEach(h => {
      const student = h.students as { id: string; first_name: string; last_name: string };
      if (!studentProgress[h.student_id]) {
        studentProgress[h.student_id] = {
          studentId: h.student_id,
          studentName: getDisplayName(h.student_id, student.first_name, student.last_name),
          scores: [],
          avgScore: 0,
          trend: 'stable',
        };
      }
      studentProgress[h.student_id].scores.push({
        date: format(new Date(h.created_at), 'MMM d'),
        score: h.regents_score ?? 0,
        topic: h.topic_name,
        standard: h.nys_standard,
        grade: h.grade,
      });
    });

    // Calculate averages and trends
    Object.values(studentProgress).forEach(sp => {
      if (sp.scores.length > 0) {
        sp.avgScore = sp.scores.reduce((sum, s) => sum + s.score, 0) / sp.scores.length;
        
        if (sp.scores.length >= 2) {
          const firstHalf = sp.scores.slice(0, Math.floor(sp.scores.length / 2));
          const secondHalf = sp.scores.slice(Math.floor(sp.scores.length / 2));
          const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;
          
          if (secondAvg > firstAvg + 0.3) sp.trend = 'up';
          else if (secondAvg < firstAvg - 0.3) sp.trend = 'down';
        }
      }
    });

    // Score distribution
    const scoreDistribution = [0, 1, 2, 3, 4].map(score => ({
      score,
      label: REGENTS_SCORE_LABELS[score],
      count: filtered.filter(h => h.regents_score === score).length,
      color: REGENTS_SCORE_COLORS[score],
    }));

    // Standard performance
    const standardPerformance: Record<string, { standard: string; avgScore: number; count: number }> = {};
    filtered.forEach(h => {
      const std = h.nys_standard || 'Unknown';
      if (!standardPerformance[std]) {
        standardPerformance[std] = { standard: std, avgScore: 0, count: 0 };
      }
      standardPerformance[std].count++;
      standardPerformance[std].avgScore = 
        (standardPerformance[std].avgScore * (standardPerformance[std].count - 1) + (h.regents_score ?? 0)) / 
        standardPerformance[std].count;
    });

    // Summary stats
    const totalAssessments = filtered.length;
    const avgRegentsScore = totalAssessments > 0 
      ? filtered.reduce((sum, h) => sum + (h.regents_score ?? 0), 0) / totalAssessments 
      : 0;
    const avgGrade = totalAssessments > 0
      ? filtered.reduce((sum, h) => sum + h.grade, 0) / totalAssessments
      : 0;
    const meetingStandards = filtered.filter(h => (h.regents_score ?? 0) >= 3).length;
    const meetingPercentage = totalAssessments > 0 ? (meetingStandards / totalAssessments) * 100 : 0;

    return {
      studentProgress: Object.values(studentProgress).sort((a, b) => b.avgScore - a.avgScore),
      scoreDistribution,
      standardPerformance: Object.values(standardPerformance).sort((a, b) => b.avgScore - a.avgScore),
      stats: {
        totalAssessments,
        avgRegentsScore: Math.round(avgRegentsScore * 10) / 10,
        avgGrade: Math.round(avgGrade),
        meetingStandards,
        meetingPercentage: Math.round(meetingPercentage),
      },
    };
  }, [gradeHistory, selectedStudentId, selectedStandard, getDisplayName]);

  const chartConfig = {
    score: { label: 'Regents Score', color: 'hsl(var(--primary))' },
    count: { label: 'Count', color: 'hsl(var(--primary))' },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!processedData || processedData.stats.totalAssessments === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-medium text-lg mb-2">No Regents Score Data Yet</h3>
          <p className="text-muted-foreground">
            Scan student work with NYS Regents grading enabled to see score trends and standard alignment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedStudentData = selectedStudentId !== 'all' 
    ? processedData.studentProgress.find(sp => sp.studentId === selectedStudentId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            NYS Regents Score Report
          </h2>
          <p className="text-muted-foreground text-sm">
            Track Regents scores (0-4) and standard alignment across assessments
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students?.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {getDisplayName(student.id, student.first_name, student.last_name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStandard} onValueChange={setSelectedStandard}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Standards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Standards</SelectItem>
              {standards.map((std) => (
                <SelectItem key={std} value={std}>{std}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl",
                processedData.stats.avgRegentsScore >= 3 ? 'bg-green-500' :
                processedData.stats.avgRegentsScore >= 2 ? 'bg-yellow-500' : 'bg-orange-500'
              )}>
                {processedData.stats.avgRegentsScore}
              </div>
              <div>
                <p className="text-sm font-medium">Avg Regents Score</p>
                <p className="text-xs text-muted-foreground">Out of 4</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processedData.stats.avgGrade}</p>
                <p className="text-xs text-muted-foreground">Avg Grade (55-100)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{processedData.stats.meetingPercentage}%</p>
                <p className="text-xs text-muted-foreground">Meeting Standards (≥3)</p>
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
                <p className="text-2xl font-bold">{processedData.stats.totalAssessments}</p>
                <p className="text-xs text-muted-foreground">Assessments Analyzed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Score Distribution</CardTitle>
          <CardDescription>Number of assessments at each Regents score level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-center gap-4 h-48">
            {processedData.scoreDistribution.map((item) => {
              const maxCount = Math.max(...processedData.scoreDistribution.map(d => d.count), 1);
              const height = (item.count / maxCount) * 100;
              return (
                <div key={item.score} className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium">{item.count}</span>
                  <div 
                    className={cn("w-16 rounded-t-lg transition-all", REGENTS_SCORE_BG[item.score])}
                    style={{ height: `${Math.max(height, 8)}%` }}
                  />
                  <div className="text-center">
                    <Badge className={cn("text-white", REGENTS_SCORE_BG[item.score])}>
                      {item.score}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1 max-w-16 leading-tight">
                      {item.label.split(' ')[0]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Individual Student Trend or Student Rankings */}
      {selectedStudentData ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedStudentData.studentName}
                </CardTitle>
                <CardDescription>
                  {selectedStudentData.scores.length} assessments | Avg: {selectedStudentData.avgScore.toFixed(1)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedStudentData.trend === 'up' && (
                  <Badge className="bg-emerald-500"><TrendingUp className="h-3 w-3 mr-1" />Improving</Badge>
                )}
                {selectedStudentData.trend === 'down' && (
                  <Badge className="bg-orange-500"><TrendingDown className="h-3 w-3 mr-1" />Declining</Badge>
                )}
                {selectedStudentData.trend === 'stable' && (
                  <Badge className="bg-blue-500"><Minus className="h-3 w-3 mr-1" />Stable</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <LineChart data={selectedStudentData.scores}>
                <XAxis dataKey="date" />
                <YAxis domain={[-0.5, 4.5]} ticks={[0, 1, 2, 3, 4]} />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{data.topic}</p>
                          <p className="text-xs text-muted-foreground mb-2">{data.standard}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-white", REGENTS_SCORE_BG[data.score])}>
                              {data.score}
                            </Badge>
                            <span className="text-sm">Grade: {data.grade}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {[0, 1, 2, 3, 4].map(val => (
                  <ReferenceLine key={val} y={val} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                ))}
                <ReferenceLine y={3} stroke="hsl(142, 76%, 36%)" strokeWidth={2} label={{ value: 'Meeting', position: 'right' }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={({ cx, cy, payload }) => (
                    <circle
                      key={`${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill={REGENTS_SCORE_COLORS[payload.score]}
                      stroke="white"
                      strokeWidth={2}
                    />
                  )}
                />
              </LineChart>
            </ChartContainer>

            {/* Recent Assessments */}
            <div className="mt-6 space-y-2">
              <h4 className="font-medium text-sm">Recent Assessments</h4>
              {selectedStudentData.scores.slice(-5).reverse().map((score, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge className={cn("text-white", REGENTS_SCORE_BG[score.score])}>
                      {score.score}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{score.topic}</p>
                      {score.standard && (
                        <p className="text-xs text-muted-foreground">{score.standard}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{score.grade}</p>
                    <p className="text-xs text-muted-foreground">{score.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Performance Rankings</CardTitle>
            <CardDescription>Students ranked by average Regents score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedData.studentProgress.slice(0, 10).map((student, idx) => (
                <div
                  key={student.studentId}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedStudentId(student.studentId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{student.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.scores.length} assessment{student.scores.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                      student.avgScore >= 3 ? 'bg-green-500' :
                      student.avgScore >= 2 ? 'bg-yellow-500' : 'bg-orange-500'
                    )}>
                      {student.avgScore.toFixed(1)}
                    </div>
                    <div className={cn(
                      "p-2 rounded-full",
                      student.trend === 'up' && "bg-emerald-500/10",
                      student.trend === 'down' && "bg-orange-500/10",
                      student.trend === 'stable' && "bg-blue-500/10"
                    )}>
                      {student.trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                      {student.trend === 'down' && <TrendingDown className="h-4 w-4 text-orange-500" />}
                      {student.trend === 'stable' && <Minus className="h-4 w-4 text-blue-500" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance by Standard */}
      {processedData.standardPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance by NYS Standard</CardTitle>
            <CardDescription>Average Regents score for each standard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedData.standardPerformance.map((std) => (
                <div key={std.standard} className="flex items-center gap-4">
                  <Badge variant="outline" className="min-w-24 justify-center bg-purple-50 dark:bg-purple-900/20 border-purple-300">
                    {std.standard}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className={cn("h-4 rounded-full transition-all",
                          std.avgScore >= 3 ? 'bg-green-500' :
                          std.avgScore >= 2 ? 'bg-yellow-500' : 'bg-orange-500'
                        )}
                        style={{ width: `${(std.avgScore / 4) * 100}%` }}
                      />
                      <span className="text-sm font-medium">{std.avgScore.toFixed(1)}</span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{std.count} assessments</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}