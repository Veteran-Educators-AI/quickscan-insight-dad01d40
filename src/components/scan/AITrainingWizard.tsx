import { useState, useEffect } from 'react';
import { Brain, BookOpen, GraduationCap, CheckCircle, ArrowRight, ArrowLeft, Sparkles, Target, FileText, Loader2, AlertCircle, Trophy, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  GEOMETRY_TOPICS, 
  ALGEBRA1_TOPICS, 
  ALGEBRA2_TOPICS,
  PRECALCULUS_TOPICS,
  ENGLISH_TOPICS,
  HISTORY_TOPICS,
  BIOLOGY_TOPICS,
  EARTH_SCIENCE_TOPICS,
  CHEMISTRY_TOPICS,
  PHYSICS_TOPICS,
  GOVERNMENT_TOPICS,
  ECONOMICS_TOPICS,
  FINANCIAL_MATH_TOPICS,
  TopicCategory,
  JMAPTopic
} from '@/data/nysTopics';

interface AITrainingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrainingComplete?: () => void;
}

type TrainingStep = 'intro' | 'content-area' | 'select-topics' | 'answer-questions' | 'review' | 'complete';

interface TrainingQuestion {
  id: string;
  topic: string;
  standard: string;
  question: string;
  answer: string;
  difficulty: string;
  bloomLevel: string;
}

interface TeacherAnswer {
  questionId: string;
  answer: string;
  notes?: string;
}

const CONTENT_AREAS = [
  { id: 'algebra1', name: 'Algebra 1', icon: '📐', topics: ALGEBRA1_TOPICS },
  { id: 'geometry', name: 'Geometry', icon: '📏', topics: GEOMETRY_TOPICS },
  { id: 'algebra2', name: 'Algebra 2', icon: '📊', topics: ALGEBRA2_TOPICS },
  { id: 'precalculus', name: 'Pre-Calculus', icon: '📈', topics: PRECALCULUS_TOPICS },
  { id: 'financialmath', name: 'Financial Math', icon: '💵', topics: FINANCIAL_MATH_TOPICS },
  { id: 'english', name: 'English', icon: '📚', topics: ENGLISH_TOPICS },
  { id: 'history', name: 'History', icon: '🏛️', topics: HISTORY_TOPICS },
  { id: 'government', name: 'Government', icon: '⚖️', topics: GOVERNMENT_TOPICS },
  { id: 'economics', name: 'Economics', icon: '💰', topics: ECONOMICS_TOPICS },
  { id: 'biology', name: 'Biology', icon: '🧬', topics: BIOLOGY_TOPICS },
  { id: 'earthscience', name: 'Earth Science', icon: '🌍', topics: EARTH_SCIENCE_TOPICS },
  { id: 'chemistry', name: 'Chemistry', icon: '⚗️', topics: CHEMISTRY_TOPICS },
  { id: 'physics', name: 'Physics', icon: '⚛️', topics: PHYSICS_TOPICS },
];

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'challenging'];
const MIN_TRAINING_SAMPLES = 10;

export function AITrainingWizard({ open, onOpenChange, onTrainingComplete }: AITrainingWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<TrainingStep>('intro');
  const [selectedContentArea, setSelectedContentArea] = useState<string | null>(null);
  const [availableTopics, setAvailableTopics] = useState<JMAPTopic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<JMAPTopic[]>([]);
  const [trainingQuestions, setTrainingQuestions] = useState<TrainingQuestion[]>([]);
  const [teacherAnswers, setTeacherAnswers] = useState<TeacherAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentNotes, setCurrentNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingTrainingSamples, setExistingTrainingSamples] = useState(0);

  // Fetch existing training samples count
  useEffect(() => {
    if (!user?.id || !open) return;
    
    const fetchExistingCount = async () => {
      const { count } = await supabase
        .from('grading_corrections')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id);
      
      setExistingTrainingSamples(count || 0);
    };
    
    fetchExistingCount();
  }, [user?.id, open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('intro');
      setSelectedContentArea(null);
      setSelectedTopics([]);
      setTrainingQuestions([]);
      setTeacherAnswers([]);
      setCurrentQuestionIndex(0);
      setCurrentAnswer('');
      setCurrentNotes('');
    }
  }, [open]);

  // Update available topics when content area changes
  useEffect(() => {
    if (selectedContentArea) {
      const contentArea = CONTENT_AREAS.find(c => c.id === selectedContentArea);
      if (contentArea?.topics) {
        const allTopics = contentArea.topics.flatMap((cat: TopicCategory) => cat.topics);
        setAvailableTopics(allTopics);
      }
    }
  }, [selectedContentArea]);

  const handleContentAreaSelect = (areaId: string) => {
    setSelectedContentArea(areaId);
    setSelectedTopics([]);
  };

  const handleTopicToggle = (topic: JMAPTopic) => {
    setSelectedTopics(prev => {
      const isSelected = prev.some(t => t.name === topic.name && t.standard === topic.standard);
      if (isSelected) {
        return prev.filter(t => !(t.name === topic.name && t.standard === topic.standard));
      } else if (prev.length < 10) {
        return [...prev, topic];
      }
      return prev;
    });
  };

  const generateTrainingQuestions = async () => {
    if (selectedTopics.length === 0) {
      toast.error('Please select at least one topic');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate 10 questions across selected topics with varying difficulties
      const questionsPerTopic = Math.ceil(MIN_TRAINING_SAMPLES / selectedTopics.length);
      
      const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: selectedTopics.map(t => ({
            topicName: t.name,
            standard: t.standard,
            subject: selectedContentArea,
            category: 'Training',
          })),
          questionCount: MIN_TRAINING_SAMPLES,
          difficultyLevels: DIFFICULTY_LEVELS,
          includeAnswerKey: true,
          includeHints: false,
        },
      });

      if (error) throw error;

      if (data?.questions && data.questions.length > 0) {
        const formattedQuestions: TrainingQuestion[] = data.questions.map((q: any, index: number) => ({
          id: `training-${Date.now()}-${index}`,
          topic: q.topic,
          standard: q.standard,
          question: q.question,
          answer: q.answer || 'Answer not provided',
          difficulty: q.difficulty,
          bloomLevel: q.bloomLevel,
        }));
        
        setTrainingQuestions(formattedQuestions);
        setStep('answer-questions');
        toast.success(`Generated ${formattedQuestions.length} training questions!`);
      } else {
        throw new Error('No questions generated');
      }
    } catch (error) {
      console.error('Error generating training questions:', error);
      toast.error('Failed to generate training questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim()) {
      toast.error('Please provide your answer');
      return;
    }

    const newAnswer: TeacherAnswer = {
      questionId: trainingQuestions[currentQuestionIndex].id,
      answer: currentAnswer.trim(),
      notes: currentNotes.trim() || undefined,
    };

    setTeacherAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === newAnswer.questionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });

    // Move to next question or review
    if (currentQuestionIndex < trainingQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
      setCurrentNotes('');
    } else {
      setStep('review');
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      // Save current answer before going back
      if (currentAnswer.trim()) {
        const newAnswer: TeacherAnswer = {
          questionId: trainingQuestions[currentQuestionIndex].id,
          answer: currentAnswer.trim(),
          notes: currentNotes.trim() || undefined,
        };
        setTeacherAnswers(prev => {
          const existing = prev.findIndex(a => a.questionId === newAnswer.questionId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newAnswer;
            return updated;
          }
          return [...prev, newAnswer];
        });
      }
      
      setCurrentQuestionIndex(prev => prev - 1);
      // Load previous answer
      const prevAnswer = teacherAnswers.find(a => a.questionId === trainingQuestions[currentQuestionIndex - 1].id);
      setCurrentAnswer(prevAnswer?.answer || '');
      setCurrentNotes(prevAnswer?.notes || '');
    }
  };

  const handleSaveTraining = async () => {
    if (teacherAnswers.length < MIN_TRAINING_SAMPLES) {
      toast.error(`Please answer all ${MIN_TRAINING_SAMPLES} questions`);
      return;
    }

    setIsSaving(true);
    try {
      // Save each answer as a grading correction for AI training
      const trainingRecords = teacherAnswers.map(answer => {
        const question = trainingQuestions.find(q => q.id === answer.questionId);
        return {
          teacher_id: user?.id,
          topic_name: question?.topic || 'Training',
          ai_grade: 100, // Teacher's answer is the "correct" baseline
          corrected_grade: 100,
          ai_justification: JSON.stringify({
            type: 'teacher_training_sample',
            question: question?.question,
            expectedAnswer: question?.answer,
            teacherAnswer: answer.answer,
            difficulty: question?.difficulty,
            bloomLevel: question?.bloomLevel,
            standard: question?.standard,
          }),
          correction_reason: answer.notes || 'Teacher training sample - model answer',
          strictness_indicator: 'as_expected',
          grading_focus: ['teacher_methodology', 'response_pattern'],
        };
      });

      const { error } = await supabase
        .from('grading_corrections')
        .insert(trainingRecords);

      if (error) throw error;

      toast.success('Training samples saved successfully!');
      setStep('complete');
      onTrainingComplete?.();
    } catch (error) {
      console.error('Error saving training samples:', error);
      toast.error('Failed to save training samples. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const trainingProgress = Math.min(100, ((existingTrainingSamples + teacherAnswers.length) / MIN_TRAINING_SAMPLES) * 100);
  const isFullyTrained = existingTrainingSamples >= MIN_TRAINING_SAMPLES;

  const downloadQuestionsToPDF = () => {
    if (trainingQuestions.length === 0) {
      toast.error('No questions to download');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 25.4; // 1 inch margin
    const marginRight = 25.4;
    const marginTop = 25.4;
    const marginBottom = 25.4;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPosition = marginTop;

    const contentArea = CONTENT_AREAS.find(c => c.id === selectedContentArea);
    const contentAreaName = contentArea?.name || 'Training';

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Training Questions', marginLeft, yPosition);
    yPosition += 8;

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Content Area: ${contentAreaName}`, marginLeft, yPosition);
    yPosition += 5;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, marginLeft, yPosition);
    yPosition += 5;
    doc.text(`Total Questions: ${trainingQuestions.length}`, marginLeft, yPosition);
    yPosition += 10;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
    yPosition += 10;

    // Questions
    trainingQuestions.forEach((question, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - marginBottom - 60) {
        doc.addPage();
        yPosition = marginTop;
      }

      // Question number and topic
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Question ${index + 1}`, marginLeft, yPosition);
      yPosition += 5;

      // Topic and standard
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Topic: ${question.topic}`, marginLeft, yPosition);
      yPosition += 4;
      doc.text(`Standard: ${question.standard} | Difficulty: ${question.difficulty}`, marginLeft, yPosition);
      yPosition += 6;

      // Question text
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const questionLines = doc.splitTextToSize(question.question, contentWidth);
      questionLines.forEach((line: string) => {
        if (yPosition > pageHeight - marginBottom - 20) {
          doc.addPage();
          yPosition = marginTop;
        }
        doc.text(line, marginLeft, yPosition);
        yPosition += 5;
      });

      // Answer space
      yPosition += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Your Answer:', marginLeft, yPosition);
      yPosition += 4;

      // Draw answer box
      const boxHeight = 35;
      if (yPosition + boxHeight > pageHeight - marginBottom) {
        doc.addPage();
        yPosition = marginTop;
      }
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.rect(marginLeft, yPosition, contentWidth, boxHeight);
      
      // Add lined paper effect inside box
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      for (let lineY = yPosition + 7; lineY < yPosition + boxHeight - 2; lineY += 7) {
        doc.line(marginLeft + 2, lineY, marginLeft + contentWidth - 2, lineY);
      }

      yPosition += boxHeight + 10;

      // Separator between questions
      if (index < trainingQuestions.length - 1) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(marginLeft, yPosition - 5, marginLeft + contentWidth / 3, yPosition - 5);
      }
    });

    // Footer on last page
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Generated by Scan Genius - AI Training Worksheet',
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );

    doc.save(`AI-Training-Questions-${contentAreaName.replace(/\s+/g, '-')}.pdf`);
    toast.success('Training questions downloaded as PDF');
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Train the AI to Grade Like You</h3>
                <p className="text-muted-foreground mt-1">
                  Answer {MIN_TRAINING_SAMPLES} questions the same way you expect your students to. 
                  This teaches the AI your grading methodology and response expectations.
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-500/10">
                      <Target className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Current Training Status</p>
                      <p className="text-sm text-muted-foreground">
                        {existingTrainingSamples} / {MIN_TRAINING_SAMPLES} samples collected
                      </p>
                    </div>
                  </div>
                  <Progress value={trainingProgress} className="h-2" />
                  {isFullyTrained ? (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-700 dark:text-green-400">
                        AI is trained! You can continue adding samples to improve accuracy.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {MIN_TRAINING_SAMPLES - existingTrainingSamples} more samples needed for confident grading
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h4 className="font-medium">How it works:</h4>
              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">1</Badge>
                  <p className="text-sm">Select your content area (Algebra, Geometry, etc.)</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">2</Badge>
                  <p className="text-sm">Choose 10 topics and standards you teach</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">3</Badge>
                  <p className="text-sm">Answer {MIN_TRAINING_SAMPLES} questions at varying difficulties</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">4</Badge>
                  <p className="text-sm">AI learns your response patterns and methodology</p>
                </div>
              </div>
            </div>

            <Button onClick={() => setStep('content-area')} className="w-full gap-2">
              Start Training
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        );

      case 'content-area':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Select Your Content Area</h3>
              <p className="text-muted-foreground">Choose the subject you want to train the AI for</p>
            </div>

            <RadioGroup
              value={selectedContentArea || ''}
              onValueChange={handleContentAreaSelect}
              className="grid grid-cols-2 gap-3"
            >
              {CONTENT_AREAS.map(area => (
                <div key={area.id}>
                  <RadioGroupItem
                    value={area.id}
                    id={area.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={area.id}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                  >
                    <span className="text-2xl mb-2">{area.icon}</span>
                    <span className="font-medium">{area.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {area.topics.reduce((sum: number, cat: TopicCategory) => sum + cat.topics.length, 0)} topics
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('intro')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={() => setStep('select-topics')} 
                disabled={!selectedContentArea}
                className="flex-1 gap-2"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'select-topics':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Select Topics & Standards</h3>
              <p className="text-muted-foreground">
                Choose up to 10 topics you want to train the AI on ({selectedTopics.length}/10 selected)
              </p>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-3">
              <div className="space-y-2">
                {availableTopics.map((topic, index) => {
                  const isSelected = selectedTopics.some(
                    t => t.name === topic.name && t.standard === topic.standard
                  );
                  return (
                    <div
                      key={`${topic.name}-${topic.standard}-${index}`}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                      }`}
                      onClick={() => handleTopicToggle(topic)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleTopicToggle(topic)}
                        disabled={!isSelected && selectedTopics.length >= 10}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{topic.name}</p>
                        <p className="text-xs text-muted-foreground">{topic.standard}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {selectedTopics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTopics.map((topic, index) => (
                  <Badge 
                    key={`selected-${topic.name}-${index}`} 
                    variant="secondary" 
                    className="text-xs cursor-pointer"
                    onClick={() => handleTopicToggle(topic)}
                  >
                    {topic.name} ×
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('content-area')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={generateTrainingQuestions} 
                disabled={selectedTopics.length === 0 || isGenerating}
                className="flex-1 gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    Generate Training Questions
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'answer-questions':
        const currentQuestion = trainingQuestions[currentQuestionIndex];
        const answeredCount = teacherAnswers.length;
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Answer the Question</h3>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {trainingQuestions.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQuestionsToPDF}
                  className="gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </Button>
                <Badge variant="outline">{currentQuestion?.difficulty}</Badge>
                <Badge variant="secondary">{currentQuestion?.standard}</Badge>
              </div>
            </div>

            <Progress 
              value={(currentQuestionIndex / trainingQuestions.length) * 100} 
              className="h-2" 
            />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {currentQuestion?.topic}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{currentQuestion?.question}</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Label htmlFor="teacher-answer">Your Answer (as you expect students to answer)</Label>
              <Textarea
                id="teacher-answer"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Write your complete answer here, showing all work and reasoning..."
                className="min-h-[150px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grading-notes">Grading Notes (optional)</Label>
              <Textarea
                id="grading-notes"
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                placeholder="What are the key elements you look for? What mistakes should the AI watch for?"
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button 
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim()}
                className="flex-1 gap-2"
              >
                {currentQuestionIndex < trainingQuestions.length - 1 ? (
                  <>
                    Next Question
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Review Answers
                    <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Review Your Training Answers</h3>
              <p className="text-muted-foreground">
                {teacherAnswers.length} answers ready to train the AI
              </p>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-3">
              <div className="space-y-3">
                {teacherAnswers.map((answer, index) => {
                  const question = trainingQuestions.find(q => q.id === answer.questionId);
                  return (
                    <Card key={answer.questionId} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                            <span className="text-xs text-muted-foreground">{question?.topic}</span>
                          </div>
                          <p className="text-sm font-medium line-clamp-2">{question?.question}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            Your answer: {answer.answer.substring(0, 100)}...
                          </p>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                After saving, the AI will analyze your response patterns and methodology 
                to grade student work according to your expectations.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCurrentQuestionIndex(trainingQuestions.length - 1);
                  setStep('answer-questions');
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Edit Answers
              </Button>
              <Button 
                onClick={handleSaveTraining}
                disabled={isSaving || teacherAnswers.length < MIN_TRAINING_SAMPLES}
                className="flex-1 gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Training Data...
                  </>
                ) : (
                  <>
                    Save & Train AI
                    <GraduationCap className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-green-500" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold">Training Complete!</h3>
              <p className="text-muted-foreground mt-2">
                The AI has learned from your {teacherAnswers.length} response samples.
                It will now grade student work according to your methodology.
              </p>
            </div>

            <Card className="text-left">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total training samples</span>
                    <span className="font-bold">{existingTrainingSamples + teacherAnswers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Training confidence</span>
                    <Badge variant="default" className="bg-green-500">High</Badge>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You can always override AI grading decisions. Each correction further improves accuracy.
              </p>
            </div>

            <Button onClick={() => onOpenChange(false)} className="w-full">
              Start Grading Student Work
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Grading Training
          </DialogTitle>
          <DialogDescription>
            Teach the AI to grade like you by providing model answers
          </DialogDescription>
        </DialogHeader>
        
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
