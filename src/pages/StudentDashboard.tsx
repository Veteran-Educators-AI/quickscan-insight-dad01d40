import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  GraduationCap, Loader2, LogOut, BookOpen, Award, 
  Clock, CheckCircle2, Calendar, TrendingUp, Star,
  FileText, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import nyclogicLogo from '@/assets/nycologic-ai-logo.png';

interface Assignment {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  coin_reward: number;
  due_at: string | null;
  status: string;
  created_at: string;
}

interface Grade {
  id: string;
  topic_name: string;
  grade: number;
  regents_score: number | null;
  created_at: string;
  grade_justification: string | null;
}

interface ClassInfo {
  id: string;
  name: string;
  teacher_name: string | null;
}

interface StudentInfo {
  id: string;
  first_name: string;
  last_name: string;
  class_id: string;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/student/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get student record
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, class_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (studentError) throw studentError;

      if (!studentData) {
        navigate('/student/join');
        return;
      }

      setStudent(studentData);

      // Get dashboard data using the function
      const { data, error } = await supabase.rpc('get_student_dashboard', {
        p_student_id: studentData.id,
      });

      if (error) throw error;

      const result = data as unknown as { 
        success: boolean; 
        assignments?: Assignment[]; 
        grades?: Grade[]; 
        class?: ClassInfo;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || 'Failed to load dashboard');
      }

      setAssignments(result.assignments || []);
      setGrades(result.grades || []);
      setClassInfo(result.class || null);
    } catch (error: any) {
      console.error('Dashboard error:', error);
      toast({
        title: 'Error loading dashboard',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/student/login');
  };

  const averageGrade = grades.length > 0 
    ? Math.round(grades.reduce((sum, g) => sum + g.grade, 0) / grades.length)
    : null;

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-emerald-400';
    if (grade >= 80) return 'text-blue-400';
    if (grade >= 70) return 'text-yellow-400';
    if (grade >= 65) return 'text-orange-400';
    return 'text-red-400';
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white/60">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-pink-500/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 bg-white/5 backdrop-blur-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={nyclogicLogo} alt="NYCLogic" className="h-10 w-10" />
              <div>
                <h1 className="text-xl font-bold text-white">NYCLogic Scholar</h1>
                <p className="text-sm text-purple-400">{classInfo?.name || 'Student Portal'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-white font-medium">
                  {student?.first_name} {student?.last_name}
                </p>
                <p className="text-white/50 text-sm">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/20">
                    <TrendingUp className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Average Grade</p>
                    <p className={`text-3xl font-bold ${averageGrade ? getGradeColor(averageGrade) : 'text-white/40'}`}>
                      {averageGrade !== null ? `${averageGrade}%` : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/20">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Completed</p>
                    <p className="text-3xl font-bold text-white">{grades.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-500/20">
                    <BookOpen className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Active Assignments</p>
                    <p className="text-3xl font-bold text-white">{assignments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="assignments" className="space-y-6">
            <TabsList className="bg-white/10">
              <TabsTrigger value="assignments" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <BookOpen className="h-4 w-4 mr-2" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="grades" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <Award className="h-4 w-4 mr-2" />
                Grades
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments">
              <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                    Your Assignments
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Complete these to earn XP and coins!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No active assignments right now</p>
                      <p className="text-white/40 text-sm">Check back later for new work!</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-white font-medium mb-1">{assignment.title}</h3>
                                <p className="text-white/60 text-sm mb-3">{assignment.description}</p>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1 text-purple-400">
                                    <Star className="h-4 w-4" />
                                    <span>{assignment.xp_reward} XP</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-amber-400">
                                    <Award className="h-4 w-4" />
                                    <span>{assignment.coin_reward} Coins</span>
                                  </div>
                                </div>
                              </div>
                              {assignment.due_at && (
                                <Badge variant="outline" className="border-white/20 text-white/60 shrink-0">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {format(new Date(assignment.due_at), 'MMM d')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="grades">
              <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-400" />
                    Your Grades
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    See how you're doing in each topic
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {grades.length === 0 ? (
                    <div className="text-center py-12">
                      <Award className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No grades yet</p>
                      <p className="text-white/40 text-sm">Complete assignments to see your grades here</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {grades.map((grade) => (
                          <div
                            key={grade.id}
                            className="p-4 rounded-xl bg-white/5 border border-white/10"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-white font-medium">{grade.topic_name}</h3>
                                <p className="text-white/50 text-sm">
                                  {format(new Date(grade.created_at), 'MMM d, yyyy')}
                                </p>
                                {grade.grade_justification && (
                                  <p className="text-white/60 text-sm mt-2 line-clamp-2">
                                    {grade.grade_justification}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className={`text-3xl font-bold ${getGradeColor(grade.grade)}`}>
                                  {grade.grade}%
                                </p>
                                {grade.regents_score !== null && (
                                  <p className="text-white/50 text-sm">
                                    Regents: {grade.regents_score}/6
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Teacher info */}
          {classInfo?.teacher_name && (
            <div className="mt-8 text-center">
              <p className="text-white/40 text-sm">
                Teacher: <span className="text-white/60">{classInfo.teacher_name}</span>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
