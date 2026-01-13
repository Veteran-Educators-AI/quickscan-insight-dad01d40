import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';

export interface RubricCriterion {
  id: string;
  name: string;
  weight: number;
  description: string;
  regentsAlignment: string;
}

export interface CustomRubric {
  id: string;
  name: string;
  totalPoints: number;
  passingThreshold: number;
  criteria: RubricCriterion[];
}

const DEFAULT_RUBRIC: CustomRubric = {
  id: 'default',
  name: 'NYS Regents Aligned Rubric',
  totalPoints: 100,
  passingThreshold: 65,
  criteria: [
    {
      id: '1',
      name: 'Mathematical Procedure',
      weight: 30,
      description: 'Student correctly applies mathematical procedures and formulas',
      regentsAlignment: 'Aligns with Regents Score 4: Complete and correct mathematical procedures',
    },
    {
      id: '2',
      name: 'Problem Setup & Understanding',
      weight: 25,
      description: 'Student demonstrates understanding of the problem and sets up the solution correctly',
      regentsAlignment: 'Aligns with conceptual understanding requirements in NYS standards',
    },
    {
      id: '3',
      name: 'Work Shown & Organization',
      weight: 20,
      description: 'Student shows clear, logical work with proper mathematical notation',
      regentsAlignment: 'Required for Regents Score 3+: Work is well-organized and clearly communicated',
    },
    {
      id: '4',
      name: 'Final Answer',
      weight: 15,
      description: 'Student arrives at the correct final answer with proper units/labels',
      regentsAlignment: 'Determines distinction between Score 2 and Score 3+',
    },
    {
      id: '5',
      name: 'Mathematical Communication',
      weight: 10,
      description: 'Student uses proper mathematical vocabulary and explains reasoning',
      regentsAlignment: 'Contributes to exceeding standards (Score 4)',
    },
  ],
};

const STORAGE_KEY = 'custom-grading-rubric';

export function CustomRubricSettings() {
  const [rubric, setRubric] = useState<CustomRubric>(DEFAULT_RUBRIC);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRubric(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved rubric:', e);
      }
    }
  }, []);

  const updateRubric = (updates: Partial<CustomRubric>) => {
    setRubric(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateCriterion = (id: string, updates: Partial<RubricCriterion>) => {
    setRubric(prev => ({
      ...prev,
      criteria: prev.criteria.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
    setHasChanges(true);
  };

  const addCriterion = () => {
    const newCriterion: RubricCriterion = {
      id: Date.now().toString(),
      name: 'New Criterion',
      weight: 10,
      description: 'Describe what this criterion measures',
      regentsAlignment: 'Describe how this aligns with NYS Regents standards',
    };
    setRubric(prev => ({
      ...prev,
      criteria: [...prev.criteria, newCriterion],
    }));
    setHasChanges(true);
  };

  const removeCriterion = (id: string) => {
    setRubric(prev => ({
      ...prev,
      criteria: prev.criteria.filter(c => c.id !== id),
    }));
    setHasChanges(true);
  };

  const saveRubric = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rubric));
    setHasChanges(false);
    toast.success('Rubric saved successfully');
  };

  const resetToDefault = () => {
    setRubric(DEFAULT_RUBRIC);
    localStorage.removeItem(STORAGE_KEY);
    setHasChanges(false);
    toast.info('Rubric reset to default');
  };

  const totalWeight = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Custom Grading Rubric
          <Badge variant="outline" className="ml-2">NYS Aligned</Badge>
        </CardTitle>
        <CardDescription>
          Create your own rubric that automatically calibrates to NYS Regents standards (0-4 scale → 55-100 grade)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rubric Name and Settings */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rubric-name">Rubric Name</Label>
            <Input
              id="rubric-name"
              value={rubric.name}
              onChange={(e) => updateRubric({ name: e.target.value })}
              placeholder="My Custom Rubric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total-points">Total Points</Label>
            <Input
              id="total-points"
              type="number"
              value={rubric.totalPoints}
              onChange={(e) => updateRubric({ totalPoints: parseInt(e.target.value) || 100 })}
              min={1}
              max={1000}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Passing Threshold: {rubric.passingThreshold}%</Label>
          <Slider
            value={[rubric.passingThreshold]}
            onValueChange={([value]) => updateRubric({ passingThreshold: value })}
            min={50}
            max={80}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Students scoring below this threshold are considered "Not Meeting Standards"
          </p>
        </div>

        {/* Weight Summary */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            Total Weight: <strong className={totalWeight !== 100 ? 'text-destructive' : 'text-green-600'}>{totalWeight}%</strong>
            {totalWeight !== 100 && <span className="text-destructive ml-2">(should equal 100%)</span>}
          </span>
        </div>

        {/* NYS Regents Conversion Guide */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="conversion">
            <AccordionTrigger className="text-sm">
              NYS Regents Score Conversion Guide
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between p-2 bg-green-500/10 rounded">
                  <span><strong>Score 4</strong> - Exceeding Standards</span>
                  <span className="font-mono">90-100</span>
                </div>
                <div className="flex justify-between p-2 bg-blue-500/10 rounded">
                  <span><strong>Score 3</strong> - Meeting Standards</span>
                  <span className="font-mono">80-89</span>
                </div>
                <div className="flex justify-between p-2 bg-yellow-500/10 rounded">
                  <span><strong>Score 2</strong> - Approaching Standards</span>
                  <span className="font-mono">65-79</span>
                </div>
                <div className="flex justify-between p-2 bg-orange-500/10 rounded">
                  <span><strong>Score 1</strong> - Partially Meeting</span>
                  <span className="font-mono">55-64</span>
                </div>
                <div className="flex justify-between p-2 bg-red-500/10 rounded">
                  <span><strong>Score 0</strong> - Not Meeting Standards</span>
                  <span className="font-mono">55 (min)</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Criteria List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">Rubric Criteria</Label>
            <Button variant="outline" size="sm" onClick={addCriterion}>
              <Plus className="h-4 w-4 mr-1" />
              Add Criterion
            </Button>
          </div>

          <div className="space-y-3">
            {rubric.criteria.map((criterion, index) => (
              <Card key={criterion.id} className="border-l-4 border-l-primary/50">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Criterion Name</Label>
                          <Input
                            value={criterion.name}
                            onChange={(e) => updateCriterion(criterion.id, { name: e.target.value })}
                            placeholder="e.g., Mathematical Procedure"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Weight: {criterion.weight}%</Label>
                          <Slider
                            value={[criterion.weight]}
                            onValueChange={([value]) => updateCriterion(criterion.id, { weight: value })}
                            min={5}
                            max={50}
                            step={5}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={criterion.description}
                          onChange={(e) => updateCriterion(criterion.id, { description: e.target.value })}
                          placeholder="What does this criterion measure?"
                          rows={2}
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">NYS Standards Alignment</Label>
                        <Input
                          value={criterion.regentsAlignment}
                          onChange={(e) => updateCriterion(criterion.id, { regentsAlignment: e.target.value })}
                          placeholder="How does this align with NYS Regents scoring?"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriterion(criterion.id)}
                      className="text-destructive hover:text-destructive"
                      disabled={rubric.criteria.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={saveRubric} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Rubric
          </Button>
          <Button variant="outline" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to get the current custom rubric for use in analysis
export function useCustomRubric(): CustomRubric | null {
  const [rubric, setRubric] = useState<CustomRubric | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRubric(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load rubric:', e);
      }
    }
  }, []);

  return rubric;
}
