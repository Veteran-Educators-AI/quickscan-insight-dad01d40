import { useState } from 'react';
import { BookOpen, FileText, Loader2, Sparkles, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { GenerationTimeEstimator } from './GenerationTimeEstimator';
import { GenerationProgressCounter } from './GenerationProgressCounter';
import type { LiteraryText, TextQuestion, LessonSuggestion } from '@/data/englishLiteratureTopics';

// Question format types for English
type QuestionFormat = 'multiple_choice' | 'short_answer' | 'extended_response' | 'text_evidence' | 'mixed';

// Cognitive level types aligned with Bloom's taxonomy for literature
type CognitiveLevel = 'comprehension' | 'analysis' | 'higher-order';

interface EnglishWorksheetGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: LiteraryText | null;
  lesson?: LessonSuggestion | null;
  preselectedLevel?: CognitiveLevel;
  preselectedQuestions?: TextQuestion[];
  onGenerate: (questions: GeneratedEnglishQuestion[]) => void;
}

export interface GeneratedEnglishQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  answer?: string;
  questionFormat: QuestionFormat;
  cognitiveLevel: CognitiveLevel;
  textReference?: string;
  rubricPoints?: number;
  options?: string[]; // For multiple choice
}

const QUESTION_FORMATS: { value: QuestionFormat; label: string; description: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'Four options with one correct answer' },
  { value: 'short_answer', label: 'Short Answer', description: '1-3 sentence responses' },
  { value: 'extended_response', label: 'Extended Response', description: 'Paragraph-length analysis (4-6 sentences)' },
  { value: 'text_evidence', label: 'Text Evidence', description: 'Cite and explain evidence from the text' },
  { value: 'mixed', label: 'Mixed Format', description: 'Combination of question types' },
];

const COGNITIVE_LEVELS: { value: CognitiveLevel; label: string; description: string; color: string }[] = [
  { value: 'comprehension', label: 'Comprehension', description: 'Understand plot, characters, setting', color: 'bg-green-500' },
  { value: 'analysis', label: 'Analysis', description: 'Literary devices, themes, structure', color: 'bg-blue-500' },
  { value: 'higher-order', label: 'Higher-Order', description: 'Evaluate, synthesize, create arguments', color: 'bg-purple-500' },
];

const FOCUS_AREAS = [
  { id: 'character', label: 'Character Development' },
  { id: 'theme', label: 'Themes & Motifs' },
  { id: 'literary_devices', label: 'Literary Devices' },
  { id: 'plot', label: 'Plot & Structure' },
  { id: 'setting', label: 'Setting & Context' },
  { id: 'author_purpose', label: "Author's Purpose" },
  { id: 'symbolism', label: 'Symbolism' },
  { id: 'conflict', label: 'Conflict' },
];

export function EnglishWorksheetGeneratorDialog({
  open,
  onOpenChange,
  text,
  lesson,
  preselectedLevel,
  preselectedQuestions,
  onGenerate,
}: EnglishWorksheetGeneratorDialogProps) {
  const { toast } = useToast();
  const { trackFeature } = useFeatureTracking();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionCount, setQuestionCount] = useState('5');
  const [questionFormat, setQuestionFormat] = useState<QuestionFormat>('mixed');
  const [selectedLevels, setSelectedLevels] = useState<CognitiveLevel[]>(
    preselectedLevel ? [preselectedLevel] : ['comprehension', 'analysis']
  );
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(['character', 'theme']);
  const [includeTextReferences, setIncludeTextReferences] = useState(true);
  const [includeRubric, setIncludeRubric] = useState(false);

  const toggleLevel = (level: CognitiveLevel) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const toggleFocusArea = (area: string) => {
    setSelectedFocusAreas(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const handleGenerate = async () => {
    if (!text) {
      toast({
        title: 'No text selected',
        description: 'Please select a literary text first.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedLevels.length === 0) {
      toast({
        title: 'Select cognitive levels',
        description: 'Please select at least one cognitive level.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: [{
            topicName: lesson?.title || text.title,
            standard: lesson?.standards?.[0] || 'RL.9-10.1',
            subject: 'English',
            category: 'LITERATURE',
          }],
          questionCount: parseInt(questionCount),
          // Map cognitive levels to bloom levels for the AI
          bloomLevels: selectedLevels.map(level => {
            if (level === 'comprehension') return ['remember', 'understand'];
            if (level === 'analysis') return ['analyze', 'apply'];
            return ['evaluate', 'create'];
          }).flat(),
          difficultyLevels: ['medium', 'hard'],
          // English-specific parameters
          englishContext: {
            textTitle: text.title,
            author: text.author,
            genre: text.genre,
            themes: text.themes,
            literaryDevices: text.literaryDevices,
            gradeLevel: text.gradeLevel,
            questionFormat,
            focusAreas: selectedFocusAreas,
            includeTextReferences,
            includeRubric,
            lessonObjectives: lesson?.objectives,
          },
        },
      });

      if (error) throw error;

      if (data?.questions && data.questions.length > 0) {
        // Transform questions to our format
        const generatedQuestions: GeneratedEnglishQuestion[] = data.questions.map((q: any, idx: number) => ({
          questionNumber: idx + 1,
          topic: lesson?.title || text.title,
          standard: q.standard || lesson?.standards?.[0] || 'RL.9-10.1',
          question: q.question,
          answer: q.answer,
          questionFormat: q.questionFormat || questionFormat,
          cognitiveLevel: mapBloomToCognitive(q.bloomLevel),
          textReference: q.textReference,
          rubricPoints: includeRubric ? (q.rubricPoints || 4) : undefined,
          options: q.options,
        }));

        trackFeature({
          featureName: 'Generate English Worksheet',
          category: 'worksheets',
          action: 'generated',
          metadata: {
            textTitle: text.title,
            questionCount: generatedQuestions.length,
            format: questionFormat,
            levels: selectedLevels,
          },
        });

        onGenerate(generatedQuestions);
        onOpenChange(false);

        toast({
          title: 'Questions generated!',
          description: `Created ${generatedQuestions.length} questions for "${text.title}"`,
        });
      } else {
        throw new Error('No questions generated');
      }
    } catch (error) {
      console.error('Error generating English questions:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate questions',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Generate Literature Questions
          </DialogTitle>
          <DialogDescription>
            {text ? (
              <span>
                Creating questions for <strong>{text.title}</strong> by {text.author}
                {lesson && <span> • Lesson: {lesson.title}</span>}
              </span>
            ) : (
              'Configure your literature assessment'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question Count */}
          <div className="space-y-2">
            <Label>Number of Questions</Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 questions</SelectItem>
                <SelectItem value="5">5 questions</SelectItem>
                <SelectItem value="8">8 questions</SelectItem>
                <SelectItem value="10">10 questions</SelectItem>
                <SelectItem value="15">15 questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Question Format */}
          <div className="space-y-3">
            <Label>Question Format</Label>
            <RadioGroup value={questionFormat} onValueChange={(v) => setQuestionFormat(v as QuestionFormat)}>
              <div className="grid grid-cols-1 gap-2">
                {QUESTION_FORMATS.map((format) => (
                  <label
                    key={format.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      questionFormat === format.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={format.value} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{format.label}</div>
                      <div className="text-xs text-muted-foreground">{format.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Cognitive Levels */}
          <div className="space-y-3">
            <Label>Cognitive Levels (Bloom's Taxonomy)</Label>
            <div className="grid grid-cols-1 gap-2">
              {COGNITIVE_LEVELS.map((level) => (
                <label
                  key={level.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLevels.includes(level.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedLevels.includes(level.value)}
                    onCheckedChange={() => toggleLevel(level.value)}
                  />
                  <div className={`w-2 h-2 rounded-full ${level.color}`} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{level.label}</div>
                    <div className="text-xs text-muted-foreground">{level.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Focus Areas */}
          <div className="space-y-3">
            <Label>Focus Areas</Label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map((area) => (
                <Badge
                  key={area.id}
                  variant={selectedFocusAreas.includes(area.id) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleFocusArea(area.id)}
                >
                  {selectedFocusAreas.includes(area.id) && <Check className="h-3 w-3 mr-1" />}
                  {area.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Additional Options */}
          <div className="space-y-3">
            <Label>Options</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={includeTextReferences}
                  onCheckedChange={(checked) => setIncludeTextReferences(checked as boolean)}
                />
                <span className="text-sm">Include text references (e.g., "In Chapter 3...")</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={includeRubric}
                  onCheckedChange={(checked) => setIncludeRubric(checked as boolean)}
                />
                <span className="text-sm">Include point values for each question</span>
              </label>
            </div>
          </div>

          {/* Generation Time Estimator */}
          <GenerationTimeEstimator
            questionCount={parseInt(questionCount)}
            includeImages={false}
            includeSvg={false}
          />

          {/* Text Info Summary */}
          {text && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4" />
                Text Context
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">{text.gradeLevel}</Badge>
                <Badge variant="secondary" className="text-xs">{text.genre}</Badge>
                {text.themes.slice(0, 3).map(theme => (
                  <Badge key={theme} variant="outline" className="text-xs">{theme}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Progress Counter (shown during generation) */}
        {isGenerating && (
          <GenerationProgressCounter
            isGenerating={isGenerating}
            questionCount={parseInt(questionCount)}
            includeImages={false}
            includeSvg={false}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !text || selectedLevels.length === 0}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate {questionCount} Questions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to map Bloom levels to our cognitive categories
function mapBloomToCognitive(bloomLevel?: string): CognitiveLevel {
  if (!bloomLevel) return 'comprehension';
  const level = bloomLevel.toLowerCase();
  if (level === 'remember' || level === 'understand') return 'comprehension';
  if (level === 'apply' || level === 'analyze') return 'analysis';
  return 'higher-order';
}
