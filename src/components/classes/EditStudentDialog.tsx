import { useState } from 'react';
import { Pencil, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';

interface EditStudentDialogProps {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string | null;
    email: string | null;
  };
  classId: string;
  className?: string;
  onUpdate: () => void;
}

export function EditStudentDialog({
  student,
  classId,
  className,
  onUpdate,
}: EditStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(student.first_name);
  const [lastName, setLastName] = useState(student.last_name);
  const [studentIdValue, setStudentIdValue] = useState(student.student_id || '');
  const [email, setEmail] = useState(student.email || '');
  const [syncToScholar, setSyncToScholar] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { pushToSisterApp } = usePushToSisterApp();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Reset to current values when opening
      setFirstName(student.first_name);
      setLastName(student.last_name);
      setStudentIdValue(student.student_id || '');
      setEmail(student.email || '');
      setSyncToScholar(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: 'Error',
        description: 'First and last name are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          student_id: studentIdValue.trim() || null,
          email: email.trim() || null,
        })
        .eq('id', student.id);

      if (error) throw error;

      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // Sync to Scholar if enabled
      if (syncToScholar) {
        const pushResult = await pushToSisterApp({
          class_id: classId,
          title: 'Student Updated',
          student_id: student.id,
          student_name: fullName,
          // @ts-ignore - extended type
          type: 'student_updated',
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          student_email: email.trim() || undefined,
          class_name: className,
        });

        if (pushResult.success) {
          toast({
            title: 'Student updated',
            description: 'Changes saved and synced to Scholar',
          });
        } else {
          toast({
            title: 'Student updated',
            description: 'Saved locally. Scholar sync failed.',
          });
        }
      } else {
        toast({
          title: 'Student updated',
          description: 'Changes have been saved',
        });
      }

      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating student:', error);
      toast({
        title: 'Error',
        description: 'Failed to update student',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update student information
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name *</Label>
              <Input
                id="edit-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name *</Label>
              <Input
                id="edit-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-studentId">Student ID</Label>
            <Input
              id="edit-studentId"
              value={studentIdValue}
              onChange={(e) => setStudentIdValue(e.target.value)}
              placeholder="12345"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@school.edu"
            />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="syncToScholar"
              checked={syncToScholar}
              onCheckedChange={(checked) => setSyncToScholar(checked === true)}
            />
            <Label htmlFor="syncToScholar" className="text-sm font-normal flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-purple-500" />
              Sync changes to NYCLogic Scholar
            </Label>
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
