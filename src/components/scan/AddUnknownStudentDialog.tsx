import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddUnknownStudentDialogProps {
  classId: string;
  detectedName?: string | null;
  onStudentCreated: (studentId: string, studentName: string) => void;
  trigger?: React.ReactNode;
}

export function AddUnknownStudentDialog({
  classId,
  detectedName,
  onStudentCreated,
  trigger,
}: AddUnknownStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');

  // Parse detected name into first/last when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && detectedName) {
      const parts = detectedName.trim().split(/\s+/);
      if (parts.length >= 2) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(' '));
      } else if (parts.length === 1) {
        setFirstName(parts[0]);
        setLastName('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .insert({
          class_id: classId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          student_id: studentId.trim() || null,
          email: email.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      const fullName = `${data.first_name} ${data.last_name}`;
      toast.success(`Added ${fullName} to class`);
      onStudentCreated(data.id, fullName);
      
      // Reset form
      setFirstName('');
      setLastName('');
      setStudentId('');
      setEmail('');
      setOpen(false);
    } catch (error: any) {
      console.error('Error creating student:', error);
      toast.error(error.message || 'Failed to add student');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1">
            <UserPlus className="h-3 w-3" />
            Add New Student
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Unknown Student to Roster</DialogTitle>
            <DialogDescription>
              This student wasn't found in the class roster. Add them now to link this work.
              {detectedName && (
                <span className="block mt-2 text-foreground font-medium">
                  Detected name: "{detectedName}"
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID (optional)</Label>
              <Input
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="12345"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@school.edu"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Adding...' : 'Add Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
