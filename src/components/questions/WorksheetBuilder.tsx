import { useState, useRef, useEffect } from 'react';
import { Download, Printer, FileText, X, Sparkles, Loader2, Save, FolderOpen, Trash2, Share2, Copy, Check, Link, BookOpen, ImageIcon, Pencil, RefreshCw, Palette, ClipboardList } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { handleApiError, checkResponseForApiError } from '@/lib/apiErrorHandler';
import { renderMathText } from '@/lib/mathRenderer';
import { MathSymbolPreview } from './MathSymbolPreview';
import jsPDF from 'jspdf';
import { getFormulasForTopics, type FormulaCategory } from '@/data/formulaReference';

export interface WorksheetQuestion {
  id: string;
  topicName: string;
  standard: string;
  jmapUrl: string;
  subject: string;
  category: string;
}

// Advancement levels A-F for diagnostic worksheets
export type AdvancementLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  difficulty: 'medium' | 'hard' | 'challenging';
  advancementLevel?: AdvancementLevel; // For diagnostic worksheets
  svg?: string;
  imageUrl?: string;
  imagePrompt?: string;
  clipartUrl?: string;
}

// Worksheet mode types
export type WorksheetMode = 'practice' | 'basic_assessment' | 'diagnostic';

interface SavedWorksheet {
  id: string;
  title: string;
  teacher_name: string | null;
  questions: GeneratedQuestion[];
  topics: WorksheetQuestion[];
  settings: {
    questionCount: string;
    difficultyFilter: string[];
    showAnswerLines: boolean;
    includeGeometry?: boolean;
    includeFormulas?: boolean;
    includeFormulaSheet?: boolean;
    includeGraphPaper?: boolean;
    includeCoordinateGeometry?: boolean;
    useAIImages?: boolean;
    imageSize?: number;
    includeClipart?: boolean;
    worksheetMode?: WorksheetMode;
  };
  created_at: string;
  share_code: string | null;
  is_shared: boolean;
}

interface WorksheetBuilderProps {
  selectedQuestions: WorksheetQuestion[];
  onRemoveQuestion: (id: string) => void;
  onClearAll: () => void;
}

export function WorksheetBuilder({ selectedQuestions, onRemoveQuestion, onClearAll }: WorksheetBuilderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [worksheetTitle, setWorksheetTitle] = useState('Math Practice Worksheet');
  const [hasUserEditedTitle, setHasUserEditedTitle] = useState(false);
  const [worksheetMode, setWorksheetMode] = useState<WorksheetMode>('practice');
  const [teacherName, setTeacherName] = useState('');

  // Auto-update title to first topic name when questions are added
  useEffect(() => {
    if (selectedQuestions.length > 0 && !hasUserEditedTitle) {
      const prefix = worksheetMode === 'basic_assessment' ? 'Assessment: ' : worksheetMode === 'diagnostic' ? 'Diagnostic: ' : '';
      setWorksheetTitle(prefix + selectedQuestions[0].topicName);
    } else if (selectedQuestions.length === 0 && !hasUserEditedTitle) {
      setWorksheetTitle(worksheetMode === 'basic_assessment' ? 'Math Assessment' : worksheetMode === 'diagnostic' ? 'Diagnostic Assessment' : 'Math Practice Worksheet');
    }
  }, [selectedQuestions, hasUserEditedTitle, worksheetMode]);
  const [showAnswerLines, setShowAnswerLines] = useState(true);
  const [questionCount, setQuestionCount] = useState('5');
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>(['medium', 'hard', 'challenging']);
  const [includeFormulas, setIncludeFormulas] = useState(false);
  const [includeFormulaSheet, setIncludeFormulaSheet] = useState(false);
  const [includeGraphPaper, setIncludeGraphPaper] = useState(false);
  const [includeCoordinateGeometry, setIncludeCoordinateGeometry] = useState(false);
  const [useAIImages, setUseAIImages] = useState(false);
  const [imageSize, setImageSize] = useState(200); // Image size in pixels (100-400)
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledQuestions, setCompiledQuestions] = useState<GeneratedQuestion[]>([]);
  const [isCompiled, setIsCompiled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedWorksheets, setSavedWorksheets] = useState<SavedWorksheet[]>([]);
  const [showSavedWorksheets, setShowSavedWorksheets] = useState(false);
  const [isLoadingWorksheets, setIsLoadingWorksheets] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Image generation state
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageGenerationProgress, setImageGenerationProgress] = useState(0);
  const [imageGenerationStatus, setImageGenerationStatus] = useState('');
  const [imagesGenerated, setImagesGenerated] = useState(false);
  
  // Prompt editing modal state
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [editablePrompts, setEditablePrompts] = useState<{ questionNumber: number; prompt: string }[]>([]);
  
  // Single image regeneration state
  const [regeneratingQuestionNumber, setRegeneratingQuestionNumber] = useState<number | null>(null);
  
  // Clipart state
  const [showClipartDialog, setShowClipartDialog] = useState(false);
  const [isGeneratingClipart, setIsGeneratingClipart] = useState(false);
  const [clipartProgress, setClipartProgress] = useState(0);
  const [clipartStatus, setClipartStatus] = useState('');
  const [clipartGenerated, setClipartGenerated] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  // Determine if selected topics are geometry/trigonometry related (for shape generation vs clipart)
  const isGeometryOrTrigSubject = selectedQuestions.some(q => {
    const subject = q.subject?.toLowerCase() || '';
    const category = q.category?.toLowerCase() || '';
    const topicName = q.topicName?.toLowerCase() || '';
    return (
      subject.includes('geometry') ||
      subject.includes('trigonometry') ||
      category.includes('geometry') ||
      category.includes('trigonometry') ||
      topicName.includes('geometry') ||
      topicName.includes('trigonometry') ||
      topicName.includes('triangle') ||
      topicName.includes('circle') ||
      topicName.includes('polygon') ||
      topicName.includes('angle') ||
      topicName.includes('congruence') ||
      topicName.includes('similarity') ||
      topicName.includes('pythagorean') ||
      topicName.includes('sine') ||
      topicName.includes('cosine') ||
      topicName.includes('tangent')
    );
  });

  const toggleDifficulty = (difficulty: string) => {
    setDifficultyFilter(prev => 
      prev.includes(difficulty)
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    );
  };

  const fetchSavedWorksheets = async () => {
    if (!user) return;
    setIsLoadingWorksheets(true);
    try {
      const { data, error } = await supabase
        .from('worksheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedWorksheets((data || []).map(w => ({
        ...w,
        questions: w.questions as unknown as GeneratedQuestion[],
        topics: w.topics as unknown as WorksheetQuestion[],
        settings: w.settings as unknown as SavedWorksheet['settings'],
      })));
    } catch (error) {
      console.error('Error fetching worksheets:', error);
    } finally {
      setIsLoadingWorksheets(false);
    }
  };

  const saveWorksheet = async () => {
    if (!user || compiledQuestions.length === 0) return;

    setIsSaving(true);
    try {
      const worksheetData = {
        teacher_id: user.id,
        title: worksheetTitle,
        teacher_name: teacherName || null,
        questions: JSON.parse(JSON.stringify(compiledQuestions)),
        topics: JSON.parse(JSON.stringify(selectedQuestions)),
        settings: JSON.parse(JSON.stringify({
          questionCount,
          difficultyFilter,
          showAnswerLines,
          includeFormulas,
          includeFormulaSheet,
          includeGraphPaper,
          includeCoordinateGeometry,
          useAIImages,
          imageSize,
          includeClipart: clipartGenerated,
          worksheetMode,
        })),
      };
      const { error } = await supabase.from('worksheets').insert([worksheetData]);

      if (error) throw error;

      toast({
        title: 'Worksheet saved!',
        description: 'You can access it from your saved worksheets.',
      });
      fetchSavedWorksheets();
    } catch (error) {
      console.error('Error saving worksheet:', error);
      toast({
        title: 'Failed to save',
        description: 'Could not save worksheet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadWorksheet = (worksheet: SavedWorksheet) => {
    setWorksheetTitle(worksheet.title);
    setHasUserEditedTitle(true);
    setTeacherName(worksheet.teacher_name || '');
    setCompiledQuestions(worksheet.questions);
    setQuestionCount(worksheet.settings.questionCount);
    setDifficultyFilter(worksheet.settings.difficultyFilter);
    setShowAnswerLines(worksheet.settings.showAnswerLines);
    setIncludeFormulas(worksheet.settings.includeFormulas ?? false);
    setIncludeFormulaSheet(worksheet.settings.includeFormulaSheet ?? false);
    setIncludeGraphPaper(worksheet.settings.includeGraphPaper ?? false);
    setIncludeCoordinateGeometry(worksheet.settings.includeCoordinateGeometry ?? false);
    setUseAIImages(worksheet.settings.useAIImages ?? (worksheet.settings.includeGeometry ?? false));
    setImageSize(worksheet.settings.imageSize ?? 200);
    setIsCompiled(true);
    setShowSavedWorksheets(false);
    toast({
      title: 'Worksheet loaded',
      description: `"${worksheet.title}" has been loaded.`,
    });
  };

  const deleteWorksheet = async (id: string) => {
    try {
      const { error } = await supabase.from('worksheets').delete().eq('id', id);
      if (error) throw error;
      setSavedWorksheets(prev => prev.filter(w => w.id !== id));
      toast({ title: 'Worksheet deleted' });
    } catch (error) {
      console.error('Error deleting worksheet:', error);
      toast({
        title: 'Failed to delete',
        description: 'Could not delete worksheet.',
        variant: 'destructive',
      });
    }
  };

  const generateShareCode = () => {
    return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  };

  const toggleShareWorksheet = async (worksheet: SavedWorksheet) => {
    setIsSharing(true);
    try {
      if (worksheet.is_shared) {
        // Unshare
        const { error } = await supabase
          .from('worksheets')
          .update({ is_shared: false, share_code: null })
          .eq('id', worksheet.id);

        if (error) throw error;

        setSavedWorksheets(prev => prev.map(w => 
          w.id === worksheet.id ? { ...w, is_shared: false, share_code: null } : w
        ));
        toast({ title: 'Worksheet unshared' });
      } else {
        // Share
        const shareCode = generateShareCode();
        const { error } = await supabase
          .from('worksheets')
          .update({ is_shared: true, share_code: shareCode })
          .eq('id', worksheet.id);

        if (error) throw error;

        setSavedWorksheets(prev => prev.map(w => 
          w.id === worksheet.id ? { ...w, is_shared: true, share_code: shareCode } : w
        ));
        toast({ title: 'Worksheet shared!' });
      }
    } catch (error) {
      console.error('Error toggling share:', error);
      toast({
        title: 'Failed to update sharing',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = async (shareCode: string, worksheetId: string) => {
    const shareUrl = `${window.location.origin}/worksheet/${shareCode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(worksheetId);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Link copied to clipboard!' });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: shareUrl,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavedWorksheets();
    }
  }, [user]);

  const compileWorksheet = async () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: 'No topics selected',
        description: 'Please select at least one topic to compile.',
        variant: 'destructive',
      });
      return;
    }

    setIsCompiling(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: selectedQuestions.map(q => ({
            topicName: q.topicName,
            standard: q.standard,
            subject: q.subject,
            category: q.category,
          })),
          questionCount: parseInt(questionCount),
          difficultyLevels: difficultyFilter,
          includeGeometry: useAIImages,
          includeFormulas,
          includeGraphPaper,
          includeCoordinateGeometry,
          useAIImages,
          worksheetMode, // Pass worksheet mode to generate advancement levels for diagnostic
        },
      });

      if (error) {
        handleApiError(error, 'Worksheet generation');
        return;
      }

      if (checkResponseForApiError(data)) {
        return;
      }

      if (data.questions && data.questions.length > 0) {
        setCompiledQuestions(data.questions);
        setIsCompiled(true);
        // Show clipart dialog after successful compilation ONLY for non-geometry/trig subjects
        if (!isGeometryOrTrigSubject) {
          setShowClipartDialog(true);
          toast({
            title: 'Worksheet compiled!',
            description: `Generated ${data.questions.length} questions. Would you like to add clipart?`,
          });
        } else {
          toast({
            title: 'Worksheet compiled!',
            description: `Generated ${data.questions.length} questions. You can generate diagrams for geometry problems.`,
          });
        }
      } else {
        throw new Error('No questions generated');
      }
    } catch (error) {
      console.error('Error compiling worksheet:', error);
      handleApiError(error, 'Worksheet generation');
    } finally {
      setIsCompiling(false);
    }
  };

  const resetCompilation = () => {
    setIsCompiled(false);
    setCompiledQuestions([]);
    setImagesGenerated(false);
    setImageGenerationProgress(0);
    setImageGenerationStatus('');
    setClipartGenerated(false);
    setClipartProgress(0);
    setClipartStatus('');
  };

  // Generate clipart for all questions
  const generateClipart = async () => {
    if (compiledQuestions.length === 0) return;

    setShowClipartDialog(false);
    setIsGeneratingClipart(true);
    setClipartProgress(0);
    setClipartStatus('Generating fun clipart for your worksheet...');

    try {
      const updatedQuestions = [...compiledQuestions];
      let successCount = 0;

      for (let i = 0; i < updatedQuestions.length; i++) {
        const question = updatedQuestions[i];
        setClipartStatus(`Generating clipart ${i + 1} of ${updatedQuestions.length}...`);

        // Create a themed clipart prompt based on the question topic
        const clipartPrompt = `Create a simple, fun, black and white line art clipart icon suitable for a math worksheet. The clipart should relate to: "${question.topic}" in the context of ${question.question.substring(0, 100)}. Make it educational, appropriate for students, simple enough to print clearly, cartoon-style with clean lines. No text, just the image. White background.`;

        const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
          body: {
            questions: [{
              questionNumber: question.questionNumber,
              imagePrompt: clipartPrompt,
            }],
          },
        });

        if (!error && data?.results?.[0]?.imageUrl) {
          updatedQuestions[i] = {
            ...updatedQuestions[i],
            clipartUrl: data.results[0].imageUrl,
          };
          successCount++;
        }

        setClipartProgress(((i + 1) / updatedQuestions.length) * 100);
      }

      setCompiledQuestions(updatedQuestions);
      setClipartGenerated(true);
      
      toast({
        title: 'Clipart added!',
        description: `Successfully generated ${successCount} clipart images for your worksheet.`,
      });
    } catch (error) {
      console.error('Error generating clipart:', error);
      toast({
        title: 'Clipart generation failed',
        description: 'Some clipart could not be generated. You can continue without them.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingClipart(false);
      setClipartProgress(100);
    }
  };

  // Regenerate clipart for a single question
  const regenerateClipart = async (questionNumber: number) => {
    const question = compiledQuestions.find(q => q.questionNumber === questionNumber);
    if (!question) return;

    setRegeneratingQuestionNumber(questionNumber);

    try {
      const clipartPrompt = `Create a simple, fun, black and white line art clipart icon suitable for a math worksheet. The clipart should relate to: "${question.topic}" in the context of ${question.question.substring(0, 100)}. Make it educational, appropriate for students, simple enough to print clearly, cartoon-style with clean lines. No text, just the image. White background.`;

      const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
        body: {
          questions: [{
            questionNumber: questionNumber,
            imagePrompt: clipartPrompt,
          }],
        },
      });

      if (!error && data?.results?.[0]?.imageUrl) {
        const updatedQuestions = compiledQuestions.map(q =>
          q.questionNumber === questionNumber
            ? { ...q, clipartUrl: data.results[0].imageUrl }
            : q
        );
        setCompiledQuestions(updatedQuestions);
        
        toast({
          title: 'Clipart regenerated!',
          description: `New clipart created for question ${questionNumber}.`,
        });
      } else {
        throw new Error('No image returned');
      }
    } catch (error) {
      console.error('Error regenerating clipart:', error);
      toast({
        title: 'Regeneration failed',
        description: 'Could not regenerate the clipart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingQuestionNumber(null);
    }
  };

  // Check if there are questions that need images
  const questionsNeedingImages = compiledQuestions.filter(q => q.imagePrompt && !q.imageUrl);
  const hasQuestionsWithImagePrompts = compiledQuestions.some(q => q.imagePrompt);

  // Open prompt editor modal
  const openPromptEditor = () => {
    const promptsToEdit = compiledQuestions
      .filter(q => q.imagePrompt && !q.imageUrl)
      .map(q => ({
        questionNumber: q.questionNumber,
        prompt: q.imagePrompt!,
      }));
    setEditablePrompts(promptsToEdit);
    setShowPromptEditor(true);
  };

  // Update a single prompt in the editable prompts array
  const updateEditablePrompt = (questionNumber: number, newPrompt: string) => {
    setEditablePrompts(prev =>
      prev.map(p =>
        p.questionNumber === questionNumber
          ? { ...p, prompt: newPrompt }
          : p
      )
    );
  };

  // Generate images with edited prompts
  const generateImagesWithEditedPrompts = async () => {
    if (editablePrompts.length === 0) {
      toast({
        title: 'No diagrams to generate',
        description: 'All questions already have images or no diagrams are needed.',
      });
      return;
    }

    // Update the compiled questions with edited prompts before generating
    const updatedQuestions = compiledQuestions.map(q => {
      const editedPrompt = editablePrompts.find(p => p.questionNumber === q.questionNumber);
      if (editedPrompt) {
        return { ...q, imagePrompt: editedPrompt.prompt };
      }
      return q;
    });
    setCompiledQuestions(updatedQuestions);

    setShowPromptEditor(false);
    setIsGeneratingImages(true);
    setImageGenerationProgress(0);
    setImageGenerationStatus(`Generating images for ${editablePrompts.length} questions...`);

    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
        body: {
          questions: editablePrompts.map(p => ({
            questionNumber: p.questionNumber,
            imagePrompt: p.prompt,
          })),
        },
      });

      if (error) throw error;

      if (data.results) {
        // Update questions with generated images
        const finalQuestions = [...updatedQuestions];
        let successCount = 0;
        
        for (const result of data.results) {
          const questionIndex = finalQuestions.findIndex(q => q.questionNumber === result.questionNumber);
          if (questionIndex !== -1 && result.imageUrl) {
            finalQuestions[questionIndex] = {
              ...finalQuestions[questionIndex],
              imageUrl: result.imageUrl,
            };
            successCount++;
          }
          // Update progress
          const progress = ((data.results.indexOf(result) + 1) / data.results.length) * 100;
          setImageGenerationProgress(progress);
          setImageGenerationStatus(`Generated ${successCount} of ${editablePrompts.length} diagrams`);
        }

        setCompiledQuestions(finalQuestions);
        setImagesGenerated(true);
        
        toast({
          title: 'Diagrams generated!',
          description: `Successfully created ${successCount} of ${editablePrompts.length} diagram images.`,
        });
      }
    } catch (error) {
      console.error('Error generating images:', error);
      toast({
        title: 'Image generation failed',
        description: 'Some diagrams could not be generated. You can try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingImages(false);
      setImageGenerationProgress(100);
    }
  };

  // Regenerate a single image
  const regenerateSingleImage = async (questionNumber: number) => {
    const question = compiledQuestions.find(q => q.questionNumber === questionNumber);
    if (!question?.imagePrompt) {
      toast({
        title: 'Cannot regenerate',
        description: 'No diagram prompt found for this question.',
        variant: 'destructive',
      });
      return;
    }

    setRegeneratingQuestionNumber(questionNumber);

    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
        body: {
          questions: [{
            questionNumber: questionNumber,
            imagePrompt: question.imagePrompt,
          }],
        },
      });

      if (error) throw error;

      if (data.results && data.results[0]?.imageUrl) {
        const updatedQuestions = compiledQuestions.map(q =>
          q.questionNumber === questionNumber
            ? { ...q, imageUrl: data.results[0].imageUrl }
            : q
        );
        setCompiledQuestions(updatedQuestions);
        
        toast({
          title: 'Diagram regenerated!',
          description: `New diagram created for question ${questionNumber}.`,
        });
      } else {
        throw new Error('No image returned');
      }
    } catch (error) {
      console.error('Error regenerating image:', error);
      toast({
        title: 'Regeneration failed',
        description: 'Could not regenerate the diagram. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingQuestionNumber(null);
    }
  };

  const generatePDF = async () => {
    if (compiledQuestions.length === 0) {
      toast({
        title: 'No questions compiled',
        description: 'Please compile the worksheet first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(worksheetTitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      if (teacherName) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Teacher: ${teacherName}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }

      // Student info line
      pdf.setFontSize(11);
      pdf.text('Name: _______________________   Date: ___________   Period: _____', margin, yPosition);
      yPosition += 15;

      // Separator
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);

      // Questions
      for (const question of compiledQuestions) {
        // Check if we need a new page
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = margin;
        }

        // Question number, advancement level (for diagnostic), and difficulty badge
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        const difficultyText = question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
        
        if (worksheetMode === 'diagnostic' && question.advancementLevel) {
          pdf.text(`${question.questionNumber}. [Level ${question.advancementLevel}] [${difficultyText}]`, margin, yPosition);
        } else {
          pdf.text(`${question.questionNumber}. [${difficultyText}]`, margin, yPosition);
        }
        yPosition += 6;

        // Topic and standard reference
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(`${question.topic} (${question.standard})`, margin + 5, yPosition);
        pdf.setTextColor(0);
        yPosition += 8;

        // Question text - wrap long text
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(question.question, contentWidth - 10);
        
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin + 5, yPosition);
          yPosition += 6;
        });

        yPosition += 4;

        // Render AI-generated image if present
        if (question.imageUrl) {
          try {
            // Create an image from the base64 data URL
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.crossOrigin = 'anonymous';
              img.src = question.imageUrl!;
            });
            
            // Draw to canvas and get as PNG data URL
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 400;
            canvas.height = img.height || 400;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              const pngDataUrl = canvas.toDataURL('image/png');
              
              // Check if we need a new page for the image
              if (yPosition > pageHeight - 80) {
                pdf.addPage();
                yPosition = margin;
              }
              
              // Add image to PDF (centered) - use user-configured size
              // Convert pixel size to mm (roughly 0.26mm per pixel at 96dpi)
              const imgSizeMm = imageSize * 0.26;
              const imgWidth = imgSizeMm;
              const imgHeight = imgSizeMm;
              const imgX = (pageWidth - imgWidth) / 2;
              pdf.addImage(pngDataUrl, 'PNG', imgX, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 5;
            }
          } catch (imgError) {
            console.error('Error rendering AI image to PDF:', imgError);
          }
        }
        // Render SVG as image if present (fallback)
        else if (question.svg) {
          try {
            // Convert SVG to data URL
            const svgBlob = new Blob([question.svg], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);
            
            // Create an image from SVG
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = svgUrl;
            });
            
            // Draw to canvas and get as PNG data URL
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, 200, 200);
              ctx.drawImage(img, 0, 0, 200, 200);
              const pngDataUrl = canvas.toDataURL('image/png');
              
              // Check if we need a new page for the image
              if (yPosition > pageHeight - 70) {
                pdf.addPage();
                yPosition = margin;
              }
              
              // Add image to PDF (centered) - 30% larger than base size
              const imgWidth = 65; // mm (50 * 1.3)
              const imgHeight = 65; // mm (50 * 1.3)
              const imgX = (pageWidth - imgWidth) / 2;
              pdf.addImage(pngDataUrl, 'PNG', imgX, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 5;
            }
            
            URL.revokeObjectURL(svgUrl);
          } catch (svgError) {
            console.error('Error rendering SVG to PDF:', svgError);
          }
        }

        // Render clipart if present (small icon next to question number)
        if (question.clipartUrl) {
          try {
            const clipImg = new Image();
            await new Promise<void>((resolve, reject) => {
              clipImg.onload = () => resolve();
              clipImg.onerror = reject;
              clipImg.crossOrigin = 'anonymous';
              clipImg.src = question.clipartUrl!;
            });
            
            const canvas = document.createElement('canvas');
            canvas.width = clipImg.width || 100;
            canvas.height = clipImg.height || 100;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(clipImg, 0, 0);
              const pngDataUrl = canvas.toDataURL('image/png');
              
              // Add small clipart icon (15mm x 15mm) at right margin
              pdf.addImage(pngDataUrl, 'PNG', pageWidth - margin - 15, yPosition - 20, 15, 15);
            }
          } catch (clipError) {
            console.error('Error rendering clipart to PDF:', clipError);
          }
        }

        // Work area
        if (showAnswerLines) {
          pdf.setDrawColor(200);
          pdf.setLineWidth(0.2);
          for (let i = 0; i < 5; i++) {
            if (yPosition > pageHeight - 30) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.line(margin + 5, yPosition + (i * 8), pageWidth - margin, yPosition + (i * 8));
          }
          yPosition += 45;
        } else {
          yPosition += 15;
        }
      }

      // Formula Reference Sheet
      if (includeFormulaSheet) {
        const relevantFormulas = getFormulasForTopics(
          selectedQuestions.map(q => ({ category: q.category, topicName: q.topicName }))
        );

        if (relevantFormulas.length > 0) {
          pdf.addPage();
          yPosition = margin;

          // Formula sheet header
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0);
          pdf.text('Formula Reference Sheet', pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 12;

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(100);
          pdf.text('Based on selected topics', pageWidth / 2, yPosition, { align: 'center' });
          pdf.setTextColor(0);
          yPosition += 10;

          pdf.setLineWidth(0.5);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 8;

          // Render each formula category
          for (const category of relevantFormulas) {
            // Check if we need a new page
            if (yPosition > pageHeight - 60) {
              pdf.addPage();
              yPosition = margin;
            }

            // Category header
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(category.category, margin, yPosition);
            yPosition += 7;

            // Formulas in this category
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');

            for (const formula of category.formulas) {
              if (yPosition > pageHeight - 30) {
                pdf.addPage();
                yPosition = margin;
              }

              // Formula name and formula
              const formulaLine = `• ${formula.name}: ${formula.formula}`;
              const lines = pdf.splitTextToSize(formulaLine, contentWidth - 10);
              
              lines.forEach((line: string) => {
                pdf.text(line, margin + 5, yPosition);
                yPosition += 5;
              });

              // Description if present
              if (formula.description) {
                pdf.setFontSize(9);
                pdf.setTextColor(100);
                pdf.text(`  (${formula.description})`, margin + 10, yPosition);
                pdf.setTextColor(0);
                pdf.setFontSize(10);
                yPosition += 5;
              }

              yPosition += 2;
            }

            yPosition += 5;
          }
        }
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text('Generated with Scan Genius - NYS Regents Aligned', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Download
      pdf.save(`${worksheetTitle.replace(/\s+/g, '_')}.pdf`);

      toast({
        title: 'Worksheet downloaded!',
        description: `Your worksheet with ${compiledQuestions.length} question(s) has been saved.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate worksheet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (compiledQuestions.length === 0) {
      toast({
        title: 'No questions compiled',
        description: 'Please compile the worksheet first.',
        variant: 'destructive',
      });
      return;
    }
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'challenging': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAdvancementLevelColor = (level: AdvancementLevel) => {
    switch (level) {
      case 'A': return 'bg-green-100 text-green-800 border-green-300';
      case 'B': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'E': return 'bg-red-100 text-red-800 border-red-300';
      case 'F': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAdvancementLevelDescription = (level: AdvancementLevel) => {
    switch (level) {
      case 'A': return 'Advanced';
      case 'B': return 'Proficient';
      case 'C': return 'Developing';
      case 'D': return 'Beginning';
      case 'E': return 'Emerging';
      case 'F': return 'Foundational';
      default: return '';
    }
  };

  if (selectedQuestions.length === 0 && !isCompiled && !showSavedWorksheets) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-lg mb-2">Worksheet Builder</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            Select topics from the list to add them to your worksheet. Click the + button next to any topic.
          </p>
          {savedWorksheets.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowSavedWorksheets(true)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Load Saved ({savedWorksheets.length})
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showSavedWorksheets) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Saved Worksheets</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSavedWorksheets(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingWorksheets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedWorksheets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No saved worksheets yet.
            </p>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {savedWorksheets.map((worksheet) => (
                  <div
                    key={worksheet.id}
                    className="p-3 rounded-lg border hover:bg-muted/50 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{worksheet.title}</p>
                          {worksheet.is_shared && (
                            <Badge variant="outline" className="text-xs">
                              <Link className="h-3 w-3 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {worksheet.questions.length} questions • {new Date(worksheet.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadWorksheet(worksheet)}
                        >
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteWorksheet(worksheet.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Share controls */}
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <Button
                        variant={worksheet.is_shared ? "secondary" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => toggleShareWorksheet(worksheet)}
                        disabled={isSharing}
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        {worksheet.is_shared ? 'Unshare' : 'Share'}
                      </Button>
                      {worksheet.is_shared && worksheet.share_code && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => copyShareLink(worksheet.share_code!, worksheet.id)}
                        >
                          {copiedId === worksheet.id ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy Link
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Worksheet Builder</CardTitle>
            <Badge variant="secondary">
              {isCompiled ? `${compiledQuestions.length} questions` : `${selectedQuestions.length} topic(s)`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCompiled ? (
            <>
              {/* Worksheet Type Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">What are you building?</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={worksheetMode === 'practice' ? 'default' : 'outline'}
                    className={`h-auto py-3 flex flex-col items-center gap-1.5 ${
                      worksheetMode === 'practice' 
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setWorksheetMode('practice');
                      if (!hasUserEditedTitle) {
                        setWorksheetTitle(selectedQuestions.length > 0 ? selectedQuestions[0].topicName : 'Math Practice Worksheet');
                      }
                    }}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span className="font-semibold text-xs">Practice</span>
                    <span className="text-[10px] opacity-80 text-center leading-tight">Homework & classwork</span>
                  </Button>
                  <Button
                    type="button"
                    variant={worksheetMode === 'basic_assessment' ? 'default' : 'outline'}
                    className={`h-auto py-3 flex flex-col items-center gap-1.5 ${
                      worksheetMode === 'basic_assessment' 
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setWorksheetMode('basic_assessment');
                      if (!hasUserEditedTitle) {
                        setWorksheetTitle(selectedQuestions.length > 0 ? 'Assessment: ' + selectedQuestions[0].topicName : 'Math Assessment');
                      }
                    }}
                  >
                    <FileText className="h-5 w-5" />
                    <span className="font-semibold text-xs">Assessment</span>
                    <span className="text-[10px] opacity-80 text-center leading-tight">Quizzes & tests</span>
                  </Button>
                  <Button
                    type="button"
                    variant={worksheetMode === 'diagnostic' ? 'default' : 'outline'}
                    className={`h-auto py-3 flex flex-col items-center gap-1.5 ${
                      worksheetMode === 'diagnostic' 
                        ? 'bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-2' 
                        : 'hover:bg-muted border-purple-200'
                    }`}
                    onClick={() => {
                      setWorksheetMode('diagnostic');
                      if (!hasUserEditedTitle) {
                        setWorksheetTitle(selectedQuestions.length > 0 ? 'Diagnostic: ' + selectedQuestions[0].topicName : 'Diagnostic Assessment');
                      }
                    }}
                  >
                    <Sparkles className="h-5 w-5" />
                    <span className="font-semibold text-xs">Diagnostic</span>
                    <span className="text-[10px] opacity-80 text-center leading-tight">Levels A-F</span>
                  </Button>
                </div>
                
                {/* Diagnostic Mode Description */}
                {worksheetMode === 'diagnostic' && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-purple-900">Diagnostic Worksheet</p>
                        <p className="text-xs text-purple-700">
                          Questions are labeled with advancement levels A-F. Use student responses to generate 
                          differentiated follow-up worksheets tailored to each student's level.
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {['A', 'B', 'C', 'D', 'E', 'F'].map((level) => (
                            <Badge 
                              key={level} 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0 ${
                                level === 'A' ? 'bg-green-50 border-green-300 text-green-700' :
                                level === 'B' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                                level === 'C' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
                                level === 'D' ? 'bg-orange-50 border-orange-300 text-orange-700' :
                                level === 'E' ? 'bg-red-50 border-red-300 text-red-700' :
                                'bg-gray-50 border-gray-300 text-gray-700'
                              }`}
                            >
                              Level {level}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Configuration */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-sm">Worksheet Title</Label>
                  <Input
                    id="title"
                    value={worksheetTitle}
                    onChange={(e) => {
                      setWorksheetTitle(e.target.value);
                      setHasUserEditedTitle(true);
                    }}
                    placeholder="Enter worksheet title"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="teacher" className="text-sm">Teacher Name (optional)</Label>
                  <Input
                    id="teacher"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="questionCount" className="text-sm">Number of Questions</Label>
                  <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 questions</SelectItem>
                      <SelectItem value="5">5 questions</SelectItem>
                      <SelectItem value="8">8 questions</SelectItem>
                      <SelectItem value="10">10 questions</SelectItem>
                      <SelectItem value="15">15 questions</SelectItem>
                      <SelectItem value="20">20 questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Difficulty Levels</Label>
                  <div className="flex flex-wrap gap-2">
                    {['medium', 'hard', 'challenging'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleDifficulty(level)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                          difficultyFilter.includes(level)
                            ? level === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              : level === 'hard'
                              ? 'bg-orange-100 text-orange-800 border-orange-300'
                              : 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                  {difficultyFilter.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one difficulty level</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="answerLines"
                    checked={showAnswerLines}
                    onChange={(e) => setShowAnswerLines(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="answerLines" className="text-sm cursor-pointer">
                    Include answer lines
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeFormulas"
                    checked={includeFormulas}
                    onChange={(e) => setIncludeFormulas(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeFormulas" className="text-sm cursor-pointer">
                    Include mathematical formulas
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeFormulaSheet"
                    checked={includeFormulaSheet}
                    onChange={(e) => setIncludeFormulaSheet(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeFormulaSheet" className="text-sm cursor-pointer">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      Append formula reference sheet
                    </span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeGraphPaper"
                    checked={includeGraphPaper}
                    onChange={(e) => setIncludeGraphPaper(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeGraphPaper" className="text-sm cursor-pointer">
                    Include graph paper solutions
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeCoordinateGeometry"
                    checked={includeCoordinateGeometry}
                    onChange={(e) => setIncludeCoordinateGeometry(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeCoordinateGeometry" className="text-sm cursor-pointer">
                    Include coordinate geometry solutions
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useAIImages"
                    checked={useAIImages}
                    onChange={(e) => setUseAIImages(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="useAIImages" className="text-sm cursor-pointer">
                    <span className="flex flex-col">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        Include AI-generated geometric/scientific diagrams
                      </span>
                      <span className="text-xs text-muted-foreground ml-5">Generates images for shapes, graphs, and coordinate geometry</span>
                    </span>
                  </Label>
                </div>
                
                {/* Image Size Slider - shown when AI images are enabled */}
                {useAIImages && (
                  <div className="space-y-2 ml-5 pl-2 border-l-2 border-muted">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Diagram Size
                      </Label>
                      <span className="text-xs text-muted-foreground">{imageSize}px</span>
                    </div>
                    <Slider
                      value={[imageSize]}
                      onValueChange={(value) => setImageSize(value[0])}
                      min={100}
                      max={400}
                      step={25}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Small</span>
                      <span>Large</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Selected Topics */}
              <div className="space-y-2">
                <Label className="text-sm">Selected Topics</Label>
                <ScrollArea className="h-40 rounded-md border p-2">
                  {selectedQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded-md group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground w-5">{index + 1}.</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{question.topicName}</p>
                          <p className="text-xs text-muted-foreground">{question.standard}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => onRemoveQuestion(question.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Math Symbol Preview */}
              <MathSymbolPreview />

              {/* Compile Button */}
              <Button
                className="w-full"
                onClick={compileWorksheet}
                disabled={isCompiling || difficultyFilter.length === 0}
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Compile Worksheet
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={onClearAll}
              >
                Clear All
              </Button>
            </>
          ) : (
            <>
              {/* Compiled Questions Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Generated Questions</Label>
                  {hasQuestionsWithImagePrompts && (
                    <Badge variant={imagesGenerated ? "default" : "secondary"} className="text-xs">
                      {imagesGenerated 
                        ? `${compiledQuestions.filter(q => q.imageUrl).length} diagrams` 
                        : `${questionsNeedingImages.length} diagrams pending`}
                    </Badge>
                  )}
                </div>
                <ScrollArea className="h-64 rounded-md border p-2">
                  {compiledQuestions.map((question) => (
                    <div
                      key={question.questionNumber}
                      className="py-3 px-2 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-bold">{question.questionNumber}.</span>
                        {question.advancementLevel && worksheetMode === 'diagnostic' && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-semibold ${getAdvancementLevelColor(question.advancementLevel)}`}
                          >
                            Level {question.advancementLevel}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </Badge>
                        {question.imagePrompt && !question.imageUrl && (
                          <Badge variant="secondary" className="text-xs">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Diagram pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {question.topic} ({question.standard})
                      </p>
                      <p className="text-sm font-serif leading-relaxed">{renderMathText(question.question)}</p>
                      {question.imageUrl && (
                        <div className="mt-2 flex flex-col items-center gap-2">
                          <div className="relative group">
                            <img 
                              src={question.imageUrl} 
                              alt={`Diagram for question ${question.questionNumber}`}
                              className="border rounded"
                              style={{ maxWidth: `${imageSize}px`, maxHeight: `${imageSize}px` }}
                            />
                            {regeneratingQuestionNumber === question.questionNumber && (
                              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => regenerateSingleImage(question.questionNumber)}
                            disabled={regeneratingQuestionNumber !== null}
                          >
                            {regeneratingQuestionNumber === question.questionNumber ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Regenerate diagram
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      {!question.imageUrl && question.imagePrompt && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                          <span className="font-medium">Diagram description: </span>
                          {question.imagePrompt}
                        </div>
                      )}
                      {!question.imageUrl && question.svg && (
                        <div 
                          className="mt-2 flex justify-center"
                          dangerouslySetInnerHTML={{ __html: question.svg }}
                        />
                      )}
                      {/* Clipart Display */}
                      {question.clipartUrl && (
                        <div className="mt-2 flex flex-col items-start gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Palette className="h-3 w-3 mr-1" />
                              Clipart
                            </Badge>
                          </div>
                          <div className="relative group">
                            <img 
                              src={question.clipartUrl} 
                              alt={`Clipart for question ${question.questionNumber}`}
                              className="border rounded bg-white"
                              style={{ maxWidth: '60px', maxHeight: '60px' }}
                            />
                            {regeneratingQuestionNumber === question.questionNumber && (
                              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
                            onClick={() => regenerateClipart(question.questionNumber)}
                            disabled={regeneratingQuestionNumber !== null}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Generate Images Button - shown when there are questions with imagePrompt but no imageUrl */}
              {useAIImages && questionsNeedingImages.length > 0 && (
                <div className="space-y-3">
                  {isGeneratingImages && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{imageGenerationStatus}</span>
                        <span className="font-medium">{Math.round(imageGenerationProgress)}%</span>
                      </div>
                      <Progress value={imageGenerationProgress} className="h-2" />
                    </div>
                  )}
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={openPromptEditor}
                    disabled={isGeneratingImages}
                  >
                    {isGeneratingImages ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Diagrams...
                      </>
                    ) : (
                      <>
                        <Pencil className="h-4 w-4 mr-2" />
                        Review & Generate {questionsNeedingImages.length} Diagram{questionsNeedingImages.length > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Add Clipart Button - Only show for non-geometry/trig subjects */}
              {!isGeometryOrTrigSubject && !clipartGenerated && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setShowClipartDialog(true)}
                  disabled={isGeneratingClipart}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Add Fun Clipart to Questions
                </Button>
              )}

              {!isGeometryOrTrigSubject && clipartGenerated && (
                <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 text-sm">
                    <Palette className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">
                      {compiledQuestions.filter(q => q.clipartUrl).length} clipart added
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={generateClipart}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Regenerate
                  </Button>
                </div>
              )}

              {/* Download/Print/Save Actions */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={generatePDF}
                  disabled={isGenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Download PDF'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={saveWorksheet}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Worksheet
                </Button>
                {savedWorksheets.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSavedWorksheets(true)}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Diagnostic: Record Results Note */}
              {worksheetMode === 'diagnostic' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <ClipboardList className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-purple-900">Diagnostic Worksheet</p>
                      <p className="text-xs text-purple-700">
                        After students complete this worksheet, record their results in the 
                        "Differentiated Worksheets" tool to generate personalized follow-up worksheets.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={resetCompilation}
              >
                Edit Topics
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Print Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto print:static print:overflow-visible">
          <div className="print:hidden p-4 bg-muted border-b flex items-center justify-between">
            <p>Print preview - press Ctrl+P or Cmd+P to print</p>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </div>
          <div ref={printRef} className="p-8 max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">{worksheetTitle}</h1>
              {teacherName && <p className="text-muted-foreground mt-1">Teacher: {teacherName}</p>}
            </div>
            <div className="flex justify-between text-sm mb-6 border-b pb-4">
              <span>Name: _______________________</span>
              <span>Date: ___________</span>
              <span>Period: _____</span>
            </div>
            <div className="space-y-8">
              {compiledQuestions.map((question) => (
                <div key={question.questionNumber} className="space-y-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-bold">{question.questionNumber}.</span>
                    {worksheetMode === 'diagnostic' && question.advancementLevel && (
                      <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${
                        question.advancementLevel === 'A' ? 'bg-green-100 text-green-800 border-green-300' :
                        question.advancementLevel === 'B' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        question.advancementLevel === 'C' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        question.advancementLevel === 'D' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                        question.advancementLevel === 'E' ? 'bg-red-100 text-red-800 border-red-300' :
                        'bg-gray-100 text-gray-800 border-gray-300'
                      }`}>
                        Level {question.advancementLevel}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded border bg-muted">
                      {question.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-5">
                    {question.topic} ({question.standard})
                  </p>
                  <p className="ml-5 font-serif leading-relaxed text-base">{renderMathText(question.question)}</p>
                  {question.svg && (
                    <div 
                      className="ml-5 mt-2 flex justify-center"
                      dangerouslySetInnerHTML={{ __html: question.svg }}
                    />
                  )}
                  {showAnswerLines && (
                    <div className="ml-5 mt-4 space-y-3">
                      {[1, 2, 3, 4, 5].map((line) => (
                        <div key={line} className="border-b border-gray-300" style={{ height: '24px' }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Formula Reference Sheet in Print Preview */}
            {includeFormulaSheet && (() => {
              const relevantFormulas = getFormulasForTopics(
                selectedQuestions.map(q => ({ category: q.category, topicName: q.topicName }))
              );
              
              if (relevantFormulas.length === 0) return null;
              
              return (
                <div className="mt-12 pt-8 border-t-2 border-dashed page-break-before">
                  <h2 className="text-xl font-bold text-center mb-2">Formula Reference Sheet</h2>
                  <p className="text-center text-sm text-muted-foreground mb-6">Based on selected topics</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {relevantFormulas.map((category) => (
                      <div key={category.category} className="space-y-2">
                        <h3 className="font-semibold text-sm border-b pb-1">{category.category}</h3>
                        <ul className="space-y-1 text-sm">
                          {category.formulas.map((formula, idx) => (
                            <li key={idx} className="flex flex-col">
                              <span>
                                <span className="font-medium">{formula.name}:</span>{' '}
                                <span className="font-mono text-xs">{formula.formula}</span>
                              </span>
                              {formula.description && (
                                <span className="text-xs text-muted-foreground ml-4">({formula.description})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mt-12 text-center text-xs text-muted-foreground">
              Generated with Scan Genius - NYS Regents Aligned
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-worksheet, .print-worksheet * {
            visibility: visible;
          }
          @page {
            margin: 0.75in;
          }
        }
      `}</style>

      {/* Prompt Editor Dialog */}
      <Dialog open={showPromptEditor} onOpenChange={setShowPromptEditor}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Review & Edit Diagram Prompts
            </DialogTitle>
            <DialogDescription>
              Review and edit the AI prompts for each diagram before generating. Better prompts lead to more accurate diagrams.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {editablePrompts.map((item, index) => {
                const question = compiledQuestions.find(q => q.questionNumber === item.questionNumber);
                return (
                  <div key={item.questionNumber} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Question {item.questionNumber}
                      </Badge>
                      {question && (
                        <span className="text-xs text-muted-foreground">
                          {question.topic}
                        </span>
                      )}
                    </div>
                    {question && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {question.question}
                      </p>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor={`prompt-${item.questionNumber}`} className="text-xs font-medium">
                        Diagram Description
                      </Label>
                      <Textarea
                        id={`prompt-${item.questionNumber}`}
                        value={item.prompt}
                        onChange={(e) => updateEditablePrompt(item.questionNumber, e.target.value)}
                        className="min-h-[80px] text-sm"
                        placeholder="Describe what the diagram should show..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPromptEditor(false)}>
              Cancel
            </Button>
            <Button onClick={generateImagesWithEditedPrompts} disabled={editablePrompts.length === 0}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Generate {editablePrompts.length} Diagram{editablePrompts.length > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clipart Generation Dialog */}
      <Dialog open={showClipartDialog} onOpenChange={setShowClipartDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Add Fun Clipart?
            </DialogTitle>
            <DialogDescription>
              Would you like to add AI-generated clipart images to make your worksheet more engaging? Each question will get a themed clipart icon based on its topic.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Palette className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Themed Clipart Icons</p>
                <p className="text-xs text-muted-foreground">
                  Simple, fun line art images that match each question's topic to help students engage with the material.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This will generate {compiledQuestions.length} clipart image{compiledQuestions.length > 1 ? 's' : ''} and may take a moment.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClipartDialog(false)}>
              Skip for Now
            </Button>
            <Button onClick={generateClipart}>
              <Palette className="h-4 w-4 mr-2" />
              Generate Clipart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clipart Generation Progress */}
      {isGeneratingClipart && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Generating Clipart</p>
                  <p className="text-sm text-muted-foreground">{clipartStatus}</p>
                </div>
              </div>
              <Progress value={clipartProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {Math.round(clipartProgress)}% complete
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
