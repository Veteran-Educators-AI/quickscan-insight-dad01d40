import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2, Target, TrendingDown, TrendingUp, Zap, Sparkles, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

interface TopicEntry {
  topic: string;
  standard: string | null;
  avgGrade: number;
  attempts: number;
}

type PracticeMode = 'remediation' | 'enrichment';

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
  const [activeMode, setActiveMode] = useState<PracticeMode>('remediation');

  // Fetch student topics split into remediation & enrichment
  const { data: topicData, isLoading: loadingTopics } = useQuery({
    queryKey: ['student-topics-push', studentId, user?.id],
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

      const remediation: TopicEntry[] = [];
      const enrichment: TopicEntry[] = [];

      topicMap.forEach((data, topic) => {
        const avg = data.grades.reduce((a, b) => a + b, 0) / data.grades.length;
        const entry: TopicEntry = {
          topic,
          standard: data.standard,
          avgGrade: Math.round(avg),
          attempts: data.grades.length,
        };

        if (avg < 70) {
          remediation.push(entry);
        } else if (avg < 100) {
          enrichment.push(entry);
        }
        // Topics at 100% are excluded — student has mastered them
      });

      // Sort remediation by lowest grade, enrichment by lowest grade (most room to grow)
      remediation.sort((a, b) => {
        if (preselectedTopic) {
          if (a.topic === preselectedTopic) return -1;
          if (b.topic === preselectedTopic) return 1;
        }
        return a.avgGrade - b.avgGrade;
      });

      enrichment.sort((a, b) => a.avgGrade - b.avgGrade);

      // If preselected topic isn't found, add it
      if (preselectedTopic) {
        const inRemediation = remediation.find(w => w.topic === preselectedTopic);
        const inEnrichment = enrichment.find(w => w.topic === preselectedTopic);
        if (!inRemediation && !inEnrichment) {
          remediation.unshift({
            topic: preselectedTopic,
            standard: preselectedStandard || null,
            avgGrade: 0,
            attempts: 0,
          });
        }
      }

      return {
        remediation: remediation.slice(0, 5),
        enrichment: enrichment.slice(0, 5),
      };
    },
    enabled: !!user && open && !!studentId,
  });

  // Auto-select the best mode based on available data
  const effectiveMode = (() => {
    if (!topicData) return activeMode;
    if (activeMode === 'remediation' && topicData.remediation.length === 0 && topicData.enrichment.length > 0) {
      return 'enrichment';
    }
    if (activeMode === 'enrichment' && topicData.enrichment.length === 0 && topicData.remediation.length > 0) {
      return 'remediation';
    }
    return activeMode;
  })();

  const currentTopics = topicData?.[effectiveMode] || [];
  const primaryTopic = currentTopics[0];

  const handlePushPractice = async () => {
    if (!primaryTopic) {
      toast.error('No topics identified for this student');
      return;
    }

    setIsPushing(true);

    try {
      // Step 1: Generate questions
      setPushStep('Generating personalized questions...');

      const isEnrichment = effectiveMode === 'enrichment';

      const contextMsg = isEnrichment
        ? `Enrichment challenge for ${studentName} who scored ${primaryTopic.avgGrade}% on ${primaryTopic.topic}. Push beyond current understanding with higher-order thinking, multi-step problems, and real-world application. Do NOT re-teach basics — assume competence and challenge the student.`
        : `Targeted remediation for ${studentName} who scored ${primaryTopic.avgGrade}% on ${primaryTopic.topic}. Focus on building foundational understanding and correcting common misconceptions.`;

      const difficulty = isEnrichment
        ? (primaryTopic.avgGrade >= 90 ? 'hard' : 'medium')
        : (primaryTopic.avgGrade < 40 ? 'easy' : primaryTopic.avgGrade < 60 ? 'medium' : 'mixed');

      const { data: questionData, error: genError } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: [{
            topicName: primaryTopic.topic,
            standard: primaryTopic.standard || 'N/A',
            subject: 'Math',
            category: isEnrichment ? 'Enrichment' : 'Remediation',
          }],
          questionCount,
          difficultyLevels: [difficulty === 'easy' ? 'medium' : difficulty === 'hard' ? 'challenging' : 'hard'],
          includeHints: !isEnrichment,
        },
      });

      if (genError) throw genError;

      const questions = questionData?.questions || [];
      if (questions.length === 0) {
        throw new Error('Failed to generate practice questions. Please try again.');
      }

      // Step 2: Push to Scholar AI
      setPushStep('Sending to Scholar AI...');
      const difficultyLevel = isEnrichment
        ? (primaryTopic.avgGrade >= 90 ? 'A' : 'C')
        : (primaryTopic.avgGrade < 40 ? 'A' : primaryTopic.avgGrade < 60 ? 'C' : 'E');

      const xpMultiplier = isEnrichment ? 20 : 15;
      const coinMultiplier = isEnrichment ? 15 : 10;

      const recommendations = currentTopics.map(t =>
        `${t.topic} (${t.avgGrade}% avg)`
      );

      const titlePrefix = isEnrichment ? 'Challenge' : 'Practice';

      const result = await pushToSisterApp({
        type: 'assignment_push',
        source: 'scan_genius',
        class_id: classId,
        title: `${titlePrefix}: ${primaryTopic.topic}`,
        description: isEnrichment
          ? `Enrichment challenge to push beyond your ${primaryTopic.avgGrade}% on ${primaryTopic.topic}`
          : `Personalized practice based on your ${primaryTopic.avgGrade}% performance on ${primaryTopic.topic}`,
        topic_name: primaryTopic.topic,
        standard_code: primaryTopic.standard || undefined,
        student_id: studentId,
        student_name: studentName,
        xp_reward: questions.length * xpMultiplier,
        coin_reward: questions.length * coinMultiplier,
        difficulty_level: difficultyLevel,
        remediation_recommendations: recommendations,
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
        const label = isEnrichment ? 'Enrichment challenge' : 'Practice set';
        toast.success(`${label} sent to ${studentName}!`, {
          description: `${questions.length} questions on ${primaryTopic.topic}`,
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

  const remediationCount = topicData?.remediation.length || 0;
  const enrichmentCount = topicData?.enrichment.length || 0;
  const hasNoTopics = remediationCount === 0 && enrichmentCount === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Send Practice to {studentName}
          </DialogTitle>
          <DialogDescription>
            Push personalized practice targeting this student's specific needs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode Tabs */}
          <Tabs
            value={effectiveMode}
            onValueChange={(v) => setActiveMode(v as PracticeMode)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="remediation" className="flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" />
                Remediation
                {remediationCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 min-w-4">
                    {remediationCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="enrichment" className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Enrichment
                {enrichmentCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {enrichmentCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Remediation Tab */}
            <TabsContent value="remediation" className="mt-3 space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                Topics below 70% — foundational practice
              </Label>
              {loadingTopics ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing performance...
                </div>
              ) : remediationCount > 0 ? (
                <TopicList topics={topicData!.remediation} mode="remediation" />
              ) : (
                <div className="text-sm text-muted-foreground py-3 border rounded-md px-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    No weak topics — this student is above 70% on all topics!
                  </span>
                </div>
              )}
            </TabsContent>

            {/* Enrichment Tab */}
            <TabsContent value="enrichment" className="mt-3 space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Topics 70–99% — challenge to reach mastery
              </Label>
              {loadingTopics ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing performance...
                </div>
              ) : enrichmentCount > 0 ? (
                <TopicList topics={topicData!.enrichment} mode="enrichment" />
              ) : (
                <div className="text-sm text-muted-foreground py-3 border rounded-md px-3">
                  No enrichment topics — student either needs remediation or has 100% mastery on all topics
                </div>
              )}
            </TabsContent>
          </Tabs>

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
              +{questionCount * (effectiveMode === 'enrichment' ? 20 : 15)} XP
            </span>
            <span className="flex items-center gap-1">
              🪙 +{questionCount * (effectiveMode === 'enrichment' ? 15 : 10)} coins
            </span>
            <span className="text-muted-foreground/70">
              {effectiveMode === 'enrichment' ? 'Higher rewards for challenge' : 'Difficulty auto-adjusted'}
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
            disabled={isPushing || hasNoTopics || currentTopics.length === 0}
          >
            {isPushing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send {effectiveMode === 'enrichment' ? 'Challenge' : 'Practice'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Shared topic list component for both modes */
function TopicList({ topics, mode }: { topics: TopicEntry[]; mode: PracticeMode }) {
  return (
    <div className="space-y-1.5">
      {topics.map((t, idx) => (
        <div
          key={idx}
          className={`flex items-center justify-between p-2 rounded-md text-sm ${
            idx === 0
              ? mode === 'enrichment'
                ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                : 'bg-primary/10 border border-primary/20'
              : 'bg-muted/50'
          }`}
        >
          <div className="flex-1 min-w-0">
            <span className={`font-medium ${idx === 0 ? (mode === 'enrichment' ? 'text-amber-700 dark:text-amber-400' : 'text-primary') : ''}`}>
              {t.topic.length > 35 ? t.topic.substring(0, 35) + '...' : t.topic}
            </span>
            {t.standard && (
              <Badge variant="outline" className="text-xs ml-2 font-mono">
                {t.standard}
              </Badge>
            )}
          </div>
          <Badge
            variant="secondary"
            className={`text-xs shrink-0 ml-2 ${
              mode === 'remediation'
                ? t.avgGrade < 50 ? 'bg-destructive/10 text-destructive' : ''
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            {t.avgGrade}%
          </Badge>
        </div>
      ))}
      <p className="text-xs text-muted-foreground mt-1">
        {mode === 'enrichment'
          ? 'Questions will challenge the highlighted topic toward 100%'
          : 'Questions will target the highlighted topic (lowest score)'}
      </p>
    </div>
  );
}
