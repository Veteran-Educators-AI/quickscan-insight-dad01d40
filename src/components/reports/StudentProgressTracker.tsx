import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useStudentNames } from '@/lib/StudentNameContext';
import { GradeHistoryChart } from './GradeHistoryChart';

interface StudentProgressTrackerProps {
  classId?: string;
}

const LEVEL_VALUES: Record<string, number> = {
  A: 6,
  B: 5,
  C: 4,
  D: 3,
  E: 2,
  F: 1,
};

const VALUE_TO_LEVEL: Record<number, string> = {
  6: 'A',
  5: 'B',
  4: 'C',
  3: 'D',
  2: 'E',
  1: 'F',
};

const LEVEL_COLORS: Record<string, string> = {
  A: 'hsl(142, 76%, 36%)',
  B: 'hsl(160, 84%, 39%)',
  C: 'hsl(48, 96%, 53%)',
  D: 'hsl(25, 95%, 53%)',
  E: 'hsl(0, 84%, 60%)',
  F: 'hsl(0, 74%, 42%)',
};

const LEVEL_BG_COLORS: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-teal-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  E: 'bg-red-500',
  F: 'bg-red-700',
};

export function StudentProgressTracker({ classId }: StudentProgressTrackerProps) {
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const { getDisplayName } = useStudentNames();

  // Fetch students
  const { data: students } = useQuery({
    queryKey: ['students-for-progress', user?.id, classId],
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

  // Fetch diagnostic results
  const { data: diagnosticResults, isLoading } = useQuery({
    queryKey: ['diagnostic-progress', user?.id, classId],
    queryFn: async () => {
      let query = supabase
        .from('diagnostic_results')
        .select(`
          *,
          students!inner(id, first_name, last_name, class_id)
        `)
        .eq('teacher_id', user!.id)
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

  // Fetch grade history for selected student
  const { data: gradeHistory } = useQuery({
    queryKey: ['grade-history', selectedStudentId],
    queryFn: async () => {
      if (selectedStudentId === 'all') return [];
      
      const { data, error } = await supabase
        .from('grade_history')
        .select('*')
        .eq('student_id', selectedStudentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user && selectedStudentId !== 'all',
  });

  // Process student progress data
  const studentProgress = useMemo(() => {
    if (!diagnosticResults?.length) return [];

    const byStudent: Record<string, {
      studentId: string;
      studentName: string;
      assessments: Array<{
        date: string;
        topic: string;
        level: string;
        levelValue: number;
      }>;
      currentLevel: string;
      startLevel: string;
      trend: 'up' | 'down' | 'stable';
    }> = {};

    diagnosticResults.forEach(result => {
      const studentId = result.student_id;
      const student = result.students as { id: string; first_name: string; last_name: string };
      
      if (!byStudent[studentId]) {
        byStudent[studentId] = {
          studentId,
          studentName: getDisplayName(studentId, student.first_name, student.last_name),
          assessments: [],
          currentLevel: 'F',
          startLevel: 'F',
          trend: 'stable',
        };
      }

      if (result.recommended_level) {
        byStudent[studentId].assessments.push({
          date: format(new Date(result.created_at), 'MMM d'),
          topic: result.topic_name,
          level: result.recommended_level,
          levelValue: LEVEL_VALUES[result.recommended_level] || 1,
        });
      }
    });

    // Calculate trends
    return Object.values(byStudent)
      .map(student => {
        if (student.assessments.length > 0) {
          student.startLevel = student.assessments[0].level;
          student.currentLevel = student.assessments[student.assessments.length - 1].level;
          
          const startValue = LEVEL_VALUES[student.startLevel];
          const currentValue = LEVEL_VALUES[student.currentLevel];
          
          if (currentValue > startValue) {
            student.trend = 'up';
          } else if (currentValue < startValue) {
            student.trend = 'down';
          } else {
            student.trend = 'stable';
          }
        }
        return student;
      })
      .filter(s => s.assessments.length > 0)
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [diagnosticResults]);

  // Get selected student data
  const selectedStudent = useMemo(() => {
    if (selectedStudentId === 'all') return null;
    return studentProgress.find(s => s.studentId === selectedStudentId);
  }, [studentProgress, selectedStudentId]);

  // Summary stats
  const stats = useMemo(() => {
    const improving = studentProgress.filter(s => s.trend === 'up').length;
    const declining = studentProgress.filter(s => s.trend === 'down').length;
    const stable = studentProgress.filter(s => s.trend === 'stable').length;
    
    const levelCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    studentProgress.forEach(s => {
      if (levelCounts[s.currentLevel] !== undefined) {
        levelCounts[s.currentLevel]++;
      }
    });

    return { improving, declining, stable, levelCounts, total: studentProgress.length };
  }, [studentProgress]);

  const chartConfig = {
    levelValue: { label: 'Level', color: 'hsl(var(--primary))' },
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

  if (!studentProgress.length) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-medium text-lg mb-2">No Progress Data Yet</h3>
          <p className="text-muted-foreground">
            Record multiple diagnostic assessments for students to track their progress over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Student Progress Tracker
          </h2>
          <p className="text-muted-foreground text-sm">
            Track how students move between advancement levels A-F over time
          </p>
        </div>

        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a student" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students Overview</SelectItem>
            {students?.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {getDisplayName(student.id, student.first_name, student.last_name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.improving}</p>
                <p className="text-xs text-muted-foreground">Improving</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Minus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.stable}</p>
                <p className="text-xs text-muted-foreground">Stable</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <TrendingDown className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.declining}</p>
                <p className="text-xs text-muted-foreground">Needs Support</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Students Tracked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedStudent ? (
        /* Individual Student View */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedStudent.studentName}
                </CardTitle>
                <CardDescription>
                  {selectedStudent.assessments.length} assessments tracked
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedStudent.startLevel}</Badge>
                    <span>→</span>
                    <Badge className={cn(LEVEL_BG_COLORS[selectedStudent.currentLevel], 'text-white')}>
                      {selectedStudent.currentLevel}
                    </Badge>
                    {selectedStudent.trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                    {selectedStudent.trend === 'down' && <TrendingDown className="h-4 w-4 text-orange-500" />}
                    {selectedStudent.trend === 'stable' && <Minus className="h-4 w-4 text-blue-500" />}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <LineChart data={selectedStudent.assessments}>
                <XAxis dataKey="date" />
                <YAxis 
                  domain={[0.5, 6.5]} 
                  ticks={[1, 2, 3, 4, 5, 6]}
                  tickFormatter={(value) => VALUE_TO_LEVEL[value] || ''}
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{data.topic}</p>
                          <p className="text-sm text-muted-foreground">{data.date}</p>
                          <Badge className={cn(LEVEL_BG_COLORS[data.level], 'text-white mt-1')}>
                            Level {data.level}
                          </Badge>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {[1, 2, 3, 4, 5, 6].map(val => (
                  <ReferenceLine 
                    key={val} 
                    y={val} 
                    stroke="hsl(var(--border))" 
                    strokeDasharray="3 3" 
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="levelValue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ChartContainer>

            {/* Assessment History */}
            <div className="mt-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Assessment History
              </h4>
              <div className="space-y-2">
                {selectedStudent.assessments.map((assessment, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={cn(LEVEL_BG_COLORS[assessment.level], 'text-white')}>
                        {assessment.level}
                      </Badge>
                      <span className="font-medium">{assessment.topic}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{assessment.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grade History Chart */}
            {gradeHistory && gradeHistory.length > 0 && (
              <div className="mt-6">
                <GradeHistoryChart 
                  gradeHistory={gradeHistory} 
                  topicName="All Topics"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* All Students Overview */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Students Progress</CardTitle>
            <CardDescription>Overview of student advancement level changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {studentProgress.map(student => (
                <div 
                  key={student.studentId}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedStudentId(student.studentId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{student.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.assessments.length} assessment{student.assessments.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{student.startLevel}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge className={cn(LEVEL_BG_COLORS[student.currentLevel], 'text-white')}>
                        {student.currentLevel}
                      </Badge>
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
    </div>
  );
}
