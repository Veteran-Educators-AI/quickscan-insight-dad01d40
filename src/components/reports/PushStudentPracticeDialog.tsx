import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2, Target, TrendingDown, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';
import { toast } from 'sonner';

interface PushStudentPracticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  classId?: string;
  /** Optional: pre-select this topic as the primary weakness */
  preselectedTopic?: string;
  preselectedStandard?: string;
}

interface WeakTopic {
  topic: string;
  standard: string | null;
  avgGrade: number;
  attempts: number;
}

export function PushStudentPracticeDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  classId,
  preselectedTopic,
  preselectedStandard,
}: PushStudentPracticeDialogProps) {
  const { user } = useAuth();
  const { pushToSisterApp } = usePushToSisterApp();

  const [questionCount, setQuestionCount] = useState(5);
  const [isPushing, setIsPushing] = useState(false);
  const [pushStep, setPushStep] = useState('');

  // Fetch this student's weak topics from grade_history
  const { data: weakTopics, isLoading: loadingWeaknesses } = useQuery({
    queryKey: ['student-weak-topics-push', studentId, user?.id],
    queryFn: async () => {
      const { data: gradeHistory, error } = await supabase
        .from('grade_history')
        .select('topic_name, nys_standard, grade')
        .eq('student_id', studentId)
        .eq('teacher_id', user!.id)
        .not('topic_name', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by topic and calculate averages
      const topicMap = new Map<string, { grades: number[]; standard: string | null }>();

      for (const entry of gradeHistory || []) {
        let cleanTopic = (entry.topic_name || '').trim();
        cleanTopic = cleanTopic.replace(/^(Q\d+:|Question \d+:)\s*/i, '');
        if (cleanTopic.length > 60) cleanTopic = cleanTopic.substring(0, 60) + '...';
        if (!cleanTopic) continue;

        let cleanStandard: string | null = null;
        if (entry.nys_standard) {
          const match = entry.nys_standard.match(/^([A-Z0-9.\-]+)/);
          if (match) cleanStandard = match[1];
        }

        const existing = topicMap.get(cleanTopic);
        if (existing) {
          existing.grades.push(entry.grade);
        } else {
          topicMap.set(cleanTopic, { grades: [entry.grade], standard: cleanStandard });
        }
      }

      // Find weak topics (below 70%)
      const weak: WeakTopic[] = [];
      topicMap.forEach((data, topic) => {
        const avg = data.grades.reduce((a, b) => a + b, 0) / data.grades.length;
        if (avg < 70) {
          weak.push({
            topic,
            standard: data.standard,
            avgGrade: Math.round(avg),
            attempts: data.grades.length,
          });
        }
      });

      // Sort: if there's a preselected topic, put it first; otherwise sort by lowest grade
      weak.sort((a, b) => {
        if (preselectedTopic) {
          if (a.topic === preselectedTopic) return -1;
          if (b.topic === preselectedTopic) return 1;
        }
        return a.avgGrade - b.avgGrade;
      });

      // If preselected topic isn't in weak topics, add it as a special entry
      if (preselectedTopic && !weak.find(w => w.topic === preselectedTopic)) {
        weak.unshift({
          topic: preselectedTopic,
          standard: preselectedStandard || null,
          avgGrade: 0, // Will be treated as needs practice
          attempts: 0,
        });
      }

      return weak.slice(0, 5);
    },
    enabled: !!user && open && !!studentId,
  });

  const handlePushPractice = async () => {
    if (!weakTopics || weakTopics.length === 0) {
      toast.error('No weak topics identified for this student');
      return;
    }

    setIsPushing(true);
    const primaryWeakness = weakTopics[0];

    try {
      // Step 1: Generate questions
      setPushStep('Generating personalized questions...');
      const { data: questionData, error: genError } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topic: primaryWeakness.topic,
          standard: primaryWeakness.standard,
          count: questionCount,
          difficulty: primaryWeakness.avgGrade < 40 ? 'easy' : primaryWeakness.avgGrade < 60 ? 'medium' : 'mixed',
          includeHints: true,
          format: 'practice',
          context: `Targeted remediation for ${studentName} who scored ${primaryWeakness.avgGrade}% on ${primaryWeakness.topic}. Focus on building foundational understanding and correcting common misconceptions.`,
        },
      });

      if (genError) throw genError;

      const questions = questionData?.questions || [];
      if (questions.length === 0) {
        throw new Error('Failed to generate practice questions. Please try again.');
      }

      // Step 2: Push to Scholar AI
      setPushStep('Sending to Scholar AI...');
      const difficultyLevel = primaryWeakness.avgGrade < 40 ? 'A' : primaryWeakness.avgGrade < 60 ? 'C' : 'E';

      const remediationRecommendations = weakTopics.map(wt =>
        `${wt.topic} (${wt.avgGrade}% avg)`
      );

      const result = await pushToSisterApp({
        type: 'assignment_push',
        source: 'scan_genius',
        class_id: classId,
        title: `Practice: ${primaryWeakness.topic}`,
        description: `Personalized practice based on your ${primaryWeakness.avgGrade}% performance on ${primaryWeakness.topic}`,
        topic_name: primaryWeakness.topic,
        standard_code: primaryWeakness.standard || undefined,
        student_id: studentId,
        student_name: studentName,
        xp_reward: questions.length * 15,
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
        toast.success(`Practice set sent to ${studentName}!`, {
          description: `${questions.length} questions on ${primaryWeakness.topic}`,
        });
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to push to Scholar AI');
      }
    } catch (error) {
      console.error('Push practice error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send practice set');
    } finally {
      setIsPushing(false);
      setPushStep('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Send Practice to {studentName}
          </DialogTitle>
          <DialogDescription>
            Generate and push personalized practice questions targeting this student's weakest topics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Student's Weak Topics */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Weak Topics
            </Label>

            {loadingWeaknesses ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing performance...
              </div>
            ) : weakTopics && weakTopics.length > 0 ? (
              <div className="space-y-1.5">
                {weakTopics.map((wt, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-md text-sm ${
                      idx === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium ${idx === 0 ? 'text-primary' : ''}`}>
                        {wt.topic.length > 35 ? wt.topic.substring(0, 35) + '...' : wt.topic}
                      </span>
                      {wt.standard && (
                        <Badge variant="outline" className="text-xs ml-2 font-mono">
                          {wt.standard}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant={wt.avgGrade < 50 ? 'destructive' : 'secondary'}
                      className="text-xs shrink-0 ml-2"
                    >
                      {wt.avgGrade}%
                    </Badge>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-1">
                  Questions will target the highlighted topic (lowest score)
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-3 border rounded-md px-3">
                No weak topics found — this student is performing above 70% on all topics
              </div>
            )}
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Questions</Label>
              <Badge variant="secondary">{questionCount}</Badge>
            </div>
            <Slider
              value={[questionCount]}
              onValueChange={([v]) => setQuestionCount(v)}
              min={3}
              max={10}
              step={1}
            />
          </div>

          {/* Rewards Preview */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground p-2 bg-muted/30 rounded-md">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-purple-500" />
              +{questionCount * 15} XP
            </span>
            <span className="flex items-center gap-1">
              🪙 +{questionCount * 10} coins
            </span>
            <span className="text-muted-foreground/70">
              Difficulty auto-adjusted
            </span>
          </div>

          {/* Progress */}
          {isPushing && pushStep && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {pushStep}
              </div>
              <Progress value={pushStep.includes('Sending') ? 80 : 40} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPushing}>
            Cancel
          </Button>
          <Button
            onClick={handlePushPractice}
            disabled={isPushing || !weakTopics || weakTopics.length === 0}
          >
            {isPushing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Practice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
