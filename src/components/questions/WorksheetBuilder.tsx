import { useState, useRef, useEffect } from 'react';
import { Download, Printer, FileText, X, Sparkles, Loader2, Save, FolderOpen, Trash2, Share2, Copy, Check, Link, BookOpen, ImageIcon, Pencil, RefreshCw, Palette, ClipboardList, AlertTriangle, Eye, ZoomIn, ZoomOut, Send, Coins, Trophy, PenTool, Library, Clock, NotebookPen } from 'lucide-react';
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { handleApiError, checkResponseForApiError } from '@/lib/apiErrorHandler';
import { renderMathText, sanitizeForPDF, fixEncodingCorruption } from '@/lib/mathRenderer';
import { MathSymbolPreview } from './MathSymbolPreview';
import { CanvasDrawingTool } from './CanvasDrawingTool';
import { AIImageReviewDialog } from './AIImageReviewDialog';
import { ImageLibraryPicker } from './ImageLibraryPicker';
import { useAIImageLibrary } from '@/hooks/useAIImageLibrary';
import jsPDF from 'jspdf';
import { getFormulasForTopics, type FormulaCategory } from '@/data/formulaReference';
import { ScrapPaperGenerator } from '@/components/print/ScrapPaperGenerator';
// Shared assignments are now saved directly to database - no need for usePushToSisterApp

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

// Bloom's Taxonomy Cognitive Levels
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  answer?: string; // The correct answer for teacher's answer key
  difficulty: 'medium' | 'hard' | 'challenging';
  bloomLevel?: BloomLevel;
  bloomVerb?: string;
  advancementLevel?: AdvancementLevel; // For diagnostic worksheets
  svg?: string;
  imageUrl?: string;
  imagePrompt?: string;
  clipartUrl?: string;
}

// Bloom's Taxonomy level display helpers
const BLOOM_LEVELS: { level: BloomLevel; label: string; color: string; description: string }[] = [
  { level: 'remember', label: 'Remember', color: 'bg-slate-500', description: 'Recall facts and basic concepts' },
  { level: 'understand', label: 'Understand', color: 'bg-blue-500', description: 'Explain ideas or concepts' },
  { level: 'apply', label: 'Apply', color: 'bg-green-500', description: 'Use information in new situations' },
  { level: 'analyze', label: 'Analyze', color: 'bg-yellow-500', description: 'Draw connections among ideas' },
  { level: 'evaluate', label: 'Evaluate', color: 'bg-orange-500', description: 'Justify decisions or actions' },
  { level: 'create', label: 'Create', color: 'bg-red-500', description: 'Produce new or original work' },
];

const getBloomInfo = (level?: BloomLevel) => {
  return BLOOM_LEVELS.find(b => b.level === level) || BLOOM_LEVELS[2]; // Default to 'apply'
};

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
    includeAnswerKey?: boolean;
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
  const [bloomFilter, setBloomFilter] = useState<BloomLevel[]>(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);
  const [includeFormulas, setIncludeFormulas] = useState(false);
  const [includeFormulaSheet, setIncludeFormulaSheet] = useState(false);
  const [includeGraphPaper, setIncludeGraphPaper] = useState(false);
  const [includeCoordinateGeometry, setIncludeCoordinateGeometry] = useState(false);
  const [useAIImages, setUseAIImages] = useState(false);
  const [useNanoBanana, setUseNanoBanana] = useState(false); // Use Nano Banana for realistic shape images
  const [imageSize, setImageSize] = useState(200); // Image size in pixels (100-400)
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false); // Include answer key for teachers
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledQuestions, setCompiledQuestions] = useState<GeneratedQuestion[]>([]);
  const [isCompiled, setIsCompiled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);
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
  const [clipartSize, setClipartSize] = useState(15); // Clipart size in mm (10-40)
  
  // Lightbox state for full-screen image viewing
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxQuestionNumber, setLightboxQuestionNumber] = useState<number | null>(null);
  
  // Canvas drawing tool state
  const [showDrawingTool, setShowDrawingTool] = useState(false);
  const [drawingQuestionNumber, setDrawingQuestionNumber] = useState<number | null>(null);
  
  // Push to NYCLogic AI state
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushXpReward, setPushXpReward] = useState(50);
  const [pushCoinReward, setPushCoinReward] = useState(25);
  const [pushDueDate, setPushDueDate] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  // Push button now uses direct database insert - no hook needed
  
  // AI Image Review state
  const [showImageReviewDialog, setShowImageReviewDialog] = useState(false);
  const [imageSelectionQuestionNumber, setImageSelectionQuestionNumber] = useState<number | null>(null);
  const { pendingCount, saveImageForReview, approvedImages } = useAIImageLibrary();
  
  // Scrap Paper Generator state
  const [showScrapPaperGenerator, setShowScrapPaperGenerator] = useState(false);
  
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

  const toggleBloomLevel = (level: BloomLevel) => {
    setBloomFilter(prev => 
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
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
          includeAnswerKey,
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
    setIncludeAnswerKey(worksheet.settings.includeAnswerKey ?? false);
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
          bloomLevels: bloomFilter,
          includeGeometry: useAIImages,
          includeFormulas,
          includeGraphPaper,
          includeCoordinateGeometry,
          useAIImages,
          useNanoBanana,
          worksheetMode,
          includeAnswerKey,
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
          useNanoBanana,
        },
      });

      if (error) throw error;

      if (data.results) {
        // Update questions with generated images and save for review
        const finalQuestions = [...updatedQuestions];
        let successCount = 0;
        
        for (const result of data.results) {
          const questionIndex = finalQuestions.findIndex(q => q.questionNumber === result.questionNumber);
          if (questionIndex !== -1 && result.imageUrl) {
            const question = finalQuestions[questionIndex];
            
            // Save image to library for teacher review
            await saveImageForReview(result.imageUrl, question.imagePrompt || '', {
              subject: selectedQuestions[0]?.subject || 'math',
              topic: question.topic,
              source: 'worksheet',
            });
            
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
          title: 'Diagrams generated & saved for review!',
          description: `${successCount} images created. Review them in your Image Library before using on worksheets.`,
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
          useNanoBanana,
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

  // Handle saving custom drawing to a question
  const handleSaveDrawing = (dataUrl: string, questionNumber?: number) => {
    if (questionNumber) {
      const updatedQuestions = compiledQuestions.map(q =>
        q.questionNumber === questionNumber
          ? { ...q, imageUrl: dataUrl }
          : q
      );
      setCompiledQuestions(updatedQuestions);
      toast({
        title: 'Drawing added!',
        description: `Custom shape added to question ${questionNumber}.`,
      });
    }
    setShowDrawingTool(false);
    setDrawingQuestionNumber(null);
  };

  // State for regenerating question text
  const [regeneratingQuestionTextNumber, setRegeneratingQuestionTextNumber] = useState<number | null>(null);
  
  // State for tracking recently corrected symbols per question
  const [correctedSymbols, setCorrectedSymbols] = useState<Record<number, string[]>>({});

  // Helper to detect encoding issues in question text BEFORE regeneration
  const detectEncodingIssues = (text: string): { hasIssues: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    // Common UTF-8 mojibake patterns that indicate encoding corruption
    const corruptionPatterns: { pattern: RegExp; description: string }[] = [
      { pattern: /Â(?=[πθ°²³√≤≥≠±×÷∠△½¼¾⊥∥≅])/g, description: 'Â before symbol' },
      { pattern: /Â(?=\d)/g, description: 'Â before number (likely π)' },
      { pattern: /(\d)Â\s/g, description: 'number + Â (likely π)' },
      { pattern: /Â°/g, description: 'corrupted degree symbol' },
      { pattern: /Â²/g, description: 'corrupted squared' },
      { pattern: /Â³/g, description: 'corrupted cubed' },
      { pattern: /Â½/g, description: 'corrupted ½' },
      { pattern: /Â¼/g, description: 'corrupted ¼' },
      { pattern: /Â¾/g, description: 'corrupted ¾' },
      { pattern: /Â±/g, description: 'corrupted ±' },
      { pattern: /â‰¤/g, description: 'corrupted ≤' },
      { pattern: /â‰¥/g, description: 'corrupted ≥' },
      { pattern: /â‰ /g, description: 'corrupted ≠' },
      { pattern: /âˆš/g, description: 'corrupted √' },
      { pattern: /Ï€/g, description: 'corrupted π' },
      { pattern: /Î¸/g, description: 'corrupted θ' },
      { pattern: /Î±/g, description: 'corrupted α' },
      { pattern: /Î²/g, description: 'corrupted β' },
      { pattern: /â†'/g, description: 'corrupted →' },
      { pattern: /âˆž/g, description: 'corrupted ∞' },
      // Generic Â not followed by expected characters (likely corruption)
      { pattern: /Â(?!\s|$)/g, description: 'stray Â character' },
    ];

    for (const { pattern, description } of corruptionPatterns) {
      if (pattern.test(text)) {
        issues.push(description);
      }
    }

    return { hasIssues: issues.length > 0, issues: [...new Set(issues)] }; // Dedupe
  };

  // Helper to detect math symbols that were fixed
  const detectCorrectedSymbols = (oldText: string, newText: string): string[] => {
    const mathSymbolPatterns: { pattern: RegExp; name: string }[] = [
      { pattern: /π/g, name: 'π (pi)' },
      { pattern: /°/g, name: '° (degrees)' },
      { pattern: /²/g, name: '² (squared)' },
      { pattern: /³/g, name: '³ (cubed)' },
      { pattern: /√/g, name: '√ (square root)' },
      { pattern: /≤/g, name: '≤ (less than or equal)' },
      { pattern: /≥/g, name: '≥ (greater than or equal)' },
      { pattern: /≠/g, name: '≠ (not equal)' },
      { pattern: /±/g, name: '± (plus/minus)' },
      { pattern: /×/g, name: '× (times)' },
      { pattern: /÷/g, name: '÷ (divide)' },
      { pattern: /θ/g, name: 'θ (theta)' },
      { pattern: /∠/g, name: '∠ (angle)' },
      { pattern: /△/g, name: '△ (triangle)' },
      { pattern: /½/g, name: '½ (one half)' },
      { pattern: /¼/g, name: '¼ (one quarter)' },
      { pattern: /¾/g, name: '¾ (three quarters)' },
      { pattern: /⊥/g, name: '⊥ (perpendicular)' },
      { pattern: /∥/g, name: '∥ (parallel)' },
      { pattern: /≅/g, name: '≅ (congruent)' },
    ];

    const corrected: string[] = [];
    
    // Check for symbols that appear in new text but were corrupted in old text
    for (const { pattern, name } of mathSymbolPatterns) {
      const newMatches = (newText.match(pattern) || []).length;
      const oldMatches = (oldText.match(pattern) || []).length;
      
      // If new text has more of this symbol, it was likely fixed
      if (newMatches > oldMatches) {
        corrected.push(name);
      }
    }
    
    // Also check for common corruption patterns that were fixed
    const corruptionPatterns = [
      { old: /Â/g, name: 'encoding errors' },
      { old: /â€/g, name: 'character corruption' },
    ];
    
    for (const { old, name } of corruptionPatterns) {
      if (old.test(oldText) && !old.test(newText)) {
        corrected.push(name);
      }
    }

    return corrected;
  };

  // Regenerate the text of a single question (to fix formatting issues like π rendering)
  const regenerateQuestionText = async (questionNumber: number) => {
    const question = compiledQuestions.find(q => q.questionNumber === questionNumber);
    if (!question) return;

    const oldQuestionText = question.question;
    setRegeneratingQuestionTextNumber(questionNumber);

    try {
      const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: [{
            topicName: question.topic,
            standard: question.standard,
            subject: selectedQuestions[0]?.subject || 'Math',
            category: selectedQuestions[0]?.category || 'General',
          }],
          questionCount: 1,
          difficultyLevels: [question.difficulty],
          bloomLevels: question.bloomLevel ? [question.bloomLevel] : ['apply'],
          includeGeometry: !!question.imagePrompt,
          includeFormulas,
          includeGraphPaper,
          includeCoordinateGeometry,
          useAIImages,
          worksheetMode,
        },
      });

      if (error) throw error;

      if (data.questions && data.questions[0]) {
        const newQuestion = data.questions[0];
        const updatedQuestions = compiledQuestions.map(q =>
          q.questionNumber === questionNumber
            ? { 
                ...q, 
                question: newQuestion.question,
                bloomLevel: newQuestion.bloomLevel || q.bloomLevel,
                bloomVerb: newQuestion.bloomVerb || q.bloomVerb,
                imagePrompt: newQuestion.imagePrompt || q.imagePrompt,
              }
            : q
        );
        setCompiledQuestions(updatedQuestions);
        
        // Detect which symbols were corrected
        const detected = detectCorrectedSymbols(oldQuestionText, newQuestion.question);
        
        if (detected.length > 0) {
          // Store corrected symbols for visual display
          setCorrectedSymbols(prev => ({ ...prev, [questionNumber]: detected }));
          
          // Clear the indicator after 5 seconds
          setTimeout(() => {
            setCorrectedSymbols(prev => {
              const newState = { ...prev };
              delete newState[questionNumber];
              return newState;
            });
          }, 5000);
          
          toast({
            title: '✓ Symbols corrected!',
            description: `Fixed: ${detected.join(', ')}`,
          });
        } else {
          toast({
            title: 'Question regenerated!',
            description: `New question text created for question ${questionNumber}.`,
          });
        }
      } else {
        throw new Error('No question returned');
      }
    } catch (error) {
      console.error('Error regenerating question:', error);
      handleApiError(error, 'Question regeneration');
    } finally {
      setRegeneratingQuestionTextNumber(null);
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
      const margin = 20; // Standard margin for better readability
      const contentWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(sanitizeForPDF(worksheetTitle), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      if (teacherName) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(sanitizeForPDF(`Teacher: ${teacherName}`), pageWidth / 2, yPosition, { align: 'center' });
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

        // Question number, Bloom's level, advancement level (for diagnostic), and difficulty badge
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        const difficultyText = question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
        const bloomLabel = question.bloomLevel 
          ? question.bloomLevel.charAt(0).toUpperCase() + question.bloomLevel.slice(1)
          : '';
        
        let headerParts: string[] = [`${question.questionNumber}.`];
        if (bloomLabel) {
          headerParts.push(`[${bloomLabel}${question.bloomVerb ? `: ${question.bloomVerb}` : ''}]`);
        }
        if (worksheetMode === 'diagnostic' && question.advancementLevel) {
          headerParts.push(`[Level ${question.advancementLevel}]`);
        }
        headerParts.push(`[${difficultyText}]`);
        
        pdf.text(headerParts.join(' '), margin, yPosition);
        yPosition += 6;

        // Topic and standard reference
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(sanitizeForPDF(`${question.topic} (${question.standard})`), margin + 5, yPosition);
        pdf.setTextColor(0);
        yPosition += 8;

        // Question text - wrap long text, sanitize for PDF to fix encoding issues
        pdf.setFontSize(11);
        const sanitizedQuestion = sanitizeForPDF(renderMathText(fixEncodingCorruption(question.question)));
        const lines = pdf.splitTextToSize(sanitizedQuestion, contentWidth - 10);
        
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

        // Render clipart if present (scalable icon next to question number)
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
              
              // Add clipart icon with user-configured size at right margin
              const clipartSizeMm = clipartSize;
              pdf.addImage(pngDataUrl, 'PNG', pageWidth - margin - clipartSizeMm, yPosition - (clipartSizeMm * 0.75), clipartSizeMm, clipartSizeMm);
            }
          } catch (clipError) {
            console.error('Error rendering clipart to PDF:', clipError);
          }
        }

        // AI-Optimized Work Area with bounded zones
        if (showAnswerLines) {
          // Check if we have enough space for the work area box (needs ~70mm)
          if (yPosition > pageHeight - 75) {
            pdf.addPage();
            yPosition = margin;
          }
          
          const boxMarginLeft = margin + 5;
          const boxWidth = contentWidth - 5;
          const workAreaHeight = 35; // mm for work area
          const answerAreaHeight = 12; // mm for answer box
          const totalBoxHeight = workAreaHeight + answerAreaHeight + 10;
          
          // Main container border (navy blue)
          pdf.setDrawColor(30, 58, 95); // #1e3a5f
          pdf.setLineWidth(0.8);
          pdf.rect(boxMarginLeft, yPosition, boxWidth, totalBoxHeight);
          
          // Work Area Section background
          pdf.setFillColor(248, 250, 252); // #f8fafc light gray
          pdf.rect(boxMarginLeft, yPosition, boxWidth, workAreaHeight + 8, 'F');
          
          // Work Area label
          pdf.setFillColor(224, 242, 254); // #e0f2fe light blue
          pdf.roundedRect(boxMarginLeft + 3, yPosition + 2, 32, 5, 1, 1, 'F');
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(30, 58, 95);
          pdf.text(`WORK AREA Q${question.questionNumber}`, boxMarginLeft + 5, yPosition + 5.5);
          
          // Instructions text
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(100, 116, 139); // #64748b
          pdf.text('Show all calculations & reasoning here', boxMarginLeft + boxWidth - 45, yPosition + 5.5);
          
          // Dashed separator line between work and answer areas
          pdf.setDrawColor(148, 163, 184); // #94a3b8
          pdf.setLineWidth(0.3);
          pdf.setLineDashPattern([2, 2], 0);
          pdf.line(boxMarginLeft, yPosition + workAreaHeight + 7, boxMarginLeft + boxWidth, yPosition + workAreaHeight + 7);
          pdf.setLineDashPattern([], 0); // Reset dash pattern
          
          // Work area lines
          pdf.setDrawColor(203, 213, 225); // #cbd5e1
          pdf.setLineWidth(0.15);
          for (let i = 0; i < 4; i++) {
            pdf.line(boxMarginLeft + 3, yPosition + 10 + (i * 7), boxMarginLeft + boxWidth - 3, yPosition + 10 + (i * 7));
          }
          
          // Corner markers for AI zone detection
          pdf.setDrawColor(30, 58, 95);
          pdf.setLineWidth(0.5);
          // Top-left corner
          pdf.line(boxMarginLeft + 2, yPosition + 8, boxMarginLeft + 2, yPosition + 12);
          pdf.line(boxMarginLeft + 2, yPosition + 8, boxMarginLeft + 6, yPosition + 8);
          // Top-right corner  
          pdf.line(boxMarginLeft + boxWidth - 2, yPosition + 8, boxMarginLeft + boxWidth - 2, yPosition + 12);
          pdf.line(boxMarginLeft + boxWidth - 2, yPosition + 8, boxMarginLeft + boxWidth - 6, yPosition + 8);
          
          // Final Answer Section background (yellow/amber)
          pdf.setFillColor(254, 243, 199); // #fef3c7
          pdf.rect(boxMarginLeft, yPosition + workAreaHeight + 8, boxWidth, answerAreaHeight, 'F');
          
          // Answer section top border (amber)
          pdf.setDrawColor(245, 158, 11); // #f59e0b
          pdf.setLineWidth(0.5);
          pdf.line(boxMarginLeft, yPosition + workAreaHeight + 8, boxMarginLeft + boxWidth, yPosition + workAreaHeight + 8);
          
          // Final Answer label
          pdf.setFillColor(253, 230, 138); // #fde68a
          pdf.roundedRect(boxMarginLeft + 3, yPosition + workAreaHeight + 10, 22, 5, 1, 1, 'F');
          pdf.setDrawColor(245, 158, 11);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(boxMarginLeft + 3, yPosition + workAreaHeight + 10, 22, 5, 1, 1, 'S');
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(146, 64, 14); // #92400e
          pdf.text('FINAL ANSWER', boxMarginLeft + 5, yPosition + workAreaHeight + 13.5);
          
          // Answer line
          pdf.setDrawColor(217, 119, 6); // #d97706
          pdf.setLineWidth(0.4);
          pdf.line(boxMarginLeft + 28, yPosition + workAreaHeight + 15, boxMarginLeft + boxWidth - 5, yPosition + workAreaHeight + 15);
          
          pdf.setTextColor(0); // Reset text color
          yPosition += totalBoxHeight + 8;
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
            pdf.text(sanitizeForPDF(category.category), margin, yPosition);
            yPosition += 7;

            // Formulas in this category
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');

            for (const formula of category.formulas) {
              if (yPosition > pageHeight - 30) {
                pdf.addPage();
                yPosition = margin;
              }

              // Formula name and formula - sanitize for PDF
              const formulaLine = sanitizeForPDF(`• ${formula.name}: ${formula.formula}`);
              const lines = pdf.splitTextToSize(formulaLine, contentWidth - 10);
              
              lines.forEach((line: string) => {
                pdf.text(line, margin + 5, yPosition);
                yPosition += 5;
              });

              // Description if present
              if (formula.description) {
                pdf.setFontSize(9);
                pdf.setTextColor(100);
                pdf.text(sanitizeForPDF(`  (${formula.description})`), margin + 10, yPosition);
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

      // Answer Key Section (for teachers)
      if (includeAnswerKey && compiledQuestions.some(q => q.answer)) {
        pdf.addPage();
        yPosition = margin;

        // Answer key header
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0);
        pdf.text('ANSWER KEY', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(sanitizeForPDF(worksheetTitle), pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(100);
        pdf.text('FOR TEACHER USE ONLY', pageWidth / 2, yPosition, { align: 'center' });
        pdf.setTextColor(0);
        yPosition += 10;

        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;

        // Render each answer
        for (const question of compiledQuestions) {
          if (!question.answer) continue;

          // Check if we need a new page
          if (yPosition > pageHeight - 50) {
            pdf.addPage();
            yPosition = margin;
          }

          // Question number and brief question text
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Question ${question.questionNumber}:`, margin, yPosition);
          yPosition += 6;

          // Topic reference
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(100);
          pdf.text(sanitizeForPDF(`${question.topic} (${question.standard})`), margin + 5, yPosition);
          pdf.setTextColor(0);
          yPosition += 7;

          // Answer
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          const answerLines = pdf.splitTextToSize(sanitizeForPDF(`Answer: ${question.answer}`), contentWidth - 10);
          
          answerLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 5, yPosition);
            yPosition += 5;
          });

          yPosition += 8;
          
          // Separator line
          pdf.setDrawColor(200);
          pdf.setLineWidth(0.2);
          pdf.line(margin + 5, yPosition - 3, pageWidth - margin - 5, yPosition - 3);
        }
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text('Generated with NYCLogic Ai - NYS Regents Aligned', pageWidth / 2, pageHeight - 10, { align: 'center' });

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
    window.print();
  };

  const handlePreview = () => {
    if (compiledQuestions.length === 0) {
      toast({
        title: 'No questions compiled',
        description: 'Please compile the worksheet first.',
        variant: 'destructive',
      });
      return;
    }
    setShowPreview(true);
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
                
                {/* Bloom's Taxonomy Filter */}
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    Bloom's Taxonomy Levels
                    <Badge variant="outline" className="text-[10px] font-normal">Cognitive</Badge>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOOM_LEVELS.map((bloom) => (
                      <button
                        key={bloom.level}
                        type="button"
                        onClick={() => toggleBloomLevel(bloom.level)}
                        title={bloom.description}
                        className={`px-2 py-1 text-xs font-medium rounded-full border transition-colors ${
                          bloomFilter.includes(bloom.level)
                            ? `${bloom.color} text-white border-transparent`
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                        }`}
                      >
                        {bloom.label}
                      </button>
                    ))}
                  </div>
                  {bloomFilter.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one cognitive level</p>
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
                  <div className="space-y-3 ml-5 pl-2 border-l-2 border-muted">
                    {/* Nano Banana Option */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="useNanoBanana"
                        checked={useNanoBanana}
                        onChange={(e) => setUseNanoBanana(e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor="useNanoBanana" className="text-sm cursor-pointer">
                        <span className="flex flex-col">
                          <span className="flex items-center gap-1">
                            <Palette className="h-3.5 w-3.5 text-primary" />
                            Use Nano Banana for realistic shapes
                          </span>
                          <span className="text-xs text-muted-foreground ml-5">Generates high-quality images using advanced AI model</span>
                        </span>
                      </Label>
                    </div>
                    
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
                    
                    {/* Image Library & Review Button */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowImageReviewDialog(true)}
                        className="flex-1 text-xs"
                      >
                        <Library className="h-3.5 w-3.5 mr-1" />
                        Image Library
                        {pendingCount > 0 && (
                          <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                            {pendingCount}
                          </Badge>
                        )}
                      </Button>
                    </div>
                    {pendingCount > 0 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {pendingCount} image{pendingCount > 1 ? 's' : ''} pending review
                      </p>
                    )}
                  </div>
                )}
                
                {/* Answer Key Option */}
                <div className="flex items-center gap-2 pt-2 border-t border-dashed">
                  <input
                    type="checkbox"
                    id="includeAnswerKey"
                    checked={includeAnswerKey}
                    onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeAnswerKey" className="text-sm cursor-pointer">
                    <span className="flex flex-col">
                      <span className="flex items-center gap-1">
                        <ClipboardList className="h-3.5 w-3.5 text-green-600" />
                        Include answer key (for teacher)
                      </span>
                      <span className="text-xs text-muted-foreground ml-5">Generates a separate answer key page with solutions</span>
                    </span>
                  </Label>
                </div>
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
              {/* Bloom's Taxonomy Distribution Summary */}
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Bloom's Taxonomy Distribution</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {BLOOM_LEVELS.map(bloom => {
                    const count = compiledQuestions.filter(q => q.bloomLevel === bloom.level).length;
                    if (count === 0) return null;
                    return (
                      <Badge 
                        key={bloom.level} 
                        className={`text-xs text-white ${bloom.color}`}
                        title={bloom.description}
                      >
                        {bloom.label}: {count}
                      </Badge>
                    );
                  })}
                </div>
              </div>

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
                        {/* Bloom's Taxonomy Level Badge */}
                        {question.bloomLevel && (
                          <Badge 
                            className={`text-xs text-white ${getBloomInfo(question.bloomLevel).color}`}
                            title={getBloomInfo(question.bloomLevel).description}
                          >
                            {getBloomInfo(question.bloomLevel).label}
                            {question.bloomVerb && (
                              <span className="ml-1 opacity-80">• {question.bloomVerb}</span>
                            )}
                          </Badge>
                        )}
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
                        {question.imageUrl && (
                          <HoverCard openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <Badge variant="default" className="text-xs cursor-pointer bg-primary/90 hover:bg-primary">
                                <ImageIcon className="h-3 w-3 mr-1" />
                                Diagram
                              </Badge>
                            </HoverCardTrigger>
                            <HoverCardContent side="right" className="w-auto p-2">
                              <div className="flex flex-col items-center gap-2">
                                <p className="text-xs font-medium text-muted-foreground">Click to enlarge</p>
                                <img 
                                  src={question.imageUrl} 
                                  alt={`Preview for question ${question.questionNumber}`}
                                  className="border rounded max-w-[200px] max-h-[200px] object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    setLightboxImageUrl(question.imageUrl!);
                                    setLightboxQuestionNumber(question.questionNumber);
                                  }}
                                />
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        )}
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
                      <div className="flex items-start gap-2">
                        <div className="flex-1 relative">
                          <p className="text-sm font-serif leading-relaxed">{renderMathText(fixEncodingCorruption(question.question))}</p>
                          {regeneratingQuestionTextNumber === question.questionNumber && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => regenerateQuestionText(question.questionNumber)}
                          disabled={regeneratingQuestionTextNumber !== null || regeneratingQuestionNumber !== null}
                          title="Regenerate question (fixes formatting issues like π symbols)"
                        >
                          {regeneratingQuestionTextNumber === question.questionNumber ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {/* Encoding issues warning indicator */}
                      {(() => {
                        const encodingCheck = detectEncodingIssues(question.question);
                        if (encodingCheck.hasIssues && !correctedSymbols[question.questionNumber]) {
                          return (
                            <div className="mt-1.5 flex items-center gap-1.5 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                                  Possible encoding issue detected
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
                                  Click regenerate (↻) to fix: {encodingCheck.issues.slice(0, 2).join(', ')}
                                  {encodingCheck.issues.length > 2 && ` +${encodingCheck.issues.length - 2} more`}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {/* Corrected symbols indicator */}
                      {correctedSymbols[question.questionNumber] && correctedSymbols[question.questionNumber].length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs gap-1">
                            <Check className="h-3 w-3" />
                            Symbols fixed
                          </Badge>
                          <div className="flex flex-wrap gap-1">
                            {correctedSymbols[question.questionNumber].map((symbol, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline" 
                                className="text-xs border-green-500/50 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
                              >
                                {symbol}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
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
              {/* Draw Custom Shape Button */}
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  setDrawingQuestionNumber(compiledQuestions[0]?.questionNumber || 1);
                  setShowDrawingTool(true);
                }}
              >
                <PenTool className="h-4 w-4 mr-2" />
                Draw Custom Shape
              </Button>

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
                <div className="space-y-3">
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
                  {/* Clipart Size Slider */}
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Palette className="h-3.5 w-3.5" />
                        Clipart Size
                      </Label>
                      <span className="text-xs text-muted-foreground font-medium">{clipartSize}mm</span>
                    </div>
                    <Slider
                      value={[clipartSize]}
                      onValueChange={(value) => setClipartSize(value[0])}
                      min={10}
                      max={40}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Small (10mm)</span>
                      <span>Large (40mm)</span>
                    </div>
                  </div>
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
                  onClick={handlePreview}
                  title="Preview before printing"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  title="Print worksheet"
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

              {/* Scrap Paper Generator Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowScrapPaperGenerator(true)}
              >
                <NotebookPen className="h-4 w-4 mr-2" />
                Generate Scrap Paper
              </Button>

              {/* Push to NYCLogic AI Button */}
              <Button
                variant="outline"
                className="w-full bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-950/30 dark:hover:to-indigo-950/30"
                onClick={() => setShowPushDialog(true)}
              >
                <Send className="h-4 w-4 mr-2 text-purple-600" />
                <span className="text-purple-700 dark:text-purple-300">Push to NYCLogic AI</span>
              </Button>

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

      {/* Print Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-muted/90 z-50 flex flex-col print:static print:overflow-visible print:bg-white">
          {/* Preview Header Toolbar */}
          <div className="print:hidden flex items-center justify-between p-3 bg-background border-b shadow-sm">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold text-lg">Print Preview</h2>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setPreviewZoom(Math.max(50, previewZoom - 25))}
                  disabled={previewZoom <= 50}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[4rem] text-center">{previewZoom}%</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))}
                  disabled={previewZoom >= 200}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {compiledQuestions.length} question{compiledQuestions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
              <Button onClick={() => { window.print(); }}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Preview Content Area */}
          <div className="flex-1 overflow-y-auto overflow-x-auto p-6 print:p-0 print:overflow-visible" style={{ maxHeight: 'calc(100vh - 64px)' }}>
            <div 
              ref={printRef} 
              className="bg-white mx-auto shadow-xl print:shadow-none"
              style={{ 
                width: `${8.5 * (previewZoom / 100)}in`,
                minHeight: `${11 * (previewZoom / 100)}in`,
                padding: `${0.75 * (previewZoom / 100)}in`,
                transform: 'origin-top',
                boxSizing: 'border-box',
              }}
            >
                <div style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top left', width: `${100 / (previewZoom / 100)}%` }}>
                  {/* AI Scanning Instructions Banner */}
                  {showAnswerLines && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.5rem 0.875rem',
                      marginBottom: '1rem',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #6ee7b7',
                      borderRadius: '0.375rem',
                      fontSize: '0.7rem',
                      color: '#047857',
                    }}>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📋 Instructions
                      </span>
                      <span style={{ flex: 1 }}>
                        Write all work in the <strong>Work Area</strong> boxes. Put your final answer in the <strong>Final Answer</strong> section.
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-black">{worksheetTitle}</h1>
                    {teacherName && <p className="text-gray-600 mt-1">Teacher: {teacherName}</p>}
                  </div>
                  <div className="flex justify-between text-sm mb-6 border-b border-gray-300 pb-4 text-black">
                    <span>Name: _______________________</span>
                    <span>Date: ___________</span>
                    <span>Period: _____</span>
                  </div>
                  <div className="space-y-8">
                    {compiledQuestions.map((question) => (
                      <div key={question.questionNumber} className="space-y-2" style={{ pageBreakInside: 'avoid' }}>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-bold text-black">{question.questionNumber}.</span>
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
                          <span className="text-xs px-2 py-0.5 rounded border bg-gray-100 text-gray-700 border-gray-200">
                            {question.difficulty}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 ml-5">
                          {question.topic} ({question.standard})
                        </p>
                        <p className="ml-5 font-serif leading-relaxed text-base text-black" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                          {renderMathText(fixEncodingCorruption(question.question))}
                        </p>
                        {question.svg && (
                          <div 
                            className="ml-5 mt-2 flex justify-center"
                            dangerouslySetInnerHTML={{ __html: question.svg }}
                          />
                        )}
                        {/* AI-Optimized Answer Box with Work Area and Final Answer zones */}
                        {showAnswerLines && (
                          <div style={{
                            border: '3px solid #1e3a5f',
                            borderRadius: '0.5rem',
                            marginTop: '1rem',
                            marginLeft: '1.25rem',
                            backgroundColor: '#ffffff',
                            overflow: 'hidden',
                          }}>
                            {/* Work Area Section */}
                            <div style={{
                              borderBottom: '2px dashed #94a3b8',
                              padding: '0.75rem 1rem',
                              backgroundColor: '#f8fafc',
                            }}>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.5rem',
                              }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#1e3a5f',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                  backgroundColor: '#e0f2fe',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '0.25rem',
                                  border: '1px solid #7dd3fc',
                                }}>
                                  ✏️ Work Area Q{question.questionNumber}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  color: '#64748b',
                                  fontStyle: 'italic',
                                }}>
                                  Show all calculations & reasoning here
                                </span>
                              </div>
                              {/* Work lines with zone indicator */}
                              <div style={{ 
                                minHeight: '100px',
                                position: 'relative',
                              }}>
                                {[...Array(5)].map((_, i) => (
                                  <div key={i} style={{
                                    borderBottom: '1px solid #cbd5e1',
                                    height: '1.25rem',
                                  }} />
                                ))}
                                {/* Corner zone markers for AI scanning */}
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '12px',
                                  height: '12px',
                                  borderLeft: '2px solid #1e3a5f',
                                  borderTop: '2px solid #1e3a5f',
                                }} />
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  right: 0,
                                  width: '12px',
                                  height: '12px',
                                  borderRight: '2px solid #1e3a5f',
                                  borderTop: '2px solid #1e3a5f',
                                }} />
                              </div>
                            </div>
                            
                            {/* Final Answer Section */}
                            <div style={{
                              padding: '0.75rem 1rem',
                              backgroundColor: '#fef3c7',
                              borderTop: '2px solid #f59e0b',
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                              }}>
                                <span style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  color: '#92400e',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  backgroundColor: '#fde68a',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '0.25rem',
                                  border: '2px solid #f59e0b',
                                  whiteSpace: 'nowrap',
                                }}>
                                  📝 Final Answer
                                </span>
                                <div style={{
                                  flex: 1,
                                  borderBottom: '2px solid #d97706',
                                  minHeight: '1.5rem',
                                  backgroundColor: '#fffbeb',
                                  padding: '0.25rem 0.5rem',
                                }} />
                              </div>
                            </div>
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
                    <div className="mt-12 pt-8 border-t-2 border-dashed border-gray-300" style={{ pageBreakBefore: 'always' }}>
                      <h2 className="text-xl font-bold text-center mb-2 text-black">Formula Reference Sheet</h2>
                      <p className="text-center text-sm text-gray-500 mb-6">Based on selected topics</p>
                      
                      <div className="grid grid-cols-2 gap-6">
                        {relevantFormulas.map((category) => (
                          <div key={category.category} className="space-y-2">
                            <h3 className="font-semibold text-sm border-b border-gray-200 pb-1 text-black">{category.category}</h3>
                            <ul className="space-y-1 text-sm">
                              {category.formulas.map((formula, idx) => (
                                <li key={idx} className="flex flex-col text-black">
                                  <span>
                                    <span className="font-medium">{formula.name}:</span>{' '}
                                    <span className="font-mono text-xs">{formula.formula}</span>
                                  </span>
                                  {formula.description && (
                                    <span className="text-xs text-gray-500 ml-4">({formula.description})</span>
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

                {/* Answer Key Section in Print Preview */}
                {includeAnswerKey && compiledQuestions.some(q => q.answer) && (
                  <div className="mt-12 pt-8 border-t-2 border-dashed border-gray-300" style={{ pageBreakBefore: 'always' }}>
                    <h2 className="text-xl font-bold text-center mb-2 text-black">ANSWER KEY</h2>
                    <p className="text-center text-sm text-gray-600 mb-1">{worksheetTitle}</p>
                    <p className="text-center text-xs text-red-600 italic mb-6">FOR TEACHER USE ONLY</p>
                    
                    <div className="space-y-4">
                      {compiledQuestions.filter(q => q.answer).map((question) => (
                        <div key={question.questionNumber} className="pb-3 border-b border-gray-200">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-black">Question {question.questionNumber}:</span>
                            <span className="text-xs text-gray-500 italic">{question.topic}</span>
                          </div>
                          <p className="mt-1 ml-4 text-sm text-black">
                            <span className="font-medium text-green-700">Answer: </span>
                            {renderMathText(fixEncodingCorruption(question.answer || ''))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-12 text-center text-xs text-gray-400">
                  Generated with NYCLogic Ai - NYS Regents Aligned
                </div>
              </div>
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
                        {renderMathText(fixEncodingCorruption(question.question))}
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

      {/* Lightbox Dialog for Full-Screen Image Viewing */}
      <Dialog open={!!lightboxImageUrl} onOpenChange={(open) => {
        if (!open) {
          setLightboxImageUrl(null);
          setLightboxQuestionNumber(null);
        }
      }}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Question {lightboxQuestionNumber} - Diagram
            </DialogTitle>
            <DialogDescription>
              Full-size diagram preview
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 pt-0 flex items-center justify-center bg-muted/30">
            {lightboxImageUrl && (
              <img 
                src={lightboxImageUrl} 
                alt={`Full-size diagram for question ${lightboxQuestionNumber}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg border shadow-md"
              />
            )}
          </div>
          <DialogFooter className="p-4 pt-2">
            <Button variant="outline" onClick={() => {
              setLightboxImageUrl(null);
              setLightboxQuestionNumber(null);
            }}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push to NYClogic Scholar Ai Dialog */}
      <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-600" />
              Push to NYClogic Scholar Ai
            </DialogTitle>
            <DialogDescription>
              Send this worksheet as an assignment to students on NYClogic Scholar Ai. Configure XP and coin rewards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Worksheet Info */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{worksheetTitle}</p>
              <p className="text-xs text-muted-foreground">
                {compiledQuestions.length} questions • {selectedQuestions.map(q => q.topicName).join(', ')}
              </p>
            </div>

            {/* XP Reward */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                XP Reward
              </Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[pushXpReward]}
                  onValueChange={(value) => setPushXpReward(value[0])}
                  min={10}
                  max={200}
                  step={10}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-16 text-right">{pushXpReward} XP</span>
              </div>
              <p className="text-xs text-muted-foreground">Experience points students earn for completing this assignment</p>
            </div>

            {/* Coin Reward */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                Coin Reward
              </Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[pushCoinReward]}
                  onValueChange={(value) => setPushCoinReward(value[0])}
                  min={5}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-16 text-right">{pushCoinReward} 🪙</span>
              </div>
              <p className="text-xs text-muted-foreground">Coins students can spend in the NYClogic Scholar Ai store</p>
            </div>

            {/* Due Date (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={pushDueDate}
                onChange={(e) => setPushDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPushDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsPushing(true);
                try {
                  const standardCode = selectedQuestions.length > 0 ? selectedQuestions[0].standard : undefined;
                  const topicName = selectedQuestions.map(q => q.topicName).join(', ');
                  
                  // Save directly to shared_assignments table instead of calling external API
                  const { error } = await supabase
                    .from('shared_assignments')
                    .insert({
                      teacher_id: user?.id,
                      title: worksheetTitle,
                      description: `${compiledQuestions.length} question worksheet covering: ${topicName}`,
                      topics: JSON.parse(JSON.stringify(selectedQuestions)),
                      questions: JSON.parse(JSON.stringify(compiledQuestions)),
                      xp_reward: pushXpReward,
                      coin_reward: pushCoinReward,
                      due_at: pushDueDate || null,
                      source_app: 'nyclogic_ai',
                      status: 'active',
                    });

                  if (error) {
                    throw error;
                  }

                  toast({
                    title: 'Pushed to NYClogic Scholar Ai!',
                    description: `"${worksheetTitle}" is now available as an assignment with ${pushXpReward} XP and ${pushCoinReward} coins.`,
                  });
                  setShowPushDialog(false);
                } catch (error) {
                  console.error('Push error:', error);
                  toast({
                    title: 'Push failed',
                    description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                    variant: 'destructive',
                  });
                } finally {
                  setIsPushing(false);
                }
              }}
              disabled={isPushing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isPushing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Pushing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Push Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Canvas Drawing Tool */}
      <CanvasDrawingTool
        open={showDrawingTool}
        onOpenChange={setShowDrawingTool}
        onSaveDrawing={handleSaveDrawing}
        questionNumber={drawingQuestionNumber || undefined}
      />

      {/* AI Image Review Dialog */}
      <AIImageReviewDialog
        open={showImageReviewDialog}
        onOpenChange={setShowImageReviewDialog}
        selectionMode={imageSelectionQuestionNumber !== null}
        onSelectImage={(imageUrl, imageId) => {
          if (imageSelectionQuestionNumber !== null) {
            // Replace the image for the selected question with approved library image
            const updatedQuestions = compiledQuestions.map(q =>
              q.questionNumber === imageSelectionQuestionNumber
                ? { ...q, imageUrl }
                : q
            );
            setCompiledQuestions(updatedQuestions);
            setImageSelectionQuestionNumber(null);
            toast({
              title: 'Image applied!',
              description: `Approved image added to question ${imageSelectionQuestionNumber}.`,
            });
          }
        }}
        topicFilter={imageSelectionQuestionNumber !== null 
          ? compiledQuestions.find(q => q.questionNumber === imageSelectionQuestionNumber)?.topic
          : undefined
        }
      />

      {/* Scrap Paper Generator Dialog */}
      <ScrapPaperGenerator
        open={showScrapPaperGenerator}
        onOpenChange={setShowScrapPaperGenerator}
        problemNumbers={compiledQuestions.map(q => q.questionNumber)}
        worksheetTitle={worksheetTitle}
      />
    </>
  );
}
