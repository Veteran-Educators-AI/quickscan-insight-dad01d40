import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Presentation, Download, FileText, ChevronLeft, ChevronRight, BookOpen, Send, Printer, Clock, FileType, Pencil, Check, Plus, Trash2, X, Save, Library, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';
import { useAuth } from '@/lib/auth';
import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';

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
  onOpenLibrary?: () => void;
}

export function LessonPlanGenerator({ 
  open, 
  onOpenChange, 
  topic, 
  relatedTopics = [],
  classId,
  onOpenLibrary
}: LessonPlanGeneratorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { pushToSisterApp } = usePushToSisterApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lessonDuration, setLessonDuration] = useState('45 minutes');
  const [isPushingToSisterApp, setIsPushingToSisterApp] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContentIndex, setEditingContentIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit handlers
  const updateSlideTitle = (newTitle: string) => {
    if (!lessonPlan) return;
    const updatedSlides = [...lessonPlan.slides];
    updatedSlides[currentSlide] = { ...updatedSlides[currentSlide], title: newTitle };
    setLessonPlan({ ...lessonPlan, slides: updatedSlides });
  };

  const updateSlideContent = (index: number, newContent: string) => {
    if (!lessonPlan) return;
    const updatedSlides = [...lessonPlan.slides];
    const updatedContent = [...updatedSlides[currentSlide].content];
    updatedContent[index] = newContent;
    updatedSlides[currentSlide] = { ...updatedSlides[currentSlide], content: updatedContent };
    setLessonPlan({ ...lessonPlan, slides: updatedSlides });
  };

  const addContentBullet = () => {
    if (!lessonPlan) return;
    const updatedSlides = [...lessonPlan.slides];
    const updatedContent = [...updatedSlides[currentSlide].content, 'New bullet point'];
    updatedSlides[currentSlide] = { ...updatedSlides[currentSlide], content: updatedContent };
    setLessonPlan({ ...lessonPlan, slides: updatedSlides });
    setEditingContentIndex(updatedContent.length - 1);
  };

  const removeContentBullet = (index: number) => {
    if (!lessonPlan) return;
    const updatedSlides = [...lessonPlan.slides];
    const updatedContent = updatedSlides[currentSlide].content.filter((_, i) => i !== index);
    updatedSlides[currentSlide] = { ...updatedSlides[currentSlide], content: updatedContent };
    setLessonPlan({ ...lessonPlan, slides: updatedSlides });
    setEditingContentIndex(null);
  };

  const updateSpeakerNotes = (newNotes: string) => {
    if (!lessonPlan) return;
    const updatedSlides = [...lessonPlan.slides];
    updatedSlides[currentSlide] = { ...updatedSlides[currentSlide], speakerNotes: newNotes };
    setLessonPlan({ ...lessonPlan, slides: updatedSlides });
  };

  const updateLessonTitle = (newTitle: string) => {
    if (!lessonPlan) return;
    setLessonPlan({ ...lessonPlan, title: newTitle });
  };

  const updateObjective = (newObjective: string) => {
    if (!lessonPlan) return;
    setLessonPlan({ ...lessonPlan, objective: newObjective });
  };

  const updateSlideType = (newType: LessonSlide['slideType']) => {
    if (!lessonPlan) return;
    const updatedSlides = [...lessonPlan.slides];
    updatedSlides[currentSlide] = { ...updatedSlides[currentSlide], slideType: newType };
    setLessonPlan({ ...lessonPlan, slides: updatedSlides });
  };

  const moveSlideUp = () => {
    if (!lessonPlan || currentSlide === 0) return;
    const updatedSlides = [...lessonPlan.slides];
    const temp = updatedSlides[currentSlide];
    updatedSlides[currentSlide] = updatedSlides[currentSlide - 1];
    updatedSlides[currentSlide - 1] = temp;
    // Update slide numbers
    updatedSlides[currentSlide].slideNumber = currentSlide + 1;
    updatedSlides[currentSlide - 1].slideNumber = currentSlide;
    setLessonPlan({ ...lessonPlan, slides: updatedSlides });
    setCurrentSlide(currentSlide - 1);
  };

  const moveSlideDown = () => {
    if (!lessonPlan || currentSlide === lessonPlan.slides.length - 1) return;
    const updatedSlides = [...lessonPlan.slides];
    const temp = updatedSlides[currentSlide];
    updatedSlides[currentSlide] = updatedSlides[currentSlide + 1];
    updatedSlides[currentSlide + 1] = temp;
    // Update slide numbers
    updatedSlides[currentSlide].slideNumber = currentSlide + 1;
    updatedSlides[currentSlide + 1].slideNumber = currentSlide + 2;
    setLessonPlan({ ...lessonPlan, slides: updatedSlides });
    setCurrentSlide(currentSlide + 1);
  };

  const slideTypes: { value: LessonSlide['slideType']; label: string }[] = [
    { value: 'title', label: 'Title' },
    { value: 'objective', label: 'Objective' },
    { value: 'instruction', label: 'Instruction' },
    { value: 'example', label: 'Example' },
    { value: 'practice', label: 'Practice' },
    { value: 'summary', label: 'Summary' },
  ];

  const saveLessonPlan = async () => {
    if (!lessonPlan || !user) {
      toast({
        title: 'Cannot save',
        description: 'Please log in to save lesson plans.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const insertData = {
        teacher_id: user.id,
        title: lessonPlan.title,
        standard: lessonPlan.standard,
        topic_name: lessonPlan.topicName,
        subject: topic?.subject || null,
        objective: lessonPlan.objective,
        duration: lessonPlan.duration,
        slides: lessonPlan.slides as unknown,
        recommended_worksheets: lessonPlan.recommendedWorksheets as unknown,
        class_id: classId || null,
      };
      
      const { error } = await supabase.from('lesson_plans').insert(insertData as any);

      if (error) throw error;

      toast({
        title: 'Lesson plan saved!',
        description: 'You can find it in your Lesson Plan Library.',
      });
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      toast({
        title: 'Failed to save',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

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

  const downloadAsPowerPoint = () => {
    if (!lessonPlan) return;

    const pptx = new pptxgen();
    
    // Set presentation properties
    pptx.author = 'ScanGenius';
    pptx.title = lessonPlan.title;
    pptx.subject = `Lesson on ${lessonPlan.topicName}`;
    
    // Define slide type colors (matching the UI)
    const slideColors: Record<string, { bg: string; text: string }> = {
      title: { bg: '3B82F6', text: 'FFFFFF' },
      objective: { bg: '3B82F6', text: 'FFFFFF' },
      instruction: { bg: '10B981', text: 'FFFFFF' },
      example: { bg: 'A855F7', text: 'FFFFFF' },
      practice: { bg: 'F97316', text: 'FFFFFF' },
      summary: { bg: 'F43F5E', text: 'FFFFFF' },
    };

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText(lessonPlan.title, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 1.5,
      fontSize: 36,
      bold: true,
      color: '1F2937',
      align: 'center',
      valign: 'middle',
    });
    titleSlide.addText(`Standard: ${lessonPlan.standard}`, {
      x: 0.5,
      y: 3.5,
      w: 9,
      h: 0.5,
      fontSize: 18,
      color: '6B7280',
      align: 'center',
    });
    titleSlide.addText(`Duration: ${lessonPlan.duration}`, {
      x: 0.5,
      y: 4,
      w: 9,
      h: 0.5,
      fontSize: 16,
      color: '6B7280',
      align: 'center',
    });

    // Objective slide
    const objectiveSlide = pptx.addSlide();
    objectiveSlide.addText('Learning Objective', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: '1F2937',
    });
    objectiveSlide.addText(lessonPlan.objective, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 3,
      fontSize: 20,
      color: '374151',
      valign: 'top',
    });

    // Content slides
    lessonPlan.slides.forEach((slide) => {
      const colors = slideColors[slide.slideType] || { bg: 'E5E7EB', text: '1F2937' };
      const pptSlide = pptx.addSlide();
      
      // Slide type badge
      pptSlide.addText(slide.slideType.toUpperCase(), {
        x: 0.5,
        y: 0.3,
        w: 1.5,
        h: 0.35,
        fontSize: 10,
        bold: true,
        color: 'FFFFFF',
        fill: { color: colors.bg },
        align: 'center',
        valign: 'middle',
      });

      // Slide title
      pptSlide.addText(slide.title, {
        x: 0.5,
        y: 0.8,
        w: 9,
        h: 0.7,
        fontSize: 28,
        bold: true,
        color: '1F2937',
      });

      // Content bullets
      const bulletPoints = slide.content.map((item) => ({
        text: item,
        options: { bullet: true, indentLevel: 0 },
      }));

      pptSlide.addText(bulletPoints, {
        x: 0.5,
        y: 1.6,
        w: 9,
        h: 3.5,
        fontSize: 18,
        color: '374151',
        valign: 'top',
        lineSpacing: 28,
      });

      // Speaker notes
      if (slide.speakerNotes) {
        pptSlide.addNotes(slide.speakerNotes);
      }
    });

    // Recommended worksheets slide
    if (lessonPlan.recommendedWorksheets.length > 0) {
      const worksheetSlide = pptx.addSlide();
      worksheetSlide.addText('Recommended Practice Worksheets', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: '1F2937',
      });

      const worksheetBullets = lessonPlan.recommendedWorksheets.map((ws) => ({
        text: `${ws.topicName} (${ws.standard}) - ${ws.difficulty}`,
        options: { bullet: true, indentLevel: 0 },
      }));

      worksheetSlide.addText(worksheetBullets, {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 3.5,
        fontSize: 18,
        color: '374151',
        valign: 'top',
        lineSpacing: 28,
      });
    }

    // Save the PowerPoint file
    pptx.writeFile({ fileName: `${lessonPlan.title.replace(/\s+/g, '_')}_Lesson_Plan.pptx` });

    toast({
      title: 'PowerPoint downloaded',
      description: 'Your lesson plan has been saved as a .pptx file.',
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
              {/* Lesson header with edit toggle */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <Input
                      value={lessonPlan.title}
                      onChange={(e) => updateLessonTitle(e.target.value)}
                      className="text-lg font-bold mb-2"
                    />
                  ) : (
                    <h3 className="text-lg font-bold">{lessonPlan.title}</h3>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{lessonPlan.standard}</Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {lessonPlan.duration}
                    </Badge>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={lessonPlan.objective}
                      onChange={(e) => updateObjective(e.target.value)}
                      className="text-sm mt-2"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">{lessonPlan.objective}</p>
                  )}
                </div>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsEditing(!isEditing);
                    setEditingContentIndex(null);
                  }}
                  className="ml-2"
                >
                  {isEditing ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Done
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Slide viewer */}
              {currentSlideData && (
                <Card className={`${getSlideTypeColor(currentSlideData.slideType)} min-h-[300px]`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 opacity-75" />
                          <Select
                            value={currentSlideData.slideType}
                            onValueChange={(value) => updateSlideType(value as LessonSlide['slideType'])}
                          >
                            <SelectTrigger className="w-[130px] h-8 bg-white/20 border-white/30 text-inherit">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {slideTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="capitalize">
                          {currentSlideData.slideType}
                        </Badge>
                      )}
                      <div className="flex items-center gap-2">
                        {isEditing && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-inherit hover:bg-white/20"
                              onClick={moveSlideUp}
                              disabled={currentSlide === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-inherit hover:bg-white/20"
                              onClick={moveSlideDown}
                              disabled={currentSlide === lessonPlan.slides.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <span className="text-sm opacity-75">
                          Slide {currentSlide + 1} of {lessonPlan.slides.length}
                        </span>
                      </div>
                    </div>
                    {isEditing ? (
                      <Input
                        value={currentSlideData.title}
                        onChange={(e) => updateSlideTitle(e.target.value)}
                        className="text-xl font-bold bg-white/20 border-white/30 text-inherit placeholder:text-inherit/50"
                      />
                    ) : (
                      <CardTitle className="text-2xl">{currentSlideData.title}</CardTitle>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {currentSlideData.content.map((item, index) => (
                        <li key={index} className="text-lg flex items-start gap-2 group">
                          <span className="opacity-75 mt-2">•</span>
                          {isEditing ? (
                            <div className="flex-1 flex items-start gap-2">
                              {editingContentIndex === index ? (
                                <Textarea
                                  value={item}
                                  onChange={(e) => updateSlideContent(index, e.target.value)}
                                  onBlur={() => setEditingContentIndex(null)}
                                  autoFocus
                                  className="flex-1 bg-white/20 border-white/30 text-inherit placeholder:text-inherit/50"
                                  rows={2}
                                />
                              ) : (
                                <span 
                                  onClick={() => setEditingContentIndex(index)}
                                  className="flex-1 cursor-text hover:bg-white/10 rounded px-1 -mx-1"
                                >
                                  {item}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-inherit hover:bg-white/20"
                                onClick={() => removeContentBullet(index)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span>{item}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addContentBullet}
                        className="mt-3 text-inherit hover:bg-white/20"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add bullet point
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Slide navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentSlide(Math.max(0, currentSlide - 1));
                    setEditingContentIndex(null);
                  }}
                  disabled={currentSlide === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex gap-1">
                  {lessonPlan.slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentSlide(index);
                        setEditingContentIndex(null);
                      }}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        index === currentSlide ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentSlide(Math.min(lessonPlan.slides.length - 1, currentSlide + 1));
                    setEditingContentIndex(null);
                  }}
                  disabled={currentSlide === lessonPlan.slides.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Speaker notes */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Speaker Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={currentSlideData?.speakerNotes || ''}
                      onChange={(e) => updateSpeakerNotes(e.target.value)}
                      placeholder="Add speaker notes for this slide..."
                      className="text-sm"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {currentSlideData?.speakerNotes || 'No speaker notes for this slide.'}
                    </p>
                  )}
                </CardContent>
              </Card>

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
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={saveLessonPlan} disabled={isSaving} variant="default" className="flex-1 min-w-[140px]">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save to Library
                </Button>
                <Button onClick={downloadAsPowerPoint} variant="outline" className="flex-1 min-w-[140px]">
                  <FileType className="h-4 w-4 mr-2" />
                  PowerPoint
                </Button>
                <Button onClick={downloadAsPDF} variant="outline" className="flex-1 min-w-[140px]">
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  onClick={pushToSisterApps} 
                  disabled={isPushingToSisterApp || !classId}
                  variant="secondary"
                  className="flex-1 min-w-[140px]"
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
                {onOpenLibrary && (
                  <Button
                    onClick={() => {
                      onOpenLibrary();
                    }}
                    variant="ghost"
                    className="min-w-[120px]"
                  >
                    <Library className="h-4 w-4 mr-2" />
                    View Library
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    setLessonPlan(null);
                    setCurrentSlide(0);
                  }} 
                  variant="ghost"
                  className="min-w-[120px]"
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
