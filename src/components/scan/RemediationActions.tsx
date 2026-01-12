import { useState } from 'react';
import { Sparkles, FileText, Send, Loader2, BookOpen, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';
import { PrintRemediationQuestionsDialog } from '@/components/print/PrintRemediationQuestionsDialog';
interface RemediationQuestion {
  questionNumber: number;
  question: string;
  targetMisconception: string;
  difficulty: 'scaffolded' | 'practice' | 'challenge';
  hint: string;
}

interface RemediationActionsProps {
  misconceptions: string[];
  problemContext?: string;
  studentName?: string;
  studentId?: string;
  classId?: string;
  topicName?: string;
  onPushToStudentApp?: (questions: RemediationQuestion[]) => void;
  onGenerateWorksheet?: (questions: RemediationQuestion[]) => void;
}

export function RemediationActions({
  misconceptions,
  problemContext,
  studentName,
  studentId,
  classId,
  topicName,
  onPushToStudentApp,
  onGenerateWorksheet,
}: RemediationActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<RemediationQuestion[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  
  const { pushToSisterApp } = usePushToSisterApp();

  const handleGenerateQuestions = async () => {
    if (misconceptions.length === 0) {
      toast.error('No misconceptions to address');
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-remediation-questions', {
        body: {
          misconceptions,
          problemContext,
          studentName,
          questionsPerMisconception: 3,
        },
      });

      if (error) {
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
          return;
        }
        if (error.message?.includes('402') || error.message?.includes('Payment')) {
          toast.error('AI credits exhausted. Please add funds to continue.');
          return;
        }
        throw error;
      }

      if (data?.questions) {
        setGeneratedQuestions(data.questions);
        setShowPreview(true);
        toast.success(`Generated ${data.questions.length} remediation questions!`);
      } else {
        throw new Error('No questions generated');
      }
    } catch (err) {
      console.error('Error generating remediation questions:', err);
      toast.error('Failed to generate remediation questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePushToApp = async () => {
    if (!generatedQuestions || generatedQuestions.length === 0) {
      toast.error('No questions to push');
      return;
    }

    if (!classId) {
      toast.error('Class ID is required to push to student app');
      return;
    }

    setIsPushing(true);

    try {
      // Format questions for the sister app
      const questionsFormatted = generatedQuestions.map(q => ({
        number: q.questionNumber,
        text: q.question,
        difficulty: q.difficulty,
        hint: q.hint,
        targetMisconception: q.targetMisconception,
      }));

      const result = await pushToSisterApp({
        class_id: classId,
        title: `Remediation Practice: ${topicName || 'Math Skills'}`,
        description: `Targeted practice for ${misconceptions.length} identified misconception${misconceptions.length > 1 ? 's' : ''}: ${misconceptions.slice(0, 2).join(', ')}${misconceptions.length > 2 ? '...' : ''}`,
        student_id: studentId,
        student_name: studentName,
        topic_name: topicName || 'Remediation Practice',
        // Include questions as JSON in a custom field
        xp_reward: generatedQuestions.length * 10, // 10 XP per question
        coin_reward: generatedQuestions.length * 5, // 5 coins per question
      });

      if (result.success) {
        toast.success('Remediation questions sent to student app!');
        onPushToStudentApp?.(generatedQuestions);
        setShowPreview(false);
      } else {
        throw new Error(result.error || 'Failed to push to student app');
      }
    } catch (err) {
      console.error('Error pushing to student app:', err);
      const message = err instanceof Error ? err.message : 'Failed to push to student app';
      
      // Provide more helpful error messages
      if (message.includes('API key not configured') || message.includes('endpoint URL not configured')) {
        toast.error('Sister app integration not configured. Please set up the SISTER_APP_API_KEY and NYCOLOGIC_API_URL secrets.');
      } else {
        toast.error(message);
      }
    } finally {
      setIsPushing(false);
    }
  };

  const handlePrintWorksheet = () => {
    if (generatedQuestions) {
      setShowPrintDialog(true);
      setShowPreview(false);
      onGenerateWorksheet?.(generatedQuestions);
    }
  };

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'scaffolded': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'practice': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'challenge': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (misconceptions.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-600" />
            Generate Remediation Practice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Based on {misconceptions.length} identified misconception{misconceptions.length > 1 ? 's' : ''}, 
            generate targeted practice questions to help the student improve.
          </p>
          
          <Button
            onClick={handleGenerateQuestions}
            disabled={isGenerating}
            className="w-full"
            variant="hero"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Questions...
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                Generate Remediation Questions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Remediation Questions Generated
            </DialogTitle>
            <DialogDescription>
              {generatedQuestions?.length || 0} questions targeting {misconceptions.length} misconception{misconceptions.length > 1 ? 's' : ''}
              {studentName && ` for ${studentName}`}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-3">
              {generatedQuestions?.map((q, index) => (
                <Card key={index} className="overflow-hidden">
                  <div 
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleQuestion(index)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">Q{q.questionNumber}</span>
                          <Badge variant="secondary" className={getDifficultyColor(q.difficulty)}>
                            {q.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm line-clamp-2">{q.question}</p>
                      </div>
                      {expandedQuestions.has(index) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </div>
                  
                  {expandedQuestions.has(index) && (
                    <div className="px-3 pb-3 pt-0 border-t bg-muted/30 space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Target Misconception:</p>
                        <p className="text-xs">{q.targetMisconception}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Hint:</p>
                        <p className="text-xs italic text-blue-600 dark:text-blue-400">{q.hint}</p>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handlePrintWorksheet}
              className="w-full sm:w-auto"
            >
              <Printer className="h-4 w-4 mr-2" />
              Generate Worksheet
            </Button>
            {studentId && classId && (
              <Button
                onClick={handlePushToApp}
                className="w-full sm:w-auto"
                variant="hero"
                disabled={isPushing}
              >
                {isPushing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Push to Student App
                  </>
                )}
              </Button>
            )}
            {(!studentId || !classId) && (
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                {!studentId ? 'Associate a student to push to app' : 'Class ID required to push to app'}
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Remediation Dialog */}
      {generatedQuestions && (
        <PrintRemediationQuestionsDialog
          open={showPrintDialog}
          onOpenChange={setShowPrintDialog}
          questions={generatedQuestions}
          studentName={studentName}
          topicName={topicName}
        />
      )}
    </>
  );
}
