import { useState } from 'react';
import { Loader2, Eye, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type AdvancementLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

interface PreviewQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  difficulty: string;
  advancementLevel: AdvancementLevel;
  hint?: string;
}

interface QuestionPreviewPanelProps {
  selectedTopics: string[];
  customTopics: { topicName: string; standard: string }[];
  warmUpCount: string;
  warmUpDifficulty: 'super-easy' | 'easy' | 'very-easy';
  questionCount: string;
  includeHints: boolean;
  previewLevel: AdvancementLevel;
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

export function QuestionPreviewPanel({
  selectedTopics,
  customTopics,
  warmUpCount,
  warmUpDifficulty,
  questionCount,
  includeHints,
  previewLevel,
}: QuestionPreviewPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [warmUpQuestions, setWarmUpQuestions] = useState<PreviewQuestion[]>([]);
  const [mainQuestions, setMainQuestions] = useState<PreviewQuestion[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

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
        },
      });

      if (mainError) throw mainError;

      setWarmUpQuestions(warmUp);
      setMainQuestions(mainData?.questions || []);

      toast({
        title: 'Preview loaded',
        description: 'Sample questions generated successfully.',
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

  return (
    <Card className="border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Question Preview
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
              Preview sample questions before generating the full worksheet
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
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Generating preview...</p>
          </div>
        ) : hasQuestions ? (
          <>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={loadPreview} className="h-7 text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3 pr-3">
                {warmUpQuestions.length > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        ✨ Warm-Up
                      </Badge>
                    </div>
                    {warmUpQuestions.map((q, idx) => (
                      <div key={`warmup-${idx}`} className="p-2 bg-green-50/50 rounded-md border border-green-100">
                        <p className="text-xs font-medium text-green-800 mb-1">Q{q.questionNumber}</p>
                        <p className="text-sm">{q.question}</p>
                        {q.hint && includeHints && (
                          <p className="text-xs text-amber-600 mt-1 italic">💡 {q.hint}</p>
                        )}
                      </div>
                    ))}
                    <Separator className="my-2" />
                  </>
                )}
                
                {mainQuestions.length > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        📝 Practice Questions
                      </Badge>
                    </div>
                    {mainQuestions.map((q, idx) => (
                      <div key={`main-${idx}`} className="p-2 bg-muted/50 rounded-md border">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium">Q{q.questionNumber}</p>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {q.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm">{q.question}</p>
                        {q.hint && includeHints && (
                          <p className="text-xs text-amber-600 mt-1 italic">💡 {q.hint}</p>
                        )}
                      </div>
                    ))}
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
  );
}
