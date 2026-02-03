import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2, Sparkles, FileText, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';
import { toast } from 'sonner';

interface PushAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClassId?: string;
  defaultTopic?: string;
  defaultStandard?: string;
}

interface ClassOption {
  id: string;
  name: string;
  studentCount: number;
}

interface ExistingQuestion {
  id: string;
  prompt_text: string | null;
  difficulty: number | null;
}

export function PushAssignmentDialog({
  open,
  onOpenChange,
  defaultClassId,
  defaultTopic,
  defaultStandard,
}: PushAssignmentDialogProps) {
  const { user } = useAuth();
  const { pushToSisterApp } = usePushToSisterApp();
  
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId || '');
  const [topic, setTopic] = useState(defaultTopic || '');
  const [standard, setStandard] = useState(defaultStandard || '');
  const [questionSource, setQuestionSource] = useState<'ai' | 'existing'>('ai');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'mixed' | 'easy' | 'medium' | 'hard'>('mixed');
  const [isPushing, setIsPushing] = useState(false);
  const [selectedExistingQuestions, setSelectedExistingQuestions] = useState<string[]>([]);

  // Update state when defaults change
  useEffect(() => {
    if (defaultClassId) setSelectedClassId(defaultClassId);
    if (defaultTopic) setTopic(defaultTopic);
    if (defaultStandard) setStandard(defaultStandard);
  }, [defaultClassId, defaultTopic, defaultStandard]);

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

  // Fetch existing questions (search by prompt_text since questions table doesn't have topic)
  const { data: existingQuestions, isLoading: loadingQuestions } = useQuery({
    queryKey: ['existing-questions-for-push', user?.id, topic],
    queryFn: async () => {
      if (!topic) return [];
      
      const { data, error } = await supabase
        .from('questions')
        .select('id, prompt_text, difficulty')
        .eq('teacher_id', user!.id)
        .ilike('prompt_text', `%${topic}%`)
        .limit(20);

      if (error) throw error;
      return (data || []) as ExistingQuestion[];
    },
    enabled: !!user && open && questionSource === 'existing' && !!topic,
  });

  // Fetch students for the selected class
  const { data: students } = useQuery({
    queryKey: ['class-students-for-push', selectedClassId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, email')
        .eq('class_id', selectedClassId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClassId && open,
  });

  const handlePushAssignment = async () => {
    if (!selectedClassId || !topic) {
      toast.error('Please select a class and enter a topic');
      return;
    }

    if (!students || students.length === 0) {
      toast.error('No students found in this class');
      return;
    }

    setIsPushing(true);
    try {
      // Generate fresh questions using AI
      let questions: any[] = [];
      
      if (questionSource === 'ai') {
        toast.info('Generating fresh questions...', { duration: 2000 });
        
        const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
          body: {
            topic,
            standard,
            count: questionCount,
            difficulty: difficulty === 'mixed' ? undefined : difficulty,
            includeHints: true,
            format: 'practice',
          },
        });

        if (error) throw error;
        questions = data?.questions || [];
        
        if (questions.length === 0) {
          throw new Error('No questions generated');
        }
      } else {
        // Use selected existing questions
        if (selectedExistingQuestions.length === 0) {
          toast.error('Please select at least one question');
          setIsPushing(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .in('id', selectedExistingQuestions);

        if (error) throw error;
        questions = data || [];
      }

      // Get class info
      const selectedClass = classes?.find(c => c.id === selectedClassId);
      
      // Map difficulty to level (A-E)
      const difficultyToLevel: Record<string, string> = {
        'easy': 'A',
        'medium': 'C',
        'hard': 'E',
        'mixed': 'C',
      };

      // Generate remediation recommendations based on topic
      const remediationRecommendations = [
        topic,
        ...(standard ? [`Review ${standard} concepts`] : []),
        `Practice ${topic} fundamentals`,
      ];

      // Push to each student in the class
      let successCount = 0;
      for (const student of students) {
        const result = await pushToSisterApp({
          type: 'assignment_push',  // Use dedicated type for pushed assignments
          source: 'scan_genius',     // Source identifier for sister app
          class_id: selectedClassId,
          class_name: selectedClass?.name,
          title: `Practice: ${topic}`,
          description: `${questions.length} practice questions on ${topic}`,
          topic_name: topic,
          standard_code: standard || undefined,
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          student_email: student.email || undefined,
          first_name: student.first_name,
          last_name: student.last_name,
          xp_reward: questions.length * 10, // 10 XP per question as reward
          coin_reward: questions.length * 5, // 5 coins per question
          difficulty_level: difficultyToLevel[difficulty] || 'C',
          remediation_recommendations: remediationRecommendations,
          questions: questions.map((q, i) => ({
            number: i + 1,
            text: q.text || q.question || q.prompt_text || q.title,
            difficulty: q.difficulty || difficulty,
            hints: q.hints || [],
            answer: q.answer,
            explanation: q.explanation,
          })),
        });

        if (result.success) {
          successCount++;
        } else {
          console.error(`Failed to push to student ${student.id}:`, result.error);
        }
      }

      if (successCount === students.length) {
        toast.success(`Assignment pushed to all ${students.length} students!`);
      } else if (successCount > 0) {
        toast.warning(`Pushed to ${successCount}/${students.length} students`);
      } else {
        throw new Error('Failed to push to any students');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Push assignment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to push assignment');
    } finally {
      setIsPushing(false);
    }
  };

  const selectedClass = classes?.find(c => c.id === selectedClassId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Push Practice Assignment
          </DialogTitle>
          <DialogDescription>
            Send fresh practice questions to students on NYCLogic Scholar AI
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
            {selectedClass && (
              <p className="text-xs text-muted-foreground">
                Will push to {selectedClass.studentCount} student{selectedClass.studentCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label>Topic</Label>
            <Input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g., Triangle Congruence, Quadratic Equations"
            />
          </div>

          {/* Standard (optional) */}
          <div className="space-y-2">
            <Label>NYS Standard (optional)</Label>
            <Input
              value={standard}
              onChange={e => setStandard(e.target.value)}
              placeholder="e.g., G.SRT.B.5"
            />
          </div>

          {/* Question Source */}
          <div className="space-y-2">
            <Label>Question Source</Label>
            <RadioGroup
              value={questionSource}
              onValueChange={v => setQuestionSource(v as 'ai' | 'existing')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ai" id="source-ai" />
                <Label htmlFor="source-ai" className="flex items-center gap-1 cursor-pointer">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  AI-Generated (Fresh)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="source-existing" />
                <Label htmlFor="source-existing" className="flex items-center gap-1 cursor-pointer">
                  <FileText className="h-4 w-4 text-blue-500" />
                  From Library
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* AI Options */}
          {questionSource === 'ai' && (
            <>
              {/* Question Count */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Number of Questions</Label>
                  <Badge variant="secondary">{questionCount}</Badge>
                </div>
                <Slider
                  value={[questionCount]}
                  onValueChange={([v]) => setQuestionCount(v)}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={v => setDifficulty(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Existing Questions Selector */}
          {questionSource === 'existing' && (
            <div className="space-y-2">
              <Label>Select Questions</Label>
              {loadingQuestions ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading questions...
                </div>
              ) : existingQuestions && existingQuestions.length > 0 ? (
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {existingQuestions.map(q => (
                    <label
                      key={q.id}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedExistingQuestions.includes(q.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedExistingQuestions(prev => [...prev, q.id]);
                          } else {
                            setSelectedExistingQuestions(prev => prev.filter(id => id !== q.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm flex-1 truncate">{q.prompt_text || 'Question'}</span>
                      <Badge variant="outline" className="text-xs">{q.difficulty ?? 'N/A'}</Badge>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {topic ? 'No matching questions found. Try AI-generated instead.' : 'Enter a topic to see matching questions.'}
                </p>
              )}
              {selectedExistingQuestions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedExistingQuestions.length} question{selectedExistingQuestions.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePushAssignment}
            disabled={isPushing || !selectedClassId || !topic}
          >
            {isPushing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Pushing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Push to {selectedClass?.studentCount || 0} Students
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
