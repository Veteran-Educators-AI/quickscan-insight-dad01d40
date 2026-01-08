import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';

interface GradeOverrideDialogProps {
  currentGrade: number;
  currentJustification?: string;
  onOverride: (grade: number, justification: string) => void;
  disabled?: boolean;
}

export function GradeOverrideDialog({
  currentGrade,
  currentJustification,
  onOverride,
  disabled = false,
}: GradeOverrideDialogProps) {
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState(currentGrade);
  const [justification, setJustification] = useState(currentJustification || '');

  const handleSubmit = () => {
    if (justification.trim()) {
      onOverride(grade, justification.trim());
      setOpen(false);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled} className="gap-1">
          <Edit2 className="h-3.5 w-3.5" />
          Override
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Override AI Grade</DialogTitle>
          <DialogDescription>
            Set your own grade and provide a justification for the override.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="grade">Grade (55-100)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[grade]}
                onValueChange={([value]) => setGrade(value)}
                min={55}
                max={100}
                step={1}
                className="flex-1"
              />
              <Input
                id="grade"
                type="number"
                min={55}
                max={100}
                value={grade}
                onChange={(e) => setGrade(Math.min(100, Math.max(55, parseInt(e.target.value) || 55)))}
                className="w-20"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>55 (Below Standards)</span>
              <span className={`font-medium ${getGradeColor(grade)}`}>
                {grade >= 90 ? 'Exceeds' : grade >= 80 ? 'Meets' : grade >= 70 ? 'Approaching' : 'Below'} Standards
              </span>
              <span>100 (Exceeds)</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="justification">Justification (required)</Label>
            <Textarea
              id="justification"
              placeholder="Explain why you're overriding the AI grade..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!justification.trim()}>
            Save Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
