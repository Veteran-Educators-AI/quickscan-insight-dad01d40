import { useState } from 'react';
import { Loader2, Eye, RefreshCw, Sparkles, Shapes, ImageIcon, ZoomIn, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fixEncodingCorruption, renderMathText } from '@/lib/mathRenderer';

type AdvancementLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

interface PreviewQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  difficulty: string;
  advancementLevel: AdvancementLevel;
  hint?: string;
  svg?: string;
  imageUrl?: string;
  imagePrompt?: string;
}

interface QuestionPreviewPanelProps {
  selectedTopics: string[];
  customTopics: { topicName: string; standard: string }[];
  warmUpCount: string;
  warmUpDifficulty: 'super-easy' | 'easy' | 'very-easy';
  questionCount: string;
  includeHints: boolean;
  previewLevel: AdvancementLevel;
  includeGeometry?: boolean;
  useAIImages?: boolean;
}

const getLevelColor = (level: AdvancementLevel) => {
  switch (level) {
    case 'A': return 'bg-green-100 text-green-800 border-green-300';
    case 'B': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'E': return 'bg-red-100 text-red-800 border-red-300';
    case 'F': return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getLevelDescription = (level: AdvancementLevel) => {
  switch (level) {
    case 'A': return 'Advanced';
    case 'B': return 'Proficient';
    case 'C': return 'Developing';
    case 'D': return 'Beginning';
    case 'E': return 'Emerging';
    case 'F': return 'Foundational';
  }
};

// Convert SVG string to data URI for display
const svgToDataUri = (svg: string): string => {
  if (!svg) return '';
  // Check if it's already a data URI or URL
  if (svg.startsWith('data:') || svg.startsWith('http')) {
    return svg;
  }
  // Convert SVG string to data URI
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
};

const formatPreviewText = (text?: string) => renderMathText(fixEncodingCorruption(text ?? ''));

export function QuestionPreviewPanel({
  selectedTopics,
  customTopics,
  warmUpCount,
  warmUpDifficulty,
  questionCount,
  includeHints,
  previewLevel,
  includeGeometry = false,
  useAIImages = false,
}: QuestionPreviewPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [warmUpQuestions, setWarmUpQuestions] = useState<PreviewQuestion[]>([]);
  const [mainQuestions, setMainQuestions] = useState<PreviewQuestion[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; questionNumber: number } | null>(null);

  // Generate diagram images for questions that have imagePrompts but no actual images yet
  const generateDiagramImages = async (
    questions: PreviewQuestion[], 
    prefix: string
  ): Promise<PreviewQuestion[]> => {
    const questionsNeedingImages = questions.filter(q => q.imagePrompt && !q.imageUrl && !q.svg);
    
    if (questionsNeedingImages.length === 0) return questions;
    
    console.log(`Generating ${questionsNeedingImages.length} diagram images for ${prefix}...`);
    setIsGeneratingImages(true);
    
    try {
      // Process in batches of 3 to avoid rate limiting
      const batchSize = 3;
      const updatedQuestions = [...questions];
      
      for (let i = 0; i < questionsNeedingImages.length; i += batchSize) {
        const batch = questionsNeedingImages.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (question) => {
            try {
              const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
                body: {
                  questions: [{
                    questionNumber: question.questionNumber,
                    imagePrompt: question.imagePrompt,
                  }],
                  // For previews, prefer fast, deterministic SVG for geometry diagrams.
                  // If AI images are enabled, we still allow the backend to decide,
                  // but we hint that deterministic SVG is preferred for accuracy.
                  useNanoBanana: useAIImages,
                  preferDeterministicSVG: !useAIImages,
                },
              });
              
              const imageUrl =
                data?.results?.[0]?.imageUrl ??
                // Backwards compatibility: older edge versions may return `images`
                data?.images?.[0]?.imageUrl;

              if (!error && imageUrl) {
                // Find and update the question in the array
                const idx = updatedQuestions.findIndex(q => q.questionNumber === question.questionNumber);
                if (idx !== -1) {
                  updatedQuestions[idx] = {
                    ...updatedQuestions[idx],
                    imageUrl,
                  };
                }
              }
            } catch (err) {
              console.error(`Error generating image for Q${question.questionNumber}:`, err);
            }
          })
        );
      }
      
      return updatedQuestions;
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const loadPreview = async () => {
    if (selectedTopics.length === 0 && customTopics.length === 0) {
      toast({
        title: 'No topics selected',
        description: 'Please select at least one topic to preview questions.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setHasLoaded(true);

    try {
      // Generate warm-up preview (just 1-2 questions for preview)
      let warmUp: PreviewQuestion[] = [];
      const warmUpCountNum = parseInt(warmUpCount);
      
      if (warmUpCountNum > 0) {
        const warmUpTopicsPayload = selectedTopics.length > 0
          ? selectedTopics.slice(0, 2).map(t => ({
              topicName: t,
              standard: customTopics.find(ct => ct.topicName === t)?.standard || '',
              subject: 'Mathematics',
              category: 'Warm-Up Preview',
            }))
          : [{ topicName: 'General Math', standard: '', subject: 'Mathematics', category: 'Warm-Up Preview' }];

        const { data: warmUpData, error: warmUpError } = await supabase.functions.invoke('generate-worksheet-questions', {
          body: {
            topics: warmUpTopicsPayload,
            questionCount: Math.min(warmUpCountNum, 2), // Preview max 2 warm-up
            difficultyLevels: [warmUpDifficulty],
            worksheetMode: 'warmup',
            formVariation: 'Preview',
            formSeed: Date.now(),
            includeHints,
            includeGeometry,
            useAIImages,
          },
        });

        if (warmUpError) throw warmUpError;
        warmUp = warmUpData?.questions || [];
      }

      // Generate main questions preview (just 2-3 for preview)
      const mainTopicsPayload = selectedTopics.length > 0
        ? selectedTopics.slice(0, 2).map(t => ({
            topicName: t,
            standard: customTopics.find(ct => ct.topicName === t)?.standard || '',
            subject: 'Mathematics',
            category: 'Main Preview',
          }))
        : [{ topicName: 'General Math', standard: '', subject: 'Mathematics', category: 'Main Preview' }];

      const { data: mainData, error: mainError } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: mainTopicsPayload,
          questionCount: Math.min(parseInt(questionCount), 3), // Preview max 3 main
          difficultyLevels: previewLevel === 'A' || previewLevel === 'B' 
            ? ['hard', 'challenging'] 
            : previewLevel === 'C' || previewLevel === 'D'
            ? ['medium', 'hard']
            : ['easy', 'super-easy', 'medium'],
          advancementLevel: previewLevel,
          worksheetMode: 'practice',
          formVariation: 'Preview',
          formSeed: Date.now(),
          includeHints,
          includeGeometry,
          useAIImages,
        },
      });

      if (mainError) throw mainError;

      let finalWarmUp = warmUp;
      let finalMain = mainData?.questions || [];

      // If geometry is enabled, generate the actual diagram images
      if (includeGeometry) {
        toast({
          title: 'Generating diagrams...',
          description: 'Creating geometric shapes for your questions.',
        });
        
        // Generate images for both warm-up and main questions in parallel
        const [updatedWarmUp, updatedMain] = await Promise.all([
          warmUp.length > 0 ? generateDiagramImages(warmUp, 'warmup') : Promise.resolve(warmUp),
          finalMain.length > 0 ? generateDiagramImages(finalMain, 'main') : Promise.resolve(finalMain),
        ]);
        
        finalWarmUp = updatedWarmUp;
        finalMain = updatedMain;
      }

      setWarmUpQuestions(finalWarmUp);
      setMainQuestions(finalMain);

      const imageCount = [...finalWarmUp, ...finalMain].filter(q => q.imageUrl || q.svg).length;
      toast({
        title: 'Preview loaded',
        description: includeGeometry && imageCount > 0
          ? `Generated ${imageCount} diagram${imageCount > 1 ? 's' : ''}.`
          : 'Sample questions generated.',
      });
    } catch (error) {
      console.error('Error loading preview:', error);
      toast({
        title: 'Preview failed',
        description: 'Could not generate preview questions.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasQuestions = warmUpQuestions.length > 0 || mainQuestions.length > 0;

  const getImageUrl = (question: PreviewQuestion): string | null => {
    if (question.imageUrl) return question.imageUrl;
    if (question.svg) return svgToDataUri(question.svg);
    return null;
  };

  const renderQuestionWithShape = (question: PreviewQuestion, idx: number, variant: 'warmup' | 'main') => {
    const imageUrl = getImageUrl(question);
    const bgClass = variant === 'warmup' ? 'bg-green-50/50 border-green-100' : 'bg-muted/50';
    const textClass = variant === 'warmup' ? 'text-green-800' : '';

    return (
      <div key={`${variant}-${idx}`} className={`p-2 rounded-md border ${bgClass}`}>
        <div className="flex items-center justify-between mb-1">
          <p className={`text-xs font-medium ${textClass}`}>Q{question.questionNumber}</p>
          <div className="flex items-center gap-1">
            {imageUrl && (
              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <Badge variant="secondary" className="text-[10px] h-4 cursor-pointer bg-blue-100 text-blue-700 hover:bg-blue-200">
                    <Shapes className="h-2.5 w-2.5 mr-0.5" />
                    Shape
                  </Badge>
                </HoverCardTrigger>
                <HoverCardContent side="right" className="w-auto p-2 z-50">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Click to enlarge</p>
                    <img 
                      src={imageUrl} 
                      alt={`Shape for Q${question.questionNumber}`}
                      className="border rounded max-w-[150px] max-h-[150px] object-contain cursor-pointer hover:opacity-80 transition-opacity bg-white"
                      onClick={() => setLightboxImage({ url: imageUrl, questionNumber: question.questionNumber })}
                    />
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
            {variant === 'main' && (
              <Badge variant="outline" className="text-[10px] h-4">
                {question.difficulty}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Question text with optional inline shape preview */}
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-sm whitespace-pre-line">{formatPreviewText(question.question)}</p>
            {question.hint && includeHints && (
              <p className="text-xs text-amber-600 mt-1 italic whitespace-pre-line">
                💡 {formatPreviewText(question.hint)}
              </p>
            )}
          </div>
          
          {/* Small inline shape preview */}
          {imageUrl && (
            <div 
              className="flex-shrink-0 w-12 h-12 border rounded bg-white flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => setLightboxImage({ url: imageUrl, questionNumber: question.questionNumber })}
            >
              <img 
                src={imageUrl} 
                alt={`Shape for Q${question.questionNumber}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Question Preview
              {includeGeometry && (
                <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">
                  <Shapes className="h-3 w-3 mr-1" />
                  Shapes
                </Badge>
              )}
            </div>
            <Badge variant="outline" className={getLevelColor(previewLevel)}>
              Level {previewLevel} - {getLevelDescription(previewLevel)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasLoaded ? (
            <div className="text-center py-6">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary/40" />
              <p className="text-sm text-muted-foreground mb-3">
                Preview sample questions{includeGeometry ? ' with shapes' : ''} before generating the full worksheet
              </p>
              <Button 
                onClick={loadPreview} 
                disabled={isLoading || (selectedTopics.length === 0 && customTopics.length === 0)}
                size="sm"
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                Load Preview
              </Button>
            </div>
          ) : isLoading || isGeneratingImages ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                {isGeneratingImages ? 'Generating diagrams...' : 'Generating preview...'}
              </p>
              {(includeGeometry || isGeneratingImages) && (
                <p className="text-xs text-blue-600 mt-1">
                  <Shapes className="h-3 w-3 inline mr-1" />
                  {isGeneratingImages ? 'Creating images with AI...' : 'Preparing geometric diagrams...'}
                </p>
              )}
            </div>
          ) : hasQuestions ? (
            <>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={loadPreview} className="h-7 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              <ScrollArea className="h-[250px]">
                <div className="space-y-3 pr-3">
                  {warmUpQuestions.length > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          ✨ Warm-Up
                        </Badge>
                      </div>
                      {warmUpQuestions.map((q, idx) => renderQuestionWithShape(q, idx, 'warmup'))}
                      <Separator className="my-2" />
                    </>
                  )}
                  
                  {mainQuestions.length > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          📝 Practice Questions
                        </Badge>
                        {mainQuestions.some(q => q.svg || q.imageUrl) && (
                          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {mainQuestions.filter(q => q.svg || q.imageUrl).length} with shapes
                          </Badge>
                        )}
                      </div>
                      {mainQuestions.map((q, idx) => renderQuestionWithShape(q, idx, 'main'))}
                    </>
                  )}
                </div>
              </ScrollArea>
              <p className="text-[10px] text-muted-foreground text-center">
                This is a preview. Final worksheet will have {warmUpCount} warm-up + {questionCount} practice questions.
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                No questions generated. Try different settings.
              </p>
              <Button onClick={loadPreview} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox for enlarged shape view */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shapes className="h-5 w-5 text-blue-600" />
              Shape Preview - Question {lightboxImage?.questionNumber}
            </DialogTitle>
          </DialogHeader>
          {lightboxImage && (
            <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
              <img 
                src={lightboxImage.url} 
                alt={`Shape for Question ${lightboxImage.questionNumber}`}
                className="max-w-full max-h-[400px] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}