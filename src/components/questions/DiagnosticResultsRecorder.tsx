import { useState, useEffect } from 'react';
import { Loader2, Save, Users, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { getStudentPseudonym } from '@/lib/studentPseudonyms';

type AdvancementLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface DiagnosticQuestion {
  questionNumber: number;
  advancementLevel?: AdvancementLevel;
}

interface StudentScore {
  studentId: string;
  scores: Record<AdvancementLevel, { correct: number; total: number }>;
}

interface DiagnosticResultsRecorderProps {
  worksheetId?: string;
  worksheetTitle: string;
  topicName: string;
  standard?: string;
  questions: DiagnosticQuestion[];
  classId: string;
  onComplete?: () => void;
}

const LEVELS: AdvancementLevel[] = ['A', 'B', 'C', 'D', 'E', 'F'];

const getLevelColor = (level: AdvancementLevel) => {
  switch (level) {
    case 'A': return 'bg-green-100 text-green-800 border-green-300';
    case 'B': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'E': return 'bg-red-100 text-red-800 border-red-300';
    case 'F': return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const calculateRecommendedLevel = (scores: Record<AdvancementLevel, { correct: number; total: number }>): AdvancementLevel => {
  // Find the highest level where student scores >= 70%
  for (const level of LEVELS) {
    const { correct, total } = scores[level];
    if (total > 0) {
      const percentage = (correct / total) * 100;
      if (percentage < 70) {
        // Return the next easier level, or F if already at F
        const currentIndex = LEVELS.indexOf(level);
        return currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : 'F';
      }
    }
  }
  return 'A'; // If all levels are passed, recommend level A
};

export function DiagnosticResultsRecorder({
  worksheetId,
  worksheetTitle,
  topicName,
  standard,
  questions,
  classId,
  onComplete
}: DiagnosticResultsRecorderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
  
  // Count questions per level
  const questionsPerLevel = questions.reduce((acc, q) => {
    if (q.advancementLevel) {
      acc[q.advancementLevel] = (acc[q.advancementLevel] || 0) + 1;
    }
    return acc;
  }, {} as Record<AdvancementLevel, number>);

  useEffect(() => {
    fetchStudents();
  }, [classId]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', classId)
        .order('last_name');

      if (error) throw error;

      setStudents(data || []);
      
      // Initialize scores for each student
      const initialScores: StudentScore[] = (data || []).map(student => ({
        studentId: student.id,
        scores: LEVELS.reduce((acc, level) => {
          acc[level] = { correct: 0, total: questionsPerLevel[level] || 0 };
          return acc;
        }, {} as Record<AdvancementLevel, { correct: number; total: number }>)
      }));
      setStudentScores(initialScores);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error loading students',
        description: 'Could not load class students.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateScore = (studentId: string, level: AdvancementLevel, correct: number) => {
    setStudentScores(prev => prev.map(ss => {
      if (ss.studentId === studentId) {
        return {
          ...ss,
          scores: {
            ...ss.scores,
            [level]: { ...ss.scores[level], correct: Math.max(0, Math.min(correct, ss.scores[level].total)) }
          }
        };
      }
      return ss;
    }));
  };

  const saveResults = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Fetch previous results for comparison
      const studentIds = studentScores.map(ss => ss.studentId);
      const { data: previousResults } = await supabase
        .from('diagnostic_results')
        .select('student_id, recommended_level, topic_name')
        .in('student_id', studentIds)
        .eq('topic_name', topicName)
        .order('created_at', { ascending: false });

      // Group by student to get most recent
      const previousLevelByStudent: Record<string, string> = {};
      previousResults?.forEach(r => {
        if (!previousLevelByStudent[r.student_id]) {
          previousLevelByStudent[r.student_id] = r.recommended_level || '';
        }
      });

      // Get teacher profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      const resultsToInsert = studentScores.map(ss => {
        const recommendedLevel = calculateRecommendedLevel(ss.scores);
        return {
          student_id: ss.studentId,
          worksheet_id: worksheetId || null,
          teacher_id: user.id,
          topic_name: topicName,
          standard: standard || null,
          level_a_score: ss.scores.A.correct,
          level_a_total: ss.scores.A.total,
          level_b_score: ss.scores.B.correct,
          level_b_total: ss.scores.B.total,
          level_c_score: ss.scores.C.correct,
          level_c_total: ss.scores.C.total,
          level_d_score: ss.scores.D.correct,
          level_d_total: ss.scores.D.total,
          level_e_score: ss.scores.E.correct,
          level_e_total: ss.scores.E.total,
          level_f_score: ss.scores.F.correct,
          level_f_total: ss.scores.F.total,
          recommended_level: recommendedLevel,
        };
      });

      const { error } = await supabase
        .from('diagnostic_results')
        .insert(resultsToInsert);

      if (error) throw error;

      // Check for level changes and send notifications
      const LEVEL_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];
      const notifications: Array<{ studentId: string; studentName: string; previousLevel: string | null; currentLevel: string; type: 'level_drop' | 'level_a_achieved' }> = [];

      studentScores.forEach(ss => {
        const student = students.find(s => s.id === ss.studentId);
        if (!student) return;

        const currentLevel = calculateRecommendedLevel(ss.scores);
        const previousLevel = previousLevelByStudent[ss.studentId];
        const studentName = getStudentPseudonym(ss.studentId);

        // Check for Level A achievement
        if (currentLevel === 'A' && previousLevel !== 'A') {
          notifications.push({
            studentId: ss.studentId,
            studentName,
            previousLevel: previousLevel || null,
            currentLevel,
            type: 'level_a_achieved'
          });
        }
        // Check for level drop (current level is worse than previous)
        else if (previousLevel && LEVEL_ORDER.indexOf(currentLevel) > LEVEL_ORDER.indexOf(previousLevel)) {
          notifications.push({
            studentId: ss.studentId,
            studentName,
            previousLevel,
            currentLevel,
            type: 'level_drop'
          });
        }
      });

      // Send notifications in background
      if (notifications.length > 0 && profile?.email) {
        notifications.forEach(async (notification) => {
          try {
            await supabase.functions.invoke('send-level-notification', {
              body: {
                studentId: notification.studentId,
                studentName: notification.studentName,
                previousLevel: notification.previousLevel,
                currentLevel: notification.currentLevel,
                topicName: topicName,
                teacherEmail: profile.email,
                teacherName: profile.full_name || 'Teacher',
                notificationType: notification.type
              }
            });
          } catch (e) {
            console.error('Failed to send notification:', e);
          }
        });

        toast({
          title: 'Notifications sent!',
          description: `${notifications.length} level change notification(s) sent to your email.`,
        });
      }

      toast({
        title: 'Results saved!',
        description: `Diagnostic results saved for ${students.length} students.`,
      });

      onComplete?.();
    } catch (error) {
      console.error('Error saving results:', error);
      toast({
        title: 'Failed to save',
        description: 'Could not save diagnostic results.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Record Diagnostic Results
        </CardTitle>
        <CardDescription>
          Enter the number of correct answers for each student at each level for "{worksheetTitle}"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level legend */}
        <div className="flex flex-wrap gap-2 pb-3 border-b">
          {LEVELS.map(level => (
            <Badge key={level} variant="outline" className={getLevelColor(level)}>
              Level {level}: {questionsPerLevel[level] || 0} Q
            </Badge>
          ))}
        </div>

        {/* Student scores table */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {students.map(student => {
              const scoreData = studentScores.find(ss => ss.studentId === student.id);
              const recommendedLevel = scoreData ? calculateRecommendedLevel(scoreData.scores) : 'C';
              
              return (
                <div key={student.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {getStudentPseudonym(student.id)}
                    </span>
                    <Badge variant="outline" className={getLevelColor(recommendedLevel)}>
                      Recommended: Level {recommendedLevel}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-2">
                    {LEVELS.map(level => {
                      const total = questionsPerLevel[level] || 0;
                      const correct = scoreData?.scores[level].correct || 0;
                      
                      if (total === 0) {
                        return (
                          <div key={level} className="text-center opacity-50">
                            <Label className="text-xs text-muted-foreground">Level {level}</Label>
                            <div className="text-xs">N/A</div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={level} className="text-center">
                          <Label className="text-xs text-muted-foreground">Level {level}</Label>
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={total}
                              value={correct}
                              onChange={(e) => updateScore(student.id, level, parseInt(e.target.value) || 0)}
                              className="w-12 h-7 text-center text-sm p-1"
                            />
                            <span className="text-xs text-muted-foreground">/{total}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Button onClick={saveResults} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Diagnostic Results
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
