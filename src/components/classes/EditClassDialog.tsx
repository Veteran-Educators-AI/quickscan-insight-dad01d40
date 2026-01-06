import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditClassDialogProps {
  classId: string;
  currentName: string;
  currentPeriod: string | null;
  currentYear: string | null;
  onUpdate: () => void;
}

export function EditClassDialog({
  classId,
  currentName,
  currentPeriod,
  currentYear,
  onUpdate,
}: EditClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [period, setPeriod] = useState(currentPeriod || '');
  const [year, setYear] = useState(currentYear || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Class name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: name.trim(),
          class_period: period.trim() || null,
          school_year: year.trim() || null,
        })
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: 'Class updated',
        description: 'Class details have been saved',
      });
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating class:', error);
      toast({
        title: 'Error',
        description: 'Failed to update class',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>
            Update class name, period, and school year
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Class Name *</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Algebra 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-period">Class Period</Label>
            <Input
              id="class-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g., Period 3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-year">School Year</Label>
            <Input
              id="school-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 2024-2025"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
