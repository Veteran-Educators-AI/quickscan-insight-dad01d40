import { useState, useCallback, useEffect } from 'react';
import { Lightbulb, Plus, Save, X, Loader2, Brain, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface SavedInterpretation {
  id: string;
  patternType: string;
  patternDescription: string;
  correctInterpretation: string;
  topicName?: string;
  createdAt: string;
}

interface TeacherInterpretationPanelProps {
  topicName?: string;
  ocrText?: string;
  onInterpretationSaved?: () => void;
  className?: string;
}

const PATTERN_TYPES = [
  { value: 'blank_page', label: 'Blank Page Detection', description: 'Teach AI what a truly blank page looks like' },
  { value: 'handwriting', label: 'Handwriting Style', description: 'Help AI recognize unusual handwriting' },
  { value: 'formula', label: 'Formula/Expression', description: 'Correct formula recognition errors' },
  { value: 'diagram', label: 'Diagram/Drawing', description: 'Clarify diagram interpretations' },
  { value: 'partial_work', label: 'Partial Work', description: 'Define what counts as showing work' },
  { value: 'answer_format', label: 'Answer Format', description: 'Expected answer presentation' },
  { value: 'custom', label: 'Custom Pattern', description: 'Other pattern not listed' },
];

export function TeacherInterpretationPanel({
  topicName,
  ocrText,
  onInterpretationSaved,
  className,
}: TeacherInterpretationPanelProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedInterpretations, setSavedInterpretations] = useState<SavedInterpretation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [patternType, setPatternType] = useState('');
  const [patternDescription, setPatternDescription] = useState('');
  const [correctInterpretation, setCorrectInterpretation] = useState('');

  // Load saved interpretations for this teacher
  useEffect(() => {
    if (user && isOpen) {
      loadSavedInterpretations();
    }
  }, [user, isOpen]);

  const loadSavedInterpretations = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('interpretation_verifications')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setSavedInterpretations(
        (data || []).map((item: any) => ({
          id: item.id,
          patternType: item.context || 'custom',
          patternDescription: item.original_text,
          correctInterpretation: item.correct_interpretation || item.interpretation,
          topicName: item.interpretation?.includes(':') ? item.interpretation.split(':')[0] : undefined,
          createdAt: item.created_at,
        }))
      );
    } catch (error) {
      console.error('Failed to load interpretations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveInterpretation = async () => {
    if (!user || !patternType || !patternDescription || !correctInterpretation) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('interpretation_verifications')
        .insert({
          teacher_id: user.id,
          original_text: patternDescription,
          interpretation: topicName ? `${topicName}: ${patternType}` : patternType,
          decision: 'confirmed',
          correct_interpretation: correctInterpretation,
          context: patternType,
        });

      if (error) throw error;

      toast.success('Interpretation saved!', {
        description: 'AI will use this for future grading',
      });

      // Reset form
      setPatternType('');
      setPatternDescription('');
      setCorrectInterpretation('');
      setIsAdding(false);
      
      // Reload saved interpretations
      await loadSavedInterpretations();
      onInterpretationSaved?.();
    } catch (error) {
      console.error('Failed to save interpretation:', error);
      toast.error('Failed to save interpretation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInterpretation = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('interpretation_verifications')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user.id);

      if (error) throw error;

      toast.success('Interpretation deleted');
      setSavedInterpretations(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete interpretation:', error);
      toast.error('Failed to delete');
    }
  };

  const selectedPatternInfo = PATTERN_TYPES.find(p => p.value === patternType);

  return (
    <Card className={cn("border-purple-200 bg-purple-50/50 dark:bg-purple-950/20", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              Teach AI Recognition
              {savedInterpretations.length > 0 && (
                <Badge variant="outline" className="ml-2 border-purple-300 text-purple-600">
                  {savedInterpretations.length} patterns
                </Badge>
              )}
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? 'Hide' : 'Configure'}
              </Button>
            </CollapsibleTrigger>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Teach the AI how to correctly interpret patterns in student work for this topic
          </p>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Add new interpretation button */}
            {!isAdding && (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 border-purple-300 text-purple-700 hover:bg-purple-100"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-4 w-4" />
                Add New Pattern Interpretation
              </Button>
            )}

            {/* Add form */}
            {isAdding && (
              <div className="space-y-4 border rounded-lg p-4 bg-white dark:bg-background">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    New Pattern Interpretation
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsAdding(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* Pattern Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">What type of pattern?</Label>
                    <Select value={patternType} onValueChange={setPatternType}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select pattern type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PATTERN_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex flex-col">
                              <span>{type.label}</span>
                              <span className="text-xs text-muted-foreground">{type.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPatternInfo && (
                      <p className="text-xs text-muted-foreground">{selectedPatternInfo.description}</p>
                    )}
                  </div>

                  {/* Pattern Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      What does the AI see incorrectly?
                      <span className="text-muted-foreground ml-1">(describe the pattern)</span>
                    </Label>
                    <Textarea
                      value={patternDescription}
                      onChange={(e) => setPatternDescription(e.target.value)}
                      placeholder={
                        patternType === 'blank_page' 
                          ? "e.g., Empty WORK AREA and ANSWER box with only printed question text visible"
                          : patternType === 'handwriting'
                          ? "e.g., Student writes 4's that look like 9's"
                          : "Describe what the AI is misinterpreting..."
                      }
                      className="text-sm min-h-[60px]"
                    />
                  </div>

                  {/* Correct Interpretation */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      What is the CORRECT interpretation?
                      <span className="text-muted-foreground ml-1">(how should AI handle this)</span>
                    </Label>
                    <Textarea
                      value={correctInterpretation}
                      onChange={(e) => setCorrectInterpretation(e.target.value)}
                      placeholder={
                        patternType === 'blank_page'
                          ? "e.g., This is a blank submission - no student work present. Apply grade floor of 55 and Regents score of 0."
                          : patternType === 'handwriting'
                          ? "e.g., These are 4's not 9's - student consistently writes 4's in this style"
                          : "Explain the correct interpretation..."
                      }
                      className="text-sm min-h-[60px]"
                    />
                  </div>

                  {/* Save button */}
                  <Button
                    size="sm"
                    onClick={handleSaveInterpretation}
                    disabled={isSaving || !patternType || !patternDescription || !correctInterpretation}
                    className="w-full gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Pattern for AI Training
                  </Button>
                </div>
              </div>
            )}

            {/* Saved interpretations */}
            {savedInterpretations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  Saved Patterns ({savedInterpretations.length})
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {savedInterpretations.slice(0, 5).map((interp) => (
                    <div
                      key={interp.id}
                      className="border rounded-lg p-3 bg-white dark:bg-background space-y-1"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge variant="outline" className="text-[10px] mb-1">
                            {PATTERN_TYPES.find(p => p.value === interp.patternType)?.label || interp.patternType}
                          </Badge>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {interp.patternDescription}
                          </p>
                          <p className="text-xs font-medium text-green-600 mt-1 line-clamp-2">
                            → {interp.correctInterpretation}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteInterpretation(interp.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {savedInterpretations.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{savedInterpretations.length - 5} more patterns
                    </p>
                  )}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && savedInterpretations.length === 0 && !isAdding && (
              <p className="text-xs text-center text-muted-foreground py-2">
                No patterns saved yet. Add patterns to help the AI grade more accurately.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
