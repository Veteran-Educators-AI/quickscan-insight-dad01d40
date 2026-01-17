import { useState, useRef, useEffect } from 'react';
import { FileText, Upload, Sparkles, Download, CheckCircle, Info, Loader2, PenLine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { resizeImage, blobToBase64 } from '@/lib/imageUtils';
import jsPDF from 'jspdf';

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
  teacherAnswer: string; // Teacher's own answer for comparison
  partialCreditGuidelines: string;
  commonMistakes: string[];
  points: number;
}

export function TeacherAnswerKeyDialog({ open, onOpenChange, classId, className }: TeacherAnswerKeyDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'answer' | 'review' | 'saved'>('upload');
  const [answerKeyImage, setAnswerKeyImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<AnswerKeyQuestion[]>([]);
  const [gradingNotes, setGradingNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [manualQuestions, setManualQuestions] = useState<AnswerKeyQuestion[]>([]);

  // Load teacher name from profile
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) {
            setTeacherName(data.full_name);
          }
        });
    }
  }, [user?.id]);

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
      const questionsToSave = step === 'review' ? extractedQuestions : manualQuestions;
      
      // Save the answer key as a training example with teacher answers
      const { error } = await supabase
        .from('grading_corrections')
        .insert({
          teacher_id: user.id,
          topic_name: className || 'Answer Key',
          ai_grade: 100,
          corrected_grade: 100,
          ai_justification: JSON.stringify({
            questions: questionsToSave,
            teacherName,
            teacherAnswers: questionsToSave.map(q => ({
              questionNumber: q.questionNumber,
              teacherAnswer: q.teacherAnswer,
              correctAnswer: q.correctAnswer,
            })),
          }),
          correction_reason: gradingNotes || 'Teacher answer key for training',
          grading_focus: questionsToSave.flatMap(q => q.commonMistakes),
          strictness_indicator: 'as_expected',
        });

      if (error) throw error;

      setStep('saved');
      toast.success('Answer key saved! AI will learn your grading style.');
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
    setManualQuestions([]);
    setGradingNotes('');
    onOpenChange(false);
  };

  const initializeManualQuestions = (count: number) => {
    const questions: AnswerKeyQuestion[] = [];
    for (let i = 1; i <= count; i++) {
      questions.push({
        questionNumber: i,
        questionText: '',
        correctAnswer: '',
        teacherAnswer: '',
        partialCreditGuidelines: '',
        commonMistakes: [],
        points: 4,
      });
    }
    setManualQuestions(questions);
  };

  const updateManualQuestion = (index: number, field: keyof AnswerKeyQuestion, value: any) => {
    setManualQuestions(prev => 
      prev.map((q, i) => i === index ? { ...q, [field]: value } : q)
    );
  };

  const downloadTemplate = () => {
    // Create a proper PDF template using jsPDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TEACHER ANSWER KEY WORKSHEET', pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Teacher info section
    doc.text(`Teacher Name: ${teacherName || '____________________'}`, margin, y);
    y += 8;
    doc.text(`Class: ${className || '____________________'}`, margin, y);
    y += 8;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
    
    y += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Instructions: Complete this worksheet with your ideal answers. The AI will learn', margin, y);
    y += 5;
    doc.text('your grading style from this document.', margin, y);
    
    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    // Generate questions
    for (let i = 1; i <= questionCount; i++) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`Question ${i}: `, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.line(margin + 25, y, pageWidth - margin, y);
      
      y += 10;
      doc.text('YOUR Answer (solve it yourself):', margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      
      y += 10;
      doc.text('Correct Answer Key:', margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.text('Partial Credit Guidelines:', margin, y);
      y += 6;
      doc.text('• Full credit (100%): _______________________________________', margin + 5, y);
      y += 5;
      doc.text('• Partial credit (50%): ______________________________________', margin + 5, y);
      y += 5;
      doc.text('• No credit (0%): __________________________________________', margin + 5, y);
      
      y += 8;
      doc.text('Common Mistakes to Watch For:', margin, y);
      y += 5;
      doc.text('1. ___________________________________________________', margin + 5, y);
      y += 5;
      doc.text('2. ___________________________________________________', margin + 5, y);
      
      y += 12;
      doc.setFontSize(11);
    }

    // Additional notes section
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Grading Notes:', margin, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
    for (let i = 0; i < 4; i++) {
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    }

    y += 10;
    doc.text(`Teacher Signature: _________________ Date: ${new Date().toLocaleDateString()}`, margin, y);

    // Save the PDF
    doc.save(`answer-key-template-${className || 'class'}-${teacherName?.replace(/\s+/g, '-') || 'teacher'}.pdf`);
    toast.success('PDF template downloaded!');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
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
            {/* Teacher name input */}
            <div className="space-y-2">
              <Label htmlFor="teacherName">Teacher Name</Label>
              <Input
                id="teacherName"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            {/* Question count for template */}
            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min={1}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">Upload Answer Key</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a photo of your completed worksheet
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={downloadTemplate}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <Download className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">Download PDF</h3>
                  <p className="text-sm text-muted-foreground">
                    Get a printable PDF template
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  initializeManualQuestions(questionCount);
                  setStep('answer');
                }}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <PenLine className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">Answer Digitally</h3>
                  <p className="text-sm text-muted-foreground">
                    Type your answers directly here
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
                    <li>Enter your name and set the number of questions</li>
                    <li>Either download the PDF template, upload an image, or answer digitally</li>
                    <li>Provide YOUR answers to the same questions students answer</li>
                    <li>AI will learn your grading style by comparing your answers to students'</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'answer' && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-primary" />
                  Answer Questions ({manualQuestions.length})
                </h3>
                <Badge variant="secondary">Teacher: {teacherName || 'Not set'}</Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                Answer these questions exactly as you would expect a perfect student response. 
                The AI will use your answers to calibrate grading.
              </p>

              {manualQuestions.map((question, index) => (
                <Card key={index}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="font-medium">Question {question.questionNumber}</Label>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Points:</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={question.points}
                          onChange={(e) => updateManualQuestion(index, 'points', parseInt(e.target.value) || 4)}
                          className="w-16 h-7 text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Question Text (optional)</Label>
                      <Textarea
                        value={question.questionText}
                        onChange={(e) => updateManualQuestion(index, 'questionText', e.target.value)}
                        placeholder="Enter the question text..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-primary font-medium">YOUR Answer (solve it yourself)</Label>
                      <Textarea
                        value={question.teacherAnswer}
                        onChange={(e) => updateManualQuestion(index, 'teacherAnswer', e.target.value)}
                        placeholder="Write your complete answer here as if you were the student..."
                        rows={3}
                        className="border-primary/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Correct Answer Key</Label>
                      <Textarea
                        value={question.correctAnswer}
                        onChange={(e) => updateManualQuestion(index, 'correctAnswer', e.target.value)}
                        placeholder="The expected correct answer..."
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Partial Credit Guidelines</Label>
                      <Textarea
                        value={question.partialCreditGuidelines}
                        onChange={(e) => updateManualQuestion(index, 'partialCreditGuidelines', e.target.value)}
                        placeholder="When to give partial credit..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

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

              <div className="flex items-center justify-between">
                <Badge variant="secondary">Teacher: {teacherName || 'Not set'}</Badge>
              </div>

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
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-primary font-medium">YOUR Answer (for AI calibration)</Label>
                        <Textarea
                          value={question.teacherAnswer || ''}
                          onChange={(e) => updateQuestion(index, 'teacherAnswer', e.target.value)}
                          placeholder="Write your complete answer here as if you were the student..."
                          rows={3}
                          className="border-primary/50"
                        />
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
