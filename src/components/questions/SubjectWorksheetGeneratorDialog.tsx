import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Loader2, FileText, Brain, Target, Sparkles, Calculator, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { type JMAPTopic, type TopicCategory } from '@/data/nysTopics';
import { FORMULA_REFERENCE, getFormulasForTopics } from '@/data/formulaReference';
import { GenerationTimeEstimator } from './GenerationTimeEstimator';
import { GenerationProgressCounter } from './GenerationProgressCounter';

// Question format types
type QuestionFormat = 'multiple_choice' | 'short_answer' | 'extended_response' | 'application' | 'mixed';

// Cognitive level types
type CognitiveLevel = 'basic' | 'intermediate' | 'advanced';

interface SubjectWorksheetGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  subjectId: string;
  category: TopicCategory;
  topic: JMAPTopic;
  preselectedLevel?: CognitiveLevel;
  onGenerate: (questions: GeneratedQuestion[]) => void;
}

export interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  answer?: string;
  questionFormat: QuestionFormat;
  cognitiveLevel: CognitiveLevel;
  rubricPoints?: number;
  options?: string[];
  imagePrompt?: string;
}

// Subject-specific question format configurations
const getSubjectFormats = (subjectId: string): { value: QuestionFormat; label: string; description: string }[] => {
  const baseFormats = [
    { value: 'multiple_choice' as QuestionFormat, label: 'Multiple Choice', description: 'Four options with one correct answer' },
    { value: 'short_answer' as QuestionFormat, label: 'Short Answer', description: '1-3 sentence or calculation responses' },
    { value: 'extended_response' as QuestionFormat, label: 'Extended Response', description: 'Multi-step solutions or explanations' },
  ];

  // Add subject-specific formats
  switch (subjectId) {
    case 'algebra1':
    case 'algebra2':
    case 'geometry':
    case 'precalculus':
    case 'financialmath':
      return [
        ...baseFormats,
        { value: 'application' as QuestionFormat, label: 'Application Problem', description: 'Real-world word problems' },
        { value: 'mixed' as QuestionFormat, label: 'Mixed Format', description: 'Combination of question types' },
      ];
    case 'physics':
    case 'chemistry':
    case 'biology':
    case 'earthscience':
      return [
        ...baseFormats,
        { value: 'application' as QuestionFormat, label: 'Lab/Analysis', description: 'Data analysis and experimental design' },
        { value: 'mixed' as QuestionFormat, label: 'Mixed Format', description: 'Combination of question types' },
      ];
    case 'history':
    case 'government':
    case 'economics':
      return [
        ...baseFormats,
        { value: 'application' as QuestionFormat, label: 'Document-Based', description: 'Analysis of primary/secondary sources' },
        { value: 'mixed' as QuestionFormat, label: 'Mixed Format', description: 'Combination of question types' },
      ];
    default:
      return [...baseFormats, { value: 'mixed' as QuestionFormat, label: 'Mixed Format', description: 'Combination of question types' }];
  }
};

// Subject-specific focus areas
const getSubjectFocusAreas = (subjectId: string): { id: string; label: string }[] => {
  switch (subjectId) {
    case 'algebra1':
    case 'algebra2':
      return [
        { id: 'procedural', label: 'Procedural Fluency' },
        { id: 'conceptual', label: 'Conceptual Understanding' },
        { id: 'word_problems', label: 'Word Problems' },
        { id: 'graphing', label: 'Graphing & Visualization' },
        { id: 'patterns', label: 'Pattern Recognition' },
      ];
    case 'geometry':
      return [
        { id: 'proofs', label: 'Proofs & Reasoning' },
        { id: 'constructions', label: 'Constructions' },
        { id: 'coordinates', label: 'Coordinate Geometry' },
        { id: 'transformations', label: 'Transformations' },
        { id: 'area_volume', label: 'Area & Volume' },
      ];
    case 'precalculus':
      return [
        { id: 'functions', label: 'Function Analysis' },
        { id: 'trigonometry', label: 'Trigonometry' },
        { id: 'sequences', label: 'Sequences & Series' },
        { id: 'limits', label: 'Limits & Continuity' },
        { id: 'graphing', label: 'Advanced Graphing' },
      ];
    case 'physics':
      return [
        { id: 'calculations', label: 'Quantitative Problems' },
        { id: 'diagrams', label: 'Free Body Diagrams' },
        { id: 'conceptual', label: 'Conceptual Questions' },
        { id: 'lab_analysis', label: 'Lab Data Analysis' },
        { id: 'formulas', label: 'Formula Application' },
      ];
    case 'chemistry':
      return [
        { id: 'stoichiometry', label: 'Stoichiometry' },
        { id: 'bonding', label: 'Bonding & Structure' },
        { id: 'reactions', label: 'Reaction Types' },
        { id: 'lab_skills', label: 'Lab Skills' },
        { id: 'periodic_trends', label: 'Periodic Trends' },
      ];
    case 'biology':
      return [
        { id: 'cell_biology', label: 'Cell Biology' },
        { id: 'genetics', label: 'Genetics & DNA' },
        { id: 'ecology', label: 'Ecology' },
        { id: 'evolution', label: 'Evolution' },
        { id: 'lab_analysis', label: 'Lab Analysis' },
      ];
    case 'history':
      return [
        { id: 'cause_effect', label: 'Cause & Effect' },
        { id: 'primary_sources', label: 'Primary Sources' },
        { id: 'chronology', label: 'Chronology' },
        { id: 'comparison', label: 'Compare & Contrast' },
        { id: 'significance', label: 'Historical Significance' },
      ];
    case 'government':
      return [
        { id: 'constitution', label: 'Constitutional Principles' },
        { id: 'branches', label: 'Branches of Government' },
        { id: 'rights', label: 'Rights & Liberties' },
        { id: 'civic_participation', label: 'Civic Participation' },
        { id: 'policy', label: 'Policy Analysis' },
      ];
    case 'economics':
      return [
        { id: 'supply_demand', label: 'Supply & Demand' },
        { id: 'markets', label: 'Market Structures' },
        { id: 'macro', label: 'Macroeconomics' },
        { id: 'fiscal_monetary', label: 'Fiscal/Monetary Policy' },
        { id: 'international', label: 'International Trade' },
      ];
    case 'financialmath':
      return [
        { id: 'budgeting', label: 'Budgeting' },
        { id: 'interest', label: 'Interest Calculations' },
        { id: 'taxes', label: 'Tax Calculations' },
        { id: 'credit', label: 'Credit & Loans' },
        { id: 'investing', label: 'Investing' },
      ];
    default:
      return [
        { id: 'conceptual', label: 'Conceptual Understanding' },
        { id: 'application', label: 'Application' },
        { id: 'analysis', label: 'Analysis' },
      ];
  }
};

const COGNITIVE_LEVELS: { value: CognitiveLevel; label: string; description: string }[] = [
  { value: 'basic', label: 'Basic', description: 'Recall and basic understanding' },
  { value: 'intermediate', label: 'Intermediate', description: 'Application and analysis' },
  { value: 'advanced', label: 'Advanced', description: 'Synthesis and evaluation' },
];

export function SubjectWorksheetGeneratorDialog({
  open,
  onOpenChange,
  subject,
  subjectId,
  category,
  topic,
  preselectedLevel,
  onGenerate,
}: SubjectWorksheetGeneratorDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Set<QuestionFormat>>(new Set(['mixed']));
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<Set<string>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<Set<CognitiveLevel>>(
    new Set(preselectedLevel ? [preselectedLevel] : ['intermediate'])
  );
  const [questionCount, setQuestionCount] = useState(6);
  // Geometry/images disabled - kept for compatibility but always false
  const includeGeometry = false;
  const includeImages = false;

  // Geometry and image features are disabled
  const supportsGeometry = false;
  const supportsImages = false;

  // Update levels when preselected level changes
  useEffect(() => {
    if (preselectedLevel) {
      setSelectedLevels(new Set([preselectedLevel]));
    }
  }, [preselectedLevel]);

  const questionFormats = getSubjectFormats(subjectId);
  const focusAreas = getSubjectFocusAreas(subjectId);

  // Get relevant formulas for this topic
  const relevantFormulas = FORMULA_REFERENCE[category.category] || null;

  const toggleFormat = (format: QuestionFormat) => {
    setSelectedFormats(prev => {
      const next = new Set(prev);
      if (next.has(format)) {
        if (next.size > 1) next.delete(format);
      } else {
        next.add(format);
      }
      return next;
    });
  };

  const toggleFocusArea = (area: string) => {
    setSelectedFocusAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) {
        next.delete(area);
      } else {
        next.add(area);
      }
      return next;
    });
  };

  const toggleLevel = (level: CognitiveLevel) => {
    setSelectedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        if (next.size > 1) next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const topicData = {
        topicName: topic.name,
        standard: topic.standard,
        subject: subject,
        category: category.category,
      };

      // Build context for the AI
      const context = {
        subject,
        subjectId,
        topic: topicData,
        formats: Array.from(selectedFormats),
        focusAreas: Array.from(selectedFocusAreas),
        levels: Array.from(selectedLevels),
        questionCount,
        formulas: relevantFormulas?.formulas || [],
      };

      const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: [topicData],
          count: questionCount,
          difficulty: selectedLevels.has('advanced') ? 3 : selectedLevels.has('intermediate') ? 2 : 1,
          isDiagnostic: false,
          subjectContext: context,
          // Default to NO image generation - text-only with generous workspace for student work
          useAIImages: includeImages,
          includeGeometry: supportsGeometry && includeGeometry,
        },
      });

      if (error) throw error;

      const generatedQuestions: GeneratedQuestion[] = (data.questions || []).map((q: any, idx: number) => ({
        questionNumber: idx + 1,
        topic: topic.name,
        standard: topic.standard,
        question: q.question,
        answer: q.answer,
        questionFormat: Array.from(selectedFormats)[idx % selectedFormats.size] as QuestionFormat,
        cognitiveLevel: Array.from(selectedLevels)[idx % selectedLevels.size] as CognitiveLevel,
        rubricPoints: q.points || 2,
        options: q.options,
        imagePrompt: q.imagePrompt,
      }));

      onGenerate(generatedQuestions);
      onOpenChange(false);

      toast({
        title: 'Questions Generated',
        description: `Created ${generatedQuestions.length} questions for ${topic.name}`,
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate questions',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate {subject} Questions
          </DialogTitle>
          <DialogDescription>
            Customize question types and difficulty for "{topic.name}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Topic Info */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{topic.standard}</Badge>
                <span className="text-sm font-medium">{topic.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Category: {category.category}</p>
            </div>

            {/* Question Formats */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Question Formats
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {questionFormats.map((format) => (
                  <div
                    key={format.value}
                    onClick={() => toggleFormat(format.value)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedFormats.has(format.value)
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedFormats.has(format.value)} />
                      <span className="font-medium text-sm">{format.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">{format.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Focus Areas */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Focus Areas (optional)
              </Label>
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((area) => (
                  <Badge
                    key={area.id}
                    variant={selectedFocusAreas.has(area.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleFocusArea(area.id)}
                  >
                    {area.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Cognitive Levels */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Cognitive Level
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {COGNITIVE_LEVELS.map((level) => (
                  <div
                    key={level.value}
                    onClick={() => toggleLevel(level.value)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                      selectedLevels.has(level.value)
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-muted-foreground/50'
                    }`}
                  >
                    <span className="font-medium text-sm">{level.label}</span>
                    <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div className="space-y-3">
              <Label>Number of Questions: {questionCount}</Label>
              <div className="flex gap-2">
                {[4, 6, 8, 10, 12].map((count) => (
                  <Button
                    key={count}
                    variant={questionCount === count ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setQuestionCount(count)}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>

            {/* Visual Content Options - REMOVED: Geometry shapes and AI images are disabled */}

            {/* Relevant Formulas */}
            {relevantFormulas && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Reference Formulas
                </Label>
                <div className="p-3 rounded-lg bg-muted/30 border text-sm">
                  <p className="font-medium text-muted-foreground mb-2">{relevantFormulas.category}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {relevantFormulas.formulas.slice(0, 6).map((formula, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-mono">{formula.formula}</span>
                        <span className="text-muted-foreground ml-1">({formula.name})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Generation Time Estimator */}
            <GenerationTimeEstimator
              questionCount={questionCount}
              includeImages={includeImages}
              includeSvg={supportsGeometry && includeGeometry}
            />
          </div>
        </ScrollArea>

        {/* Progress Counter (shown during generation) */}
        {isGenerating && (
          <GenerationProgressCounter
            isGenerating={isGenerating}
            questionCount={questionCount}
            includeImages={includeImages}
            includeSvg={supportsGeometry && includeGeometry}
          />
        )}

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
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
