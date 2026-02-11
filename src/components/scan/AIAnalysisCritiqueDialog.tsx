import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { MessageSquarePlus, Brain, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface AIAnalysisCritiqueDialogProps {
  aiGrade?: number;
  aiJustification?: string;
  aiMisconceptions?: string[];
  aiFeedback?: string;
  topicName?: string;
  studentId?: string;
  attemptId?: string;
  gradeHistoryId?: string;
  trigger?: React.ReactNode;
}

type CritiqueType = 'grade_too_high' | 'grade_too_low' | 'missed_work' | 'wrong_misconception' | 'good_analysis' | 'other';

export function AIAnalysisCritiqueDialog({
  aiGrade,
  aiJustification,
  aiMisconceptions,
  aiFeedback,
  topicName = 'Unknown Topic',
  studentId,
  attemptId,
  gradeHistoryId,
  trigger,
}: AIAnalysisCritiqueDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [critiqueType, setCritiqueType] = useState<CritiqueType>('other');
  const [critiqueText, setCritiqueText] = useState('');
  const [whatAIMissed, setWhatAIMissed] = useState('');
  const [whatAIGotWrong, setWhatAIGotWrong] = useState('');
  const [preferredApproach, setPreferredApproach] = useState('');
  const [correctedGrade, setCorrectedGrade] = useState<string>('');

  const handleSubmit = async () => {
    if (!user || !critiqueText.trim()) {
      toast.error('Please provide feedback about the AI analysis');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('ai_analysis_feedback').insert({
        teacher_id: user.id,
        student_id: studentId || null,
        attempt_id: attemptId || null,
        grade_history_id: gradeHistoryId || null,
        topic_name: topicName,
        ai_grade: aiGrade,
        ai_justification: aiJustification,
        ai_misconceptions: aiMisconceptions,
        ai_feedback: aiFeedback,
        critique_type: critiqueType,
        critique_text: critiqueText,
        what_ai_missed: whatAIMissed || null,
        what_ai_got_wrong: whatAIGotWrong || null,
        preferred_approach: preferredApproach || null,
        corrected_grade: correctedGrade ? parseInt(correctedGrade) : null,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Thank you! Your feedback helps improve AI grading accuracy.');
      
      // Reset and close after a moment
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setCritiqueType('other');
        setCritiqueText('');
        setWhatAIMissed('');
        setWhatAIGotWrong('');
        setPreferredApproach('');
        setCorrectedGrade('');
      }, 1500);
    } catch (error) {
      console.error('Failed to submit critique:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const critiqueOptions: { value: CritiqueType; label: string; description: string }[] = [
    { value: 'grade_too_high', label: 'Grade Too High', description: 'AI was too lenient' },
    { value: 'grade_too_low', label: 'Grade Too Low', description: 'AI was too strict' },
    { value: 'missed_work', label: 'Missed Work', description: 'AI didn\'t see valid work' },
    { value: 'wrong_misconception', label: 'Wrong Misconception', description: 'Identified incorrect errors' },
    { value: 'good_analysis', label: 'Good Analysis', description: 'AI did well (positive feedback)' },
    { value: 'other', label: 'Other', description: 'General feedback' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Train AI</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Help Train the AI
          </DialogTitle>
          <DialogDescription>
            Your feedback improves grading accuracy for future scans
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-center font-medium">Feedback Submitted!</p>
            <p className="text-center text-sm text-muted-foreground">
              The AI will learn from your input.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current AI Analysis Summary */}
            {aiGrade !== undefined && (
              <div className="bg-muted/50 rounded-md p-3 text-sm">
                <p className="font-medium mb-1">Current AI Analysis:</p>
                <p>Grade: <span className="font-bold">{aiGrade}%</span></p>
                {aiMisconceptions && aiMisconceptions.length > 0 && (
                  <p className="text-muted-foreground text-xs mt-1">
                    {aiMisconceptions.length} misconception(s) identified
                  </p>
                )}
              </div>
            )}

            {/* Critique Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">What's the issue?</Label>
              <RadioGroup
                value={critiqueType}
                onValueChange={(val) => setCritiqueType(val as CritiqueType)}
                className="grid grid-cols-2 gap-2"
              >
                {critiqueOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="text-sm cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Main Critique */}
            <div className="space-y-2">
              <Label htmlFor="critique" className="text-sm font-medium">
                Your Feedback <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="critique"
                placeholder="Describe what the AI should have done differently..."
                value={critiqueText}
                onChange={(e) => setCritiqueText(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* What AI Missed */}
            {(critiqueType === 'missed_work' || critiqueType === 'grade_too_low') && (
              <div className="space-y-2">
                <Label htmlFor="missed" className="text-sm font-medium">
                  What did the AI miss?
                </Label>
                <Textarea
                  id="missed"
                  placeholder="Describe the work or understanding the AI failed to recognize..."
                  value={whatAIMissed}
                  onChange={(e) => setWhatAIMissed(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            )}

            {/* What AI Got Wrong */}
            {(critiqueType === 'wrong_misconception' || critiqueType === 'grade_too_high') && (
              <div className="space-y-2">
                <Label htmlFor="wrong" className="text-sm font-medium">
                  What did the AI get wrong?
                </Label>
                <Textarea
                  id="wrong"
                  placeholder="Describe the errors in the AI's analysis..."
                  value={whatAIGotWrong}
                  onChange={(e) => setWhatAIGotWrong(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            )}

            {/* Preferred Approach */}
            <div className="space-y-2">
              <Label htmlFor="approach" className="text-sm font-medium">
                How should the AI grade this in the future?
              </Label>
              <Textarea
                id="approach"
                placeholder="Explain your preferred grading approach for similar work..."
                value={preferredApproach}
                onChange={(e) => setPreferredApproach(e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            {/* Corrected Grade */}
            {critiqueType !== 'good_analysis' && (
              <div className="space-y-2">
                <Label htmlFor="correctedGrade" className="text-sm font-medium">
                  What grade should this be? (optional)
                </Label>
                <Input
                  id="correctedGrade"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0-100"
                  value={correctedGrade}
                  onChange={(e) => setCorrectedGrade(e.target.value)}
                  className="w-24"
                />
              </div>
            )}
          </div>
        )}

        {!submitted && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !critiqueText.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AIAnalysisCritiqueDialog;
