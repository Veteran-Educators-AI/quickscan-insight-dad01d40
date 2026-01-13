import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Presentation, Download, FileText, ChevronLeft, ChevronRight, BookOpen, Send, Printer, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';
import jsPDF from 'jspdf';

interface LessonSlide {
  slideNumber: number;
  title: string;
  content: string[];
  speakerNotes: string;
  slideType: 'title' | 'objective' | 'instruction' | 'example' | 'practice' | 'summary';
}

interface LessonPlan {
  title: string;
  standard: string;
  topicName: string;
  objective: string;
  duration: string;
  slides: LessonSlide[];
  recommendedWorksheets: {
    topicName: string;
    standard: string;
    difficulty: string;
  }[];
}

interface LessonPlanGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: {
    topicName: string;
    standard: string;
    subject?: string;
  } | null;
  relatedTopics?: { topicName: string; standard: string }[];
  classId?: string;
}

export function LessonPlanGenerator({ 
  open, 
  onOpenChange, 
  topic, 
  relatedTopics = [],
  classId 
}: LessonPlanGeneratorProps) {
  const { toast } = useToast();
  const { pushToSisterApp } = usePushToSisterApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lessonDuration, setLessonDuration] = useState('45 minutes');
  const [isPushingToSisterApp, setIsPushingToSisterApp] = useState(false);

  const generateLessonPlan = async () => {
    if (!topic) return;

    setIsGenerating(true);
    setLessonPlan(null);
    setCurrentSlide(0);

    try {
      const { data, error } = await supabase.functions.invoke('generate-lesson-plan', {
        body: {
          topicName: topic.topicName,
          standard: topic.standard,
          subject: topic.subject,
          relatedTopics,
          lessonDuration,
        },
      });

      if (error) throw error;

      if (data.lessonPlan) {
        setLessonPlan(data.lessonPlan);
        toast({
          title: 'Lesson plan generated!',
          description: `Created ${data.lessonPlan.slides?.length || 0} slides for "${topic.topicName}"`,
        });
      }
    } catch (error) {
      console.error('Error generating lesson plan:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate lesson plan',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsPDF = () => {
    if (!lessonPlan) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Title page
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(lessonPlan.title, pageWidth / 2, yPosition + 20, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Standard: ${lessonPlan.standard}`, pageWidth / 2, yPosition + 35, { align: 'center' });
    pdf.text(`Duration: ${lessonPlan.duration}`, pageWidth / 2, yPosition + 45, { align: 'center' });
    
    pdf.setFontSize(12);
    const objectiveLines = pdf.splitTextToSize(`Objective: ${lessonPlan.objective}`, contentWidth);
    pdf.text(objectiveLines, margin, yPosition + 60);

    // Slides
    lessonPlan.slides.forEach((slide, index) => {
      pdf.addPage();
      yPosition = margin;

      // Slide header
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Slide ${slide.slideNumber}`, margin, yPosition);
      
      // Slide title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      yPosition += 15;
      pdf.text(slide.title, margin, yPosition);

      // Content
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      yPosition += 15;

      slide.content.forEach((item) => {
        const lines = pdf.splitTextToSize(`• ${item}`, contentWidth);
        if (yPosition + lines.length * 7 > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * 7 + 5;
      });

      // Speaker notes
      if (slide.speakerNotes) {
        yPosition += 10;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Speaker Notes:', margin, yPosition);
        yPosition += 7;
        const noteLines = pdf.splitTextToSize(slide.speakerNotes, contentWidth);
        pdf.text(noteLines, margin, yPosition);
      }
    });

    // Recommended worksheets page
    pdf.addPage();
    yPosition = margin;
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recommended Practice Worksheets', margin, yPosition);
    yPosition += 15;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    lessonPlan.recommendedWorksheets.forEach((worksheet, index) => {
      pdf.text(`${index + 1}. ${worksheet.topicName}`, margin, yPosition);
      yPosition += 7;
      pdf.setFont('helvetica', 'italic');
      pdf.text(`   Standard: ${worksheet.standard} | Difficulty: ${worksheet.difficulty}`, margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      yPosition += 12;
    });

    pdf.save(`${lessonPlan.title.replace(/\s+/g, '_')}_Lesson_Plan.pdf`);
    
    toast({
      title: 'PDF downloaded',
      description: 'Your lesson plan has been saved as a PDF.',
    });
  };

  const pushToSisterApps = async () => {
    if (!lessonPlan || !classId) {
      toast({
        title: 'Cannot push to sister apps',
        description: 'Please select a class first.',
        variant: 'destructive',
      });
      return;
    }

    setIsPushingToSisterApp(true);

    try {
      const result = await pushToSisterApp({
        class_id: classId,
        title: lessonPlan.title,
        description: `Lesson on ${lessonPlan.topicName} - ${lessonPlan.objective}`,
        standard_code: lessonPlan.standard,
        topic_name: lessonPlan.topicName,
        xp_reward: 50,
        coin_reward: 25,
      });

      if (result.success) {
        toast({
          title: 'Pushed to sister apps!',
          description: 'The lesson plan has been shared with connected apps.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error pushing to sister apps:', error);
      toast({
        title: 'Push failed',
        description: error instanceof Error ? error.message : 'Failed to push to sister apps',
        variant: 'destructive',
      });
    } finally {
      setIsPushingToSisterApp(false);
    }
  };

  const getSlideTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      title: 'bg-primary text-primary-foreground',
      objective: 'bg-blue-500 text-white',
      instruction: 'bg-emerald-500 text-white',
      example: 'bg-purple-500 text-white',
      practice: 'bg-orange-500 text-white',
      summary: 'bg-rose-500 text-white',
    };
    return colors[type] || 'bg-muted';
  };

  const currentSlideData = lessonPlan?.slides?.[currentSlide];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            AI Lesson Plan Generator
          </DialogTitle>
          <DialogDescription>
            {topic ? `Generate a standards-aligned lesson for "${topic.topicName}" (${topic.standard})` : 'Select a topic to generate a lesson plan'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!lessonPlan ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Lesson Duration</label>
                  <Select value={lessonDuration} onValueChange={setLessonDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30 minutes">30 minutes</SelectItem>
                      <SelectItem value="45 minutes">45 minutes</SelectItem>
                      <SelectItem value="60 minutes">60 minutes</SelectItem>
                      <SelectItem value="90 minutes">90 minutes (block)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {topic && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{topic.topicName}</p>
                        <p className="text-sm text-muted-foreground">
                          Standard: {topic.standard} {topic.subject && `• ${topic.subject}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={generateLessonPlan}
                disabled={!topic || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Lesson Plan...
                  </>
                ) : (
                  <>
                    <Presentation className="h-4 w-4 mr-2" />
                    Generate Lesson Plan
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Lesson header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{lessonPlan.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{lessonPlan.standard}</Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {lessonPlan.duration}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{lessonPlan.objective}</p>
                </div>
              </div>

              <Separator />

              {/* Slide viewer */}
              {currentSlideData && (
                <Card className={`${getSlideTypeColor(currentSlideData.slideType)} min-h-[300px]`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="capitalize">
                        {currentSlideData.slideType}
                      </Badge>
                      <span className="text-sm opacity-75">
                        Slide {currentSlide + 1} of {lessonPlan.slides.length}
                      </span>
                    </div>
                    <CardTitle className="text-2xl">{currentSlideData.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {currentSlideData.content.map((item, index) => (
                        <li key={index} className="text-lg flex items-start gap-2">
                          <span className="opacity-75">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Slide navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex gap-1">
                  {lessonPlan.slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        index === currentSlide ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentSlide(Math.min(lessonPlan.slides.length - 1, currentSlide + 1))}
                  disabled={currentSlide === lessonPlan.slides.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Speaker notes */}
              {currentSlideData?.speakerNotes && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Speaker Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{currentSlideData.speakerNotes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Recommended worksheets */}
              {lessonPlan.recommendedWorksheets.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Printer className="h-4 w-4" />
                      Recommended Worksheets (Aligned to Standards)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {lessonPlan.recommendedWorksheets.map((worksheet, index) => (
                        <Badge key={index} variant="outline" className="py-1.5">
                          {worksheet.topicName}
                          <span className="ml-1 text-muted-foreground">({worksheet.standard})</span>
                          <span className="ml-1 text-xs opacity-75">• {worksheet.difficulty}</span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={downloadAsPDF} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  onClick={pushToSisterApps} 
                  disabled={isPushingToSisterApp || !classId}
                  className="flex-1"
                >
                  {isPushingToSisterApp ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Pushing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Push to Sister Apps
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => {
                    setLessonPlan(null);
                    setCurrentSlide(0);
                  }} 
                  variant="ghost"
                >
                  Generate New
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
