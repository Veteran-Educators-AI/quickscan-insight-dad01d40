import { useState, useRef } from 'react';
import { FileText, Upload, Camera, Sparkles, Download, CheckCircle, Info, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { resizeImage, blobToBase64 } from '@/lib/imageUtils';

interface TeacherAnswerKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId?: string;
  className?: string;
}

interface AnswerKeyQuestion {
  questionNumber: number;
  questionText: string;
  correctAnswer: string;
  partialCreditGuidelines: string;
  commonMistakes: string[];
  points: number;
}

export function TeacherAnswerKeyDialog({ open, onOpenChange, classId, className }: TeacherAnswerKeyDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'review' | 'saved'>('upload');
  const [answerKeyImage, setAnswerKeyImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<AnswerKeyQuestion[]>([]);
  const [gradingNotes, setGradingNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resizedBlob = await resizeImage(file);
      const dataUrl = await blobToBase64(resizedBlob);
      setAnswerKeyImage(dataUrl);
      await processAnswerKey(dataUrl);
    } catch (err) {
      console.error('Error processing image:', err);
      toast.error('Failed to process image');
    }
    e.target.value = '';
  };

  const processAnswerKey = async (imageUrl: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-answer-key', {
        body: { imageUrl },
      });

      if (error) throw error;

      if (data?.questions) {
        setExtractedQuestions(data.questions);
        setStep('review');
        toast.success(`Extracted ${data.questions.length} questions from answer key`);
      } else {
        toast.error('Could not extract questions from the image');
      }
    } catch (err) {
      console.error('Error extracting answer key:', err);
      toast.error('Failed to process answer key');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAnswerKey = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Save the answer key as a training example
      const { error } = await supabase
        .from('grading_corrections')
        .insert({
          teacher_id: user.id,
          topic_name: className || 'Answer Key',
          ai_grade: 100,
          corrected_grade: 100,
          ai_justification: JSON.stringify(extractedQuestions),
          correction_reason: gradingNotes || 'Teacher answer key for training',
          grading_focus: extractedQuestions.flatMap(q => q.commonMistakes),
          strictness_indicator: 'as_expected',
        });

      if (error) throw error;

      setStep('saved');
      toast.success('Answer key saved! AI will use this to grade student work.');
    } catch (err) {
      console.error('Error saving answer key:', err);
      toast.error('Failed to save answer key');
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuestion = (index: number, field: keyof AnswerKeyQuestion, value: any) => {
    setExtractedQuestions(prev => 
      prev.map((q, i) => i === index ? { ...q, [field]: value } : q)
    );
  };

  const handleClose = () => {
    setStep('upload');
    setAnswerKeyImage(null);
    setExtractedQuestions([]);
    setGradingNotes('');
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    // Create a printable PDF template
    const templateContent = `
TEACHER ANSWER KEY WORKSHEET
Class: ${className || '_________________'}
Date: ${new Date().toLocaleDateString()}

Instructions: Complete this worksheet with your ideal answers.
The AI will learn your grading style from this document.

Question 1: ________________________________________
__________________________________________________

Correct Answer:
__________________________________________________
__________________________________________________

Partial Credit Guidelines:
- Full credit (100%): ____________________________
- Partial credit (50%): __________________________
- No credit (0%): ________________________________

Common Mistakes to Watch For:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

Question 2: ________________________________________
__________________________________________________

Correct Answer:
__________________________________________________
__________________________________________________

Partial Credit Guidelines:
- Full credit (100%): ____________________________
- Partial credit (50%): __________________________
- No credit (0%): ________________________________

Common Mistakes to Watch For:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

Additional Grading Notes:
__________________________________________________
__________________________________________________
__________________________________________________

Teacher Signature: _________________ Date: ________
    `.trim();

    const blob = new Blob([templateContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `answer-key-template-${className || 'class'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Teacher Answer Key
          </DialogTitle>
          <DialogDescription>
            Create an answer key to train AI on your grading style
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">Upload Answer Key</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a photo of your completed answer key worksheet
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={downloadTemplate}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <Download className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">Download Template</h3>
                  <p className="text-sm text-muted-foreground">
                    Get a printable template to fill out by hand
                  </p>
                </CardContent>
              </Card>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Processing answer key...</span>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">How it works:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Download and print the answer key template</li>
                    <li>Fill in the correct answers and grading guidelines</li>
                    <li>Take a photo and upload it here</li>
                    <li>AI will learn your grading style and apply it to student work</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4">
              {/* Preview image */}
              {answerKeyImage && (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={answerKeyImage} 
                    alt="Answer key" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Extracted questions */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Extracted Questions
                  <Badge variant="secondary">{extractedQuestions.length}</Badge>
                </h3>

                {extractedQuestions.map((question, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Label className="font-medium">Question {question.questionNumber}</Label>
                        <Badge variant="outline">{question.points} pts</Badge>
                      </div>
                      
                      <Textarea
                        value={question.correctAnswer}
                        onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                        placeholder="Correct answer..."
                        rows={2}
                      />
                      
                      <Textarea
                        value={question.partialCreditGuidelines}
                        onChange={(e) => updateQuestion(index, 'partialCreditGuidelines', e.target.value)}
                        placeholder="Partial credit guidelines..."
                        rows={2}
                        className="text-sm"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Additional notes */}
              <div className="space-y-2">
                <Label>Additional Grading Notes</Label>
                <Textarea
                  value={gradingNotes}
                  onChange={(e) => setGradingNotes(e.target.value)}
                  placeholder="Any specific grading preferences, common mistakes to watch for, etc..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSaveAnswerKey} disabled={isSaving} className="flex-1">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Answer Key
                    </>
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}

        {step === 'saved' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-green-500/10 p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Answer Key Saved!</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              AI will now use this answer key to grade student work for this class with your preferred style.
            </p>
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
