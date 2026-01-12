import { useState } from 'react';
import { Sparkles, FileText, Send, Loader2, BookOpen, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  onPushToStudentApp?: (questions: RemediationQuestion[]) => void;
  onGenerateWorksheet?: (questions: RemediationQuestion[]) => void;
}

export function RemediationActions({
  misconceptions,
  problemContext,
  studentName,
  studentId,
  onPushToStudentApp,
  onGenerateWorksheet,
}: RemediationActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<RemediationQuestion[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

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
        // Handle rate limit errors
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

  const handlePushToApp = () => {
    if (generatedQuestions) {
      onPushToStudentApp?.(generatedQuestions);
      toast.success('Questions sent to student app!');
      setShowPreview(false);
    }
  };

  const handlePrintWorksheet = () => {
    if (generatedQuestions) {
      onGenerateWorksheet?.(generatedQuestions);
      setShowPreview(false);
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
            {onPushToStudentApp && studentId && (
              <Button
                onClick={handlePushToApp}
                className="w-full sm:w-auto"
                variant="hero"
              >
                <Send className="h-4 w-4 mr-2" />
                Push to Student App
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
