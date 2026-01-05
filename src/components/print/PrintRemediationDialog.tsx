import { useState, useEffect, useRef } from 'react';
import { Printer, Loader2 } from 'lucide-react';
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

interface Student {
  studentId: string;
  studentName: string;
  overallMastery: number;
}

interface WeakTopic {
  topicId: string;
  topicName: string;
  avgScore: number;
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
  students: Student[];
  weakTopics: WeakTopic[];
}

export function PrintRemediationDialog({
  open,
  onOpenChange,
  groupLabel,
  students,
  weakTopics,
}: PrintRemediationDialogProps) {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      fetchQuestionsForTopics();
      // Select all students by default
      setSelectedStudents(new Set(students.map(s => s.studentId)));
    } else {
      setShowPreview(false);
    }
  }, [open, students, weakTopics]);

  async function fetchQuestionsForTopics() {
    if (!user || weakTopics.length === 0) {
      setQuestions([]);
      return;
    }

    setLoading(true);
    try {
      const weakTopicIds = weakTopics.map(t => t.topicId);

      // Find questions that match these topics
      const { data: questionTopics, error: qtError } = await supabase
        .from('question_topics')
        .select(`
          question_id,
          topic_id,
          questions!inner(id, jmap_id, prompt_text, prompt_image_url, difficulty, teacher_id),
          topics!inner(name)
        `)
        .in('topic_id', weakTopicIds)
        .eq('questions.teacher_id', user.id);

      if (qtError) throw qtError;

      // Deduplicate and format questions
      const questionMap = new Map<string, Question>();
      questionTopics?.forEach(qt => {
        const q = qt.questions as any;
        const t = qt.topics as any;
        if (q && !questionMap.has(q.id)) {
          questionMap.set(q.id, {
            id: q.id,
            jmap_id: q.jmap_id,
            prompt_text: q.prompt_text,
            prompt_image_url: q.prompt_image_url,
            topicName: t?.name || 'Unknown',
          });
        }
      });

      const sortedQuestions = Array.from(questionMap.values()).slice(0, 10);
      setQuestions(sortedQuestions);
      
      // Auto-select up to 5 questions
      setSelectedQuestions(new Set(sortedQuestions.slice(0, 5).map(q => q.id)));
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

  const toggleQuestion = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else if (newSelected.size < 5) {
      newSelected.add(questionId);
    } else {
      toast.error('Maximum 5 questions allowed for remediation worksheets');
    }
    setSelectedQuestions(newSelected);
  };

  const selectAllStudents = () => {
    setSelectedStudents(new Set(students.map(s => s.studentId)));
  };

  const getSelectedStudents = () => {
    return students
      .filter(s => selectedStudents.has(s.studentId))
      .map(s => ({
        id: s.studentId,
        first_name: s.studentName.split(' ')[0] || '',
        last_name: s.studentName.split(' ').slice(1).join(' ') || '',
        student_id: null,
      }));
  };

  const getSelectedQuestions = () => questions.filter(q => selectedQuestions.has(q.id));

  const handlePrint = () => {
    if (selectedStudents.size === 0 || selectedQuestions.size === 0) {
      toast.error('Please select at least one student and one question');
      return;
    }
    setShowPreview(true);

    setTimeout(() => {
      window.print();
    }, 100);
  };

  const canPrint = selectedStudents.size > 0 && selectedQuestions.size > 0;
  const assessmentName = `Remediation - ${groupLabel}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Print Remediation Worksheets - {groupLabel}</DialogTitle>
            <DialogDescription>
              Generate worksheets with questions targeting weak topics for this student group (max 5 questions)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Weak Topics Summary */}
            <div className="bg-muted/50 rounded-lg p-3">
              <Label className="text-sm font-medium">Targeting Weak Topics:</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {weakTopics.map(topic => (
                  <Badge key={topic.topicId} variant="secondary" className="text-xs">
                    {topic.topicName} ({topic.avgScore}%)
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Students Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Students ({selectedStudents.size}/{students.length})</Label>
                  <Button variant="ghost" size="sm" onClick={selectAllStudents}>
                    Select All
                  </Button>
                </div>
                <ScrollArea className="h-48 border rounded-md p-2">
                  {students.map((student) => (
                    <div key={student.studentId} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`student-${student.studentId}`}
                        checked={selectedStudents.has(student.studentId)}
                        onCheckedChange={() => toggleStudent(student.studentId)}
                      />
                      <Label htmlFor={`student-${student.studentId}`} className="text-sm cursor-pointer flex-1">
                        {student.studentName}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {student.overallMastery}%
                      </Badge>
                    </div>
                  ))}
                  {students.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No students in this group
                    </p>
                  )}
                </ScrollArea>
              </div>

              {/* Questions Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Questions ({selectedQuestions.size}/5 max)</Label>
                </div>
                <ScrollArea className="h-48 border rounded-md p-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    questions.map((question) => (
                      <div key={question.id} className="flex items-center gap-2 py-1">
                        <Checkbox
                          id={`question-${question.id}`}
                          checked={selectedQuestions.has(question.id)}
                          onCheckedChange={() => toggleQuestion(question.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={`question-${question.id}`} className="text-sm cursor-pointer block truncate">
                            {question.jmap_id || question.prompt_text?.slice(0, 40) || 'Question'}
                          </Label>
                          {question.topicName && (
                            <span className="text-xs text-muted-foreground">{question.topicName}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {!loading && questions.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      <p>No questions found for these topics.</p>
                      <p className="text-xs mt-1">Create questions tagged with these topics first.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p>
                <strong>Ready to print:</strong> {selectedStudents.size} worksheet(s) with {selectedQuestions.size} question(s) each
              </p>
              <p className="text-muted-foreground mt-1">
                Each worksheet includes QR codes for automatic student identification when scanning.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint} disabled={!canPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print {selectedStudents.size} Worksheet(s)
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
            {getSelectedStudents().map((student) => (
              <PrintableWorksheet
                key={student.id}
                student={student}
                questions={getSelectedQuestions()}
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
