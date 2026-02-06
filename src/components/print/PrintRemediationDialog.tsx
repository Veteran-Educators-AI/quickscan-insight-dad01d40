import { useState, useEffect, useRef } from 'react';
import { Printer, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { PrintableWorksheet } from './PrintableWorksheet';

export interface StudentWithWeakTopics {
  studentId: string;
  studentName: string;
  overallMastery: number;
  weakTopics: { topicId: string; topicName: string; avgScore: number }[];
}

interface Question {
  id: string;
  jmap_id: string | null;
  prompt_text: string | null;
  prompt_image_url: string | null;
  topicName?: string;
}

interface PrintRemediationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupLabel: string;
  students: StudentWithWeakTopics[];
}

export function PrintRemediationDialog({
  open,
  onOpenChange,
  groupLabel,
  students,
}: PrintRemediationDialogProps) {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentQuestions, setStudentQuestions] = useState<Map<string, Question[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedStudents(new Set(students.map(s => s.studentId)));
      fetchQuestionsForAllStudents();
    } else {
      setShowPreview(false);
    }
  }, [open, students]);

  async function fetchQuestionsForAllStudents() {
    if (!user || students.length === 0) {
      setStudentQuestions(new Map());
      return;
    }

    setLoading(true);
    try {
      const newMap = new Map<string, Question[]>();

      // Collect all unique topic IDs across all students
      const allTopicIds = new Set<string>();
      students.forEach(s => s.weakTopics.forEach(t => allTopicIds.add(t.topicId)));

      if (allTopicIds.size === 0) {
        setStudentQuestions(newMap);
        return;
      }

      // Fetch all questions for all weak topics in one query
      const { data: questionTopics, error: qtError } = await supabase
        .from('question_topics')
        .select(`
          question_id,
          topic_id,
          questions!inner(id, jmap_id, prompt_text, prompt_image_url, difficulty, teacher_id),
          topics!inner(name)
        `)
        .in('topic_id', Array.from(allTopicIds))
        .eq('questions.teacher_id', user.id);

      if (qtError) throw qtError;

      // Build a map of topicId -> questions
      const topicQuestions = new Map<string, Question[]>();
      questionTopics?.forEach(qt => {
        const q = qt.questions as any;
        const t = qt.topics as any;
        if (q) {
          const question: Question = {
            id: q.id,
            jmap_id: q.jmap_id,
            prompt_text: q.prompt_text,
            prompt_image_url: q.prompt_image_url,
            topicName: t?.name || 'Unknown',
          };
          if (!topicQuestions.has(qt.topic_id)) {
            topicQuestions.set(qt.topic_id, []);
          }
          const existing = topicQuestions.get(qt.topic_id)!;
          if (!existing.find(eq => eq.id === question.id)) {
            existing.push(question);
          }
        }
      });

      // For each student, pick up to 5 questions from their individual weak topics
      students.forEach(student => {
        const questions: Question[] = [];
        const usedIds = new Set<string>();

        for (const weakTopic of student.weakTopics) {
          const available = topicQuestions.get(weakTopic.topicId) || [];
          for (const q of available) {
            if (!usedIds.has(q.id) && questions.length < 5) {
              questions.push(q);
              usedIds.add(q.id);
            }
          }
          if (questions.length >= 5) break;
        }

        newMap.set(student.studentId, questions);
      });

      setStudentQuestions(newMap);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const selectAllStudents = () => {
    setSelectedStudents(new Set(students.map(s => s.studentId)));
  };

  const deselectAllStudents = () => {
    setSelectedStudents(new Set());
  };

  const getStudentForWorksheet = (student: StudentWithWeakTopics) => ({
    id: student.studentId,
    first_name: student.studentName.split(' ')[0] || '',
    last_name: student.studentName.split(' ').slice(1).join(' ') || '',
    student_id: null,
  });

  const handlePrint = () => {
    const studentsWithQuestions = students.filter(
      s => selectedStudents.has(s.studentId) && (studentQuestions.get(s.studentId)?.length || 0) > 0
    );

    if (studentsWithQuestions.length === 0) {
      toast.error('No selected students have matching questions');
      return;
    }

    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const selectedCount = students.filter(s => selectedStudents.has(s.studentId)).length;
  const printableCount = students.filter(
    s => selectedStudents.has(s.studentId) && (studentQuestions.get(s.studentId)?.length || 0) > 0
  ).length;
  const canPrint = printableCount > 0 && !loading;
  const assessmentName = `Remediation - ${groupLabel}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Print Personalized Remediation - {groupLabel}</DialogTitle>
            <DialogDescription>
              Each student receives different questions based on their individual weak topics (max 5 questions per student)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Students with their individual weak topics and questions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Students ({selectedCount}/{students.length} selected)</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllStudents}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllStudents}>
                    Deselect All
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[350px] border rounded-md">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Loading personalized questions...</span>
                  </div>
                ) : (
                  <div className="divide-y">
                    {students.map((student) => {
                      const questions = studentQuestions.get(student.studentId) || [];
                      const isSelected = selectedStudents.has(student.studentId);

                      return (
                        <div
                          key={student.studentId}
                          className={`p-3 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id={`student-${student.studentId}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleStudent(student.studentId)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor={`student-${student.studentId}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {student.studentName}
                                </Label>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {student.overallMastery}%
                                </Badge>
                                <Badge
                                  variant={questions.length > 0 ? 'secondary' : 'destructive'}
                                  className="text-xs shrink-0"
                                >
                                  {questions.length} Q{questions.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>

                              {/* Per-student weak topics */}
                              {student.weakTopics.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {student.weakTopics.map(topic => (
                                    <Badge
                                      key={topic.topicId}
                                      variant="outline"
                                      className="text-xs font-normal text-muted-foreground"
                                    >
                                      {topic.topicName} ({topic.avgScore}%)
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-1">
                                  No weak topics identified
                                </p>
                              )}

                              {/* Per-student question preview */}
                              {questions.length > 0 && (
                                <div className="mt-1.5 text-xs text-muted-foreground">
                                  Questions: {questions.map(q => q.jmap_id || q.topicName || 'Q').join(', ')}
                                </div>
                              )}
                              {questions.length === 0 && student.weakTopics.length > 0 && (
                                <p className="text-xs text-amber-600 mt-1">
                                  No matching questions found — create questions tagged with these topics
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p>
                <strong>Ready to print:</strong> {printableCount} personalized worksheet{printableCount !== 1 ? 's' : ''}
              </p>
              <p className="text-muted-foreground mt-1">
                Each worksheet targets the student's individual weak topics with up to 5 unique questions. QR codes are included for automatic student identification when scanning.
              </p>
              {selectedCount > printableCount && (
                <p className="text-amber-600 mt-1 text-xs">
                  {selectedCount - printableCount} selected student(s) have no matching questions and will be skipped.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint} disabled={!canPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print {printableCount} Worksheet{printableCount !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Content */}
      {showPreview && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto print:static print:overflow-visible">
          <div className="print:hidden p-4 bg-muted border-b flex items-center justify-between">
            <p>Print preview - press Ctrl+P or Cmd+P to print</p>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </div>
          <div ref={printRef}>
            {students
              .filter(s => selectedStudents.has(s.studentId) && (studentQuestions.get(s.studentId)?.length || 0) > 0)
              .map((student) => (
                <PrintableWorksheet
                  key={student.studentId}
                  student={getStudentForWorksheet(student)}
                  questions={studentQuestions.get(student.studentId) || []}
                  assessmentName={assessmentName}
                />
              ))}
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-worksheet, .print-worksheet * {
            visibility: visible;
          }
          .print-worksheet {
            position: absolute;
            left: 0;
            top: 0;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </>
  );
}
