import { useState } from 'react';
import { Sparkles, Send, Loader2, BookOpen, Printer, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<RemediationQuestion[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState<'student' | 'parent' | 'both'>('both');
  const [includeHintsInEmail, setIncludeHintsInEmail] = useState(true);
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
        hints: q.hint ? [q.hint] : [],
        targetMisconception: q.targetMisconception,
      }));

      // Build remediation recommendations from misconceptions
      const remediationRecommendations = misconceptions.map(m => `Address: ${m}`);
      if (topicName) {
        remediationRecommendations.push(`Practice ${topicName} concepts`);
      }

      const result = await pushToSisterApp({
        type: 'assignment_push',
        source: 'scan_genius',  // Proper source identifier
        class_id: classId,
        title: `Remediation Practice: ${topicName || 'Math Skills'}`,
        description: `Targeted practice for ${misconceptions.length} identified misconception${misconceptions.length > 1 ? 's' : ''}: ${misconceptions.slice(0, 2).join(', ')}${misconceptions.length > 2 ? '...' : ''}`,
        student_id: studentId,
        student_name: studentName,
        topic_name: topicName || 'Remediation Practice',
        xp_reward: generatedQuestions.length * 10, // 10 XP per question
        coin_reward: generatedQuestions.length * 5, // 5 coins per question
        questions: questionsFormatted,  // Include the actual questions
        remediation_recommendations: remediationRecommendations,
        difficulty_level: 'B', // Easier level for remediation
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

  const handleOpenEmailDialog = () => {
    setShowEmailDialog(true);
    setShowPreview(false);
  };

  const handleSendEmail = async () => {
    if (!generatedQuestions || generatedQuestions.length === 0) {
      toast.error('No questions to send');
      return;
    }

    if (!studentId) {
      toast.error('Student ID is required to send email');
      return;
    }

    setIsSendingEmail(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-remediation-email', {
        body: {
          studentId,
          questions: generatedQuestions,
          topicName: topicName || 'Remediation Practice',
          recipientType: emailRecipient,
          includeHints: includeHintsInEmail,
        },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.missingEmails) {
          toast.error(`Cannot send: ${data.error}`);
        } else {
          throw new Error(data.error);
        }
        return;
      }

      const emailCount = data.emailsSent?.length || 0;
      toast.success(`Remediation questions sent to ${emailCount} recipient${emailCount > 1 ? 's' : ''}!`);
      setShowEmailDialog(false);
    } catch (err) {
      console.error('Error sending email:', err);
      const message = err instanceof Error ? err.message : 'Failed to send email';
      toast.error(message);
    } finally {
      setIsSendingEmail(false);
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
              Print Worksheet
            </Button>
            {studentId && (
              <Button
                variant="outline"
                onClick={handleOpenEmailDialog}
                className="w-full sm:w-auto"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Questions
              </Button>
            )}
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
                    Push to App
                  </>
                )}
              </Button>
            )}
            {!studentId && (
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                Associate a student to enable email and app features
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

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Remediation Questions
            </DialogTitle>
            <DialogDescription>
              Send {generatedQuestions?.length || 0} questions to student or parent email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recipient Selection */}
            <div className="space-y-2">
              <Label>Send to</Label>
              <Select value={emailRecipient} onValueChange={(v) => setEmailRecipient(v as typeof emailRecipient)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student only</SelectItem>
                  <SelectItem value="parent">Parent only</SelectItem>
                  <SelectItem value="both">Both student and parent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Hints Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="email-hints-toggle" className="cursor-pointer">
                  Include Hints
                </Label>
                <p className="text-xs text-muted-foreground">
                  Add helpful hints to the email
                </p>
              </div>
              <Switch
                id="email-hints-toggle"
                checked={includeHintsInEmail}
                onCheckedChange={setIncludeHintsInEmail}
              />
            </div>

            {/* Info */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p>The email will include:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>{generatedQuestions?.length || 0} personalized questions</li>
                <li>Difficulty level badges</li>
                {includeHintsInEmail && <li>Helpful hints for each question</li>}
                <li>Instructions for the student</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
