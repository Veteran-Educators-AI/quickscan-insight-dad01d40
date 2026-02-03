import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2, Users, Target, TrendingDown, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';
import { toast } from 'sonner';

interface PushAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClassId?: string;
}

interface ClassOption {
  id: string;
  name: string;
  studentCount: number;
}

interface StudentWeakness {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  weakTopics: Array<{
    topic: string;
    standard: string | null;
    avgGrade: number;
    attempts: number;
  }>;
}

export function PushAssignmentDialog({
  open,
  onOpenChange,
  defaultClassId,
}: PushAssignmentDialogProps) {
  const { user } = useAuth();
  const { pushToSisterApp } = usePushToSisterApp();
  
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId || '');
  const [questionCount, setQuestionCount] = useState(5);
  const [isPushing, setIsPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState({ current: 0, total: 0, studentName: '' });

  // Update state when defaults change
  useEffect(() => {
    if (defaultClassId) setSelectedClassId(defaultClassId);
  }, [defaultClassId]);

  // Fetch classes
  const { data: classes, isLoading: loadingClasses } = useQuery({
    queryKey: ['push-assignment-classes', user?.id],
    queryFn: async () => {
      const { data: classesData, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user!.id)
        .is('archived_at', null)
        .order('name');

      if (error) throw error;

      // Get student counts
      const classOptions: ClassOption[] = [];
      for (const cls of classesData || []) {
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', cls.id);
        
        classOptions.push({
          id: cls.id,
          name: cls.name,
          studentCount: count || 0,
        });
      }

      return classOptions;
    },
    enabled: !!user && open,
  });

  // Analyze student performance to find individual weaknesses
  const { data: studentWeaknesses, isLoading: loadingWeaknesses } = useQuery({
    queryKey: ['student-weaknesses-for-push', selectedClassId, user?.id],
    queryFn: async () => {
      // Get students in the class
      const { data: classStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, email')
        .eq('class_id', selectedClassId);

      if (studentsError) throw studentsError;
      if (!classStudents || classStudents.length === 0) return [];

      const studentIds = classStudents.map(s => s.id);

      // Get grade history for all students
      const { data: gradeHistory, error } = await supabase
        .from('grade_history')
        .select('student_id, topic_name, nys_standard, grade')
        .in('student_id', studentIds)
        .not('topic_name', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Analyze each student's performance
      const studentAnalysis: StudentWeakness[] = [];

      for (const student of classStudents) {
        const studentGrades = (gradeHistory || []).filter(g => g.student_id === student.id);
        
        // Group by topic and calculate averages
        const topicMap = new Map<string, { grades: number[]; standard: string | null }>();
        
        for (const entry of studentGrades) {
          let cleanTopic = (entry.topic_name || '').trim();
          cleanTopic = cleanTopic.replace(/^(Q\d+:|Question \d+:)\s*/i, '');
          if (cleanTopic.length > 60) cleanTopic = cleanTopic.substring(0, 60) + '...';
          if (!cleanTopic) continue;

          let cleanStandard: string | null = null;
          if (entry.nys_standard) {
            const match = entry.nys_standard.match(/^([A-Z0-9\.\-]+)/);
            if (match) cleanStandard = match[1];
          }

          const existing = topicMap.get(cleanTopic);
          if (existing) {
            existing.grades.push(entry.grade);
          } else {
            topicMap.set(cleanTopic, { grades: [entry.grade], standard: cleanStandard });
          }
        }

        // Find weak topics (below 70% average)
        const weakTopics: StudentWeakness['weakTopics'] = [];
        topicMap.forEach((data, topic) => {
          const avg = data.grades.reduce((a, b) => a + b, 0) / data.grades.length;
          if (avg < 70) {
            weakTopics.push({
              topic,
              standard: data.standard,
              avgGrade: Math.round(avg),
              attempts: data.grades.length,
            });
          }
        });

        // Sort by lowest grade first, take top 3
        weakTopics.sort((a, b) => a.avgGrade - b.avgGrade);
        
        if (weakTopics.length > 0) {
          studentAnalysis.push({
            studentId: student.id,
            firstName: student.first_name,
            lastName: student.last_name,
            email: student.email,
            weakTopics: weakTopics.slice(0, 3),
          });
        }
      }

      return studentAnalysis;
    },
    enabled: !!user && open && !!selectedClassId,
  });

  const handlePushPersonalizedAssignments = async () => {
    if (!selectedClassId) {
      toast.error('Please select a class');
      return;
    }

    if (!studentWeaknesses || studentWeaknesses.length === 0) {
      toast.error('No students need remediation based on their grades');
      return;
    }

    setIsPushing(true);
    setPushProgress({ current: 0, total: studentWeaknesses.length, studentName: '' });

    const selectedClass = classes?.find(c => c.id === selectedClassId);
    let successCount = 0;

    try {
      for (let i = 0; i < studentWeaknesses.length; i++) {
        const student = studentWeaknesses[i];
        const primaryWeakness = student.weakTopics[0];
        
        setPushProgress({
          current: i + 1,
          total: studentWeaknesses.length,
          studentName: `${student.firstName} ${student.lastName}`,
        });

        // Generate personalized questions for this student's weakest topic
        const { data: questionData, error: genError } = await supabase.functions.invoke('generate-worksheet-questions', {
          body: {
            topic: primaryWeakness.topic,
            standard: primaryWeakness.standard,
            count: questionCount,
            difficulty: primaryWeakness.avgGrade < 40 ? 'easy' : primaryWeakness.avgGrade < 60 ? 'medium' : 'mixed',
            includeHints: true,
            format: 'practice',
            context: `Targeted remediation for a student who scored ${primaryWeakness.avgGrade}% on ${primaryWeakness.topic}. Focus on building foundational understanding and correcting common misconceptions.`,
          },
        });

        if (genError) {
          console.error(`Failed to generate questions for ${student.firstName}:`, genError);
          continue;
        }

        const questions = questionData?.questions || [];
        if (questions.length === 0) continue;

        // Determine difficulty level based on performance
        const difficultyLevel = primaryWeakness.avgGrade < 40 ? 'A' : primaryWeakness.avgGrade < 60 ? 'B' : 'C';

        // Build remediation recommendations from all weak topics
        const remediationRecommendations = student.weakTopics.map(wt => 
          `${wt.topic} (${wt.avgGrade}% avg)`
        );

        const result = await pushToSisterApp({
          type: 'assignment_push',
          source: 'scan_genius',
          class_id: selectedClassId,
          class_name: selectedClass?.name,
          title: `Remediation: ${primaryWeakness.topic}`,
          description: `Personalized practice based on your ${primaryWeakness.avgGrade}% performance on ${primaryWeakness.topic}`,
          topic_name: primaryWeakness.topic,
          standard_code: primaryWeakness.standard || undefined,
          student_id: student.studentId,
          student_name: `${student.firstName} ${student.lastName}`,
          student_email: student.email || undefined,
          first_name: student.firstName,
          last_name: student.lastName,
          xp_reward: questions.length * 15, // Higher reward for remediation
          coin_reward: questions.length * 10,
          difficulty_level: difficultyLevel,
          remediation_recommendations: remediationRecommendations,
          questions: questions.map((q: any, idx: number) => ({
            number: idx + 1,
            text: q.text || q.question || q.prompt_text || q.title,
            difficulty: q.difficulty || difficultyLevel,
            hints: q.hints || [],
            answer: q.answer,
            explanation: q.explanation,
          })),
        });

        if (result.success) {
          successCount++;
        } else {
          console.error(`Failed to push to ${student.firstName}:`, result.error);
        }
      }

      if (successCount === studentWeaknesses.length) {
        toast.success(`Personalized assignments sent to all ${successCount} students!`);
      } else if (successCount > 0) {
        toast.warning(`Sent to ${successCount}/${studentWeaknesses.length} students`);
      } else {
        throw new Error('Failed to send to any students');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Push assignment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to push assignments');
    } finally {
      setIsPushing(false);
      setPushProgress({ current: 0, total: 0, studentName: '' });
    }
  };

  const selectedClass = classes?.find(c => c.id === selectedClassId);
  const studentsNeedingHelp = studentWeaknesses?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Push Personalized Remediation
          </DialogTitle>
          <DialogDescription>
            Each student receives unique practice questions based on their individual weaknesses from scanned work
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Class Selection */}
          <div className="space-y-2">
            <Label>Select Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Choose a class"} />
              </SelectTrigger>
              <SelectContent>
                {classes?.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    <div className="flex items-center gap-2">
                      <span>{cls.name}</span>
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {cls.studentCount}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student Weakness Analysis */}
          {selectedClassId && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Students Needing Remediation
              </Label>
              
              {loadingWeaknesses ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing student performance from graded work...
                </div>
              ) : studentWeaknesses && studentWeaknesses.length > 0 ? (
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    {studentWeaknesses.map(student => (
                      <div key={student.studentId} className="p-2 bg-muted/50 rounded-md">
                        <div className="font-medium text-sm">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {student.weakTopics.map((wt, idx) => (
                            <Badge 
                              key={idx} 
                              variant={wt.avgGrade < 50 ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {wt.topic.length > 25 ? wt.topic.substring(0, 25) + '...' : wt.topic}
                              <span className="ml-1 opacity-75">({wt.avgGrade}%)</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 border rounded-md px-3">
                  <AlertCircle className="h-4 w-4" />
                  No students need remediation (all above 70%) or no graded work found
                </div>
              )}
              
              {studentWeaknesses && studentWeaknesses.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {studentsNeedingHelp} student{studentsNeedingHelp !== 1 ? 's' : ''} will receive personalized questions targeting their weakest topics
                </p>
              )}
            </div>
          )}

          {/* Question Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Questions per Student</Label>
              <Badge variant="secondary">{questionCount}</Badge>
            </div>
            <Slider
              value={[questionCount]}
              onValueChange={([v]) => setQuestionCount(v)}
              min={3}
              max={10}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Difficulty is automatically adjusted based on each student's performance
            </p>
          </div>

          {/* Progress indicator during push */}
          {isPushing && pushProgress.total > 0 && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-md">
              <div className="flex items-center justify-between text-sm">
                <span>Generating for: {pushProgress.studentName}</span>
                <span>{pushProgress.current}/{pushProgress.total}</span>
              </div>
              <Progress value={(pushProgress.current / pushProgress.total) * 100} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPushing}>
            Cancel
          </Button>
          <Button
            onClick={handlePushPersonalizedAssignments}
            disabled={isPushing || !selectedClassId || studentsNeedingHelp === 0}
          >
            {isPushing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Push to {studentsNeedingHelp} Student{studentsNeedingHelp !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
