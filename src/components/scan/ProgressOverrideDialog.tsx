import { useState } from 'react';
import { Edit2, TrendingUp, TrendingDown, Minus, AlertTriangle, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ProgressOverrideDialogProps {
  currentMisconceptions: string[];
  currentFeedback: string;
  aiAnalysis: {
    approachAnalysis: string;
    regentsScore?: number;
  };
  onOverride: (overrides: {
    misconceptions: string[];
    feedback: string;
    progressNote: string;
    trend: 'improving' | 'stable' | 'needs-attention';
  }) => void;
  disabled?: boolean;
}

const TREND_OPTIONS = [
  {
    value: 'improving',
    label: 'Improving',
    icon: TrendingUp,
    description: 'Student shows improvement from previous work',
    color: 'text-green-600',
  },
  {
    value: 'stable',
    label: 'Stable',
    icon: Minus,
    description: 'Student is performing consistently',
    color: 'text-blue-600',
  },
  {
    value: 'needs-attention',
    label: 'Needs Attention',
    icon: TrendingDown,
    description: 'Student may need additional support',
    color: 'text-amber-600',
  },
];

export function ProgressOverrideDialog({
  currentMisconceptions,
  currentFeedback,
  aiAnalysis,
  onOverride,
  disabled = false,
}: ProgressOverrideDialogProps) {
  const [open, setOpen] = useState(false);
  const [misconceptionsText, setMisconceptionsText] = useState(currentMisconceptions.join('\n'));
  const [feedback, setFeedback] = useState(currentFeedback);
  const [progressNote, setProgressNote] = useState('');
  const [trend, setTrend] = useState<'improving' | 'stable' | 'needs-attention'>('stable');

  const handleSave = () => {
    const misconceptions = misconceptionsText
      .split('\n')
      .map(m => m.trim())
      .filter(m => m.length > 0);

    onOverride({
      misconceptions,
      feedback,
      progressNote,
      trend,
    });

    toast.success('Progress analysis updated');
    setOpen(false);
  };

  const handleReset = () => {
    setMisconceptionsText(currentMisconceptions.join('\n'));
    setFeedback(currentFeedback);
    setProgressNote('');
    setTrend('stable');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Edit2 className="h-4 w-4" />
          Override Progress Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Override Student Progress Analysis</DialogTitle>
          <DialogDescription>
            Modify the AI-generated misconceptions and feedback based on your professional judgment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* AI Analysis Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">AI Analysis Summary</p>
              <p className="text-sm line-clamp-2">{aiAnalysis.approachAnalysis || 'No analysis available'}</p>
              {aiAnalysis.regentsScore !== undefined && (
                <Badge variant="secondary" className="mt-2">
                  Regents Score: {aiAnalysis.regentsScore}/4
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Student Progress Trend */}
          <div className="space-y-2">
            <Label>Student Progress Trend</Label>
            <RadioGroup
              value={trend}
              onValueChange={(v) => setTrend(v as typeof trend)}
              className="grid grid-cols-3 gap-2"
            >
              {TREND_OPTIONS.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className="flex flex-col items-center gap-1 rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <option.icon className={`h-5 w-5 ${option.color}`} />
                    <span className="text-xs font-medium">{option.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Misconceptions Editor */}
          <div className="space-y-2">
            <Label htmlFor="misconceptions">Misconceptions (one per line)</Label>
            <Textarea
              id="misconceptions"
              value={misconceptionsText}
              onChange={(e) => setMisconceptionsText(e.target.value)}
              placeholder="Enter misconceptions, one per line..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Edit, add, or remove misconceptions identified by the AI
            </p>
          </div>

          {/* Feedback Editor */}
          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback for Student</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback..."
              className="min-h-[80px]"
            />
          </div>

          {/* Progress Note */}
          <div className="space-y-2">
            <Label htmlFor="progressNote">Teacher's Progress Note (Optional)</Label>
            <Textarea
              id="progressNote"
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="Add notes about the student's progress or areas to focus on..."
              className="min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground">
              This note will be saved with the student's record
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleReset} className="w-full sm:w-auto">
            Reset to AI Values
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-none gap-2">
              <Save className="h-4 w-4" />
              Save Override
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
