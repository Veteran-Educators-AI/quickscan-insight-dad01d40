import { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface RubricStep {
  step_number: number;
  description: string;
  points: number;
}

interface ManualScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface ManualScoringFormProps {
  rubricSteps: RubricStep[];
  imageUrl: string;
  solutionUrl?: string;
  initialSuggestions?: {
    scores: ManualScore[];
    misconceptions: string[];
    feedback: string;
  };
  onSubmit: (result: {
    rubricScores: ManualScore[];
    totalScore: { earned: number; possible: number; percentage: number };
    feedback: string;
    misconceptions: string[];
  }) => void;
  onCancel: () => void;
}

export function ManualScoringForm({ 
  rubricSteps, 
  imageUrl,
  solutionUrl,
  initialSuggestions,
  onSubmit, 
  onCancel 
}: ManualScoringFormProps) {
  const [scores, setScores] = useState<ManualScore[]>(() => {
    if (initialSuggestions?.scores && initialSuggestions.scores.length > 0) {
      return initialSuggestions.scores;
    }
    return rubricSteps.map(step => ({
      criterion: step.description,
      score: 0,
      maxScore: step.points,
      feedback: '',
    }));
  });
  const [overallFeedback, setOverallFeedback] = useState(initialSuggestions?.feedback || '');
  const [misconceptions, setMisconceptions] = useState<string[]>(initialSuggestions?.misconceptions || []);
  const [newMisconception, setNewMisconception] = useState('');

  const updateScore = (index: number, value: number) => {
    setScores(prev => prev.map((s, i) => 
      i === index ? { ...s, score: value } : s
    ));
  };

  const updateFeedback = (index: number, feedback: string) => {
    setScores(prev => prev.map((s, i) => 
      i === index ? { ...s, feedback } : s
    ));
  };

  const addMisconception = () => {
    if (newMisconception.trim()) {
      setMisconceptions(prev => [...prev, newMisconception.trim()]);
      setNewMisconception('');
    }
  };

  const removeMisconception = (index: number) => {
    setMisconceptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const earned = scores.reduce((sum, s) => sum + s.score, 0);
    const possible = scores.reduce((sum, s) => sum + s.maxScore, 0);
    const percentage = possible > 0 ? Math.round((earned / possible) * 100) : 0;

    onSubmit({
      rubricScores: scores,
      totalScore: { earned, possible, percentage },
      feedback: overallFeedback,
      misconceptions,
    });
  };

  const totalEarned = scores.reduce((sum, s) => sum + s.score, 0);
  const totalPossible = scores.reduce((sum, s) => sum + s.maxScore, 0);
  const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Image Preview - Side by side if solution available */}
      <Card>
        <CardContent className="p-4">
          {solutionUrl ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center font-medium">Student Work</p>
                <img 
                  src={imageUrl} 
                  alt="Student work" 
                  className="w-full object-contain max-h-48 rounded-md border" 
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center font-medium">Solution</p>
                <img 
                  src={solutionUrl} 
                  alt="Solution" 
                  className="w-full object-contain max-h-48 rounded-md border" 
                />
              </div>
            </div>
          ) : (
            <img 
              src={imageUrl} 
              alt="Student work" 
              className="w-full object-contain max-h-48 rounded-md" 
            />
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions Banner */}
      {initialSuggestions && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <p className="text-sm text-primary font-medium flex items-center gap-2">
            <span className="text-lg">✨</span>
            AI-suggested scores applied. Review and adjust as needed.
          </p>
        </div>
      )}

      {/* Score Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Manual Scoring</span>
            <Badge variant={percentage >= 70 ? 'default' : 'destructive'}>
              {totalEarned} / {totalPossible} ({percentage}%)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rubric Scoring */}
          {scores.map((score, index) => (
            <div key={index} className="space-y-3 pb-4 border-b last:border-b-0">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {index + 1}. {score.criterion}
                </Label>
                <span className="text-sm font-bold text-primary">
                  {score.score} / {score.maxScore}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <Slider
                  value={[score.score]}
                  onValueChange={([value]) => updateScore(index, value)}
                  max={score.maxScore}
                  step={1}
                  className="flex-1"
                />
                <div className="flex gap-1">
                  {Array.from({ length: score.maxScore + 1 }, (_, i) => (
                    <Button
                      key={i}
                      variant={score.score === i ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => updateScore(index, i)}
                    >
                      {i}
                    </Button>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Optional feedback for this criterion..."
                value={score.feedback}
                onChange={(e) => updateFeedback(index, e.target.value)}
                className="text-sm min-h-[60px]"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Misconceptions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Misconceptions Identified</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {misconceptions.length > 0 && (
            <div className="space-y-2">
              {misconceptions.map((m, index) => (
                <div key={index} className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded-md">
                  <span className="flex-1 text-sm">{m}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeMisconception(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              placeholder="Add a misconception..."
              value={newMisconception}
              onChange={(e) => setNewMisconception(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMisconception()}
            />
            <Button variant="outline" size="icon" onClick={addMisconception}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overall Feedback */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overall Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter overall feedback and suggestions for the student..."
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="hero" className="flex-1" onClick={handleSubmit}>
          <Save className="h-4 w-4 mr-2" />
          Save Score
        </Button>
      </div>
    </div>
  );
}