import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Users, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignWorksheetDialogProps {
  worksheetId: string;
  worksheetTitle: string;
  trigger?: React.ReactNode;
  onAssigned?: () => void;
}

export function AssignWorksheetDialog({ 
  worksheetId, 
  worksheetTitle, 
  trigger,
  onAssigned 
}: AssignWorksheetDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user!.id)
        .is('archived_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  // Fetch students for selected class
  const { data: students } = useQuery({
    queryKey: ['class-students', selectedClassId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', selectedClassId)
        .order('last_name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClassId,
  });

  // Assign worksheet mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassId || !students) {
        throw new Error('Please select a class');
      }

      // Update worksheet with assignment info
      const { error: worksheetError } = await supabase
        .from('worksheets')
        .update({
          class_id: selectedClassId,
          due_date: dueDate?.toISOString() || null,
          is_assigned: true,
        })
        .eq('id', worksheetId);

      if (worksheetError) throw worksheetError;

      // Create submission records for each student
      const submissions = students.map(student => ({
        worksheet_id: worksheetId,
        student_id: student.id,
        class_id: selectedClassId,
        status: 'pending' as const,
      }));

      const { error: submissionsError } = await supabase
        .from('worksheet_submissions')
        .upsert(submissions, { onConflict: 'worksheet_id,student_id' });

      if (submissionsError) throw submissionsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-worksheets'] });
      queryClient.invalidateQueries({ queryKey: ['worksheets'] });
      toast({
        title: 'Worksheet assigned',
        description: `"${worksheetTitle}" assigned to ${students?.length} students`,
      });
      setOpen(false);
      onAssigned?.();
    },
    onError: (error) => {
      console.error('Assign error:', error);
      toast({
        title: 'Failed to assign worksheet',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Assign
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Assign Worksheet
          </DialogTitle>
          <DialogDescription>
            Assign "{worksheetTitle}" to a class and set a due date to track submissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Class Selection */}
          <div className="space-y-2">
            <Label>Select Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent>
                {classes?.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClassId && students && (
              <p className="text-sm text-muted-foreground">
                {students.length} students will receive this assignment
              </p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Select due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {dueDate && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Due: {format(dueDate, 'MMM d, yyyy')}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setDueDate(undefined)}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!selectedClassId || assignMutation.isPending}
          >
            {assignMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Assign to {students?.length || 0} Students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
