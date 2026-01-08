import { useState, useEffect } from 'react';
import { Mail, Users, Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStudentNames } from '@/lib/StudentNameContext';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  class_id: string;
}

interface ClassGroup {
  id: string;
  name: string;
  students: Student[];
}

interface EmailQuestionDialogProps {
  questionId: string;
  questionTitle?: string;
  trigger?: React.ReactNode;
}

const DEFAULT_CHOICES = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
];

export function EmailQuestionDialog({ questionId, questionTitle, trigger }: EmailQuestionDialogProps) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [answerChoices, setAnswerChoices] = useState(DEFAULT_CHOICES);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const { toast } = useToast();
  const { getDisplayName } = useStudentNames();

  useEffect(() => {
    if (open) {
      fetchStudents();
    }
  }, [open]);

  async function fetchStudents() {
    setLoading(true);
    try {
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');

      if (classesError) throw classesError;

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, class_id')
        .order('last_name');

      if (studentsError) throw studentsError;

      const grouped = (classesData || []).map((cls) => ({
        ...cls,
        students: (studentsData || []).filter((s) => s.class_id === cls.id),
      }));

      setClasses(grouped);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function toggleStudent(studentId: string) {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }

  function toggleClass(classGroup: ClassGroup) {
    const studentsWithEmail = classGroup.students.filter((s) => s.email);
    const allSelected = studentsWithEmail.every((s) => selectedStudents.has(s.id));

    setSelectedStudents((prev) => {
      const next = new Set(prev);
      studentsWithEmail.forEach((s) => {
        if (allSelected) {
          next.delete(s.id);
        } else {
          next.add(s.id);
        }
      });
      return next;
    });
  }

  function updateChoice(index: number, label: string) {
    setAnswerChoices((prev) =>
      prev.map((c, i) => (i === index ? { label, value: label } : c))
    );
  }

  async function sendEmails() {
    if (selectedStudents.size === 0) {
      toast({
        title: 'No students selected',
        description: 'Please select at least one student with an email address',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    setSentCount(0);

    const studentIds = Array.from(selectedStudents);
    let successCount = 0;
    let failCount = 0;

    for (const studentId of studentIds) {
      try {
        const { error } = await supabase.functions.invoke('send-student-questions', {
          body: {
            studentId,
            questionId,
            answerChoices,
          },
        });

        if (error) throw error;
        successCount++;
        setSentCount(successCount);
      } catch (error) {
        console.error(`Failed to send to student ${studentId}:`, error);
        failCount++;
      }
    }

    setSending(false);

    if (successCount > 0) {
      toast({
        title: 'Emails sent',
        description: `Successfully sent to ${successCount} student${successCount > 1 ? 's' : ''}${failCount > 0 ? `. ${failCount} failed.` : ''}`,
      });
    }

    if (failCount > 0 && successCount === 0) {
      toast({
        title: 'Failed to send',
        description: 'Could not send emails. Please try again.',
        variant: 'destructive',
      });
    }

    if (successCount > 0) {
      setOpen(false);
      setSelectedStudents(new Set());
    }
  }

  const totalWithEmail = classes.reduce(
    (acc, cls) => acc + cls.students.filter((s) => s.email).length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Email to Students
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Question to Students
          </DialogTitle>
          <DialogDescription>
            {questionTitle
              ? `Send "${questionTitle}" to selected students`
              : 'Select students to receive this question via email'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Answer Choices */}
          <div className="space-y-2">
            <Label>Answer Choices</Label>
            <div className="flex gap-2">
              {answerChoices.map((choice, i) => (
                <Input
                  key={i}
                  value={choice.label}
                  onChange={(e) => updateChoice(i, e.target.value)}
                  className="w-16 text-center"
                  maxLength={10}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Customize the answer choices that will appear as buttons in the email
            </p>
          </div>

          {/* Student Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Select Students ({selectedStudents.size} selected)
            </Label>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : totalWithEmail === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No students with email addresses found.</p>
                <p className="text-sm">Add email addresses to students to send questions.</p>
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-md p-3">
                <div className="space-y-4">
                  {classes.map((cls) => {
                    const studentsWithEmail = cls.students.filter((s) => s.email);
                    if (studentsWithEmail.length === 0) return null;

                    const allSelected = studentsWithEmail.every((s) =>
                      selectedStudents.has(s.id)
                    );
                    const someSelected =
                      !allSelected &&
                      studentsWithEmail.some((s) => selectedStudents.has(s.id));

                    return (
                      <div key={cls.id} className="space-y-2">
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                          onClick={() => toggleClass(cls)}
                        >
                          <Checkbox
                            checked={allSelected}
                            className={someSelected ? 'opacity-50' : ''}
                          />
                          <span className="font-medium text-sm">{cls.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({studentsWithEmail.length})
                          </span>
                        </div>
                        <div className="pl-6 space-y-1">
                          {studentsWithEmail.map((student) => (
                            <div
                              key={student.id}
                              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                              onClick={() => toggleStudent(student.id)}
                            >
                              <Checkbox checked={selectedStudents.has(student.id)} />
                              <span className="text-sm">
                                {getDisplayName(student.id, student.first_name, student.last_name)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Send Button */}
          <Button
            onClick={sendEmails}
            disabled={sending || selectedStudents.size === 0}
            className="w-full"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending... ({sentCount}/{selectedStudents.size})
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send to {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
