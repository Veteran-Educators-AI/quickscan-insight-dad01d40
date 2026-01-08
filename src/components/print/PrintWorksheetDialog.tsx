import { useState, useEffect, useRef } from 'react';
import { Printer, Check, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PrintableWorksheet } from './PrintableWorksheet';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
}

interface Question {
  id: string;
  jmap_id: string | null;
  prompt_text: string | null;
  prompt_image_url: string | null;
}

interface PrintWorksheetDialogProps {
  classId: string;
  students: Student[];
  trigger?: React.ReactNode;
}

export function PrintWorksheetDialog({ classId, students, trigger }: PrintWorksheetDialogProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [open, setOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [assessmentName, setAssessmentName] = useState('Geometry Assessment');
  const [showPreview, setShowPreview] = useState(false);
  const [includeQRCodes, setIncludeQRCodes] = useState(true);

  useEffect(() => {
    if (open) {
      fetchQuestions();
      // Select all students by default
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  }, [open, students]);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('id, jmap_id, prompt_text, prompt_image_url')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load questions',
        variant: 'destructive',
      });
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
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const selectAllStudents = () => {
    setSelectedStudents(new Set(students.map(s => s.id)));
  };

  const selectAllQuestions = () => {
    setSelectedQuestions(new Set(questions.map(q => q.id)));
  };

  const getSelectedStudents = () => students.filter(s => selectedStudents.has(s.id));
  const getSelectedQuestions = () => questions.filter(q => selectedQuestions.has(q.id));

  const handlePrint = () => {
    if (selectedStudents.size === 0 || selectedQuestions.size === 0) {
      toast({
        title: 'Selection required',
        description: 'Please select at least one student and one question',
        variant: 'destructive',
      });
      return;
    }
    setShowPreview(true);
    
    // Wait for render then print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const canPrint = selectedStudents.size > 0 && selectedQuestions.size > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print Worksheets
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Print Worksheets with QR Codes</DialogTitle>
            <DialogDescription>
              Generate personalized worksheets with QR codes for automatic student identification when scanning
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Assessment Name */}
            <div className="space-y-2">
              <Label htmlFor="assessmentName">Assessment Name</Label>
              <Input
                id="assessmentName"
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                placeholder="Enter assessment name"
              />
            </div>

            {/* QR Code Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="qr-toggle" className="flex items-center gap-2 cursor-pointer">
                  <QrCode className="h-4 w-4 text-primary" />
                  Embed Student QR Codes
                </Label>
                <p className="text-xs text-muted-foreground">
                  Each worksheet will have QR codes linking student to each question for auto-identification during scanning
                </p>
              </div>
              <Switch
                id="qr-toggle"
                checked={includeQRCodes}
                onCheckedChange={setIncludeQRCodes}
              />
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
                    <div key={student.id} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                      <Label htmlFor={`student-${student.id}`} className="text-sm cursor-pointer">
                        {student.last_name}, {student.first_name}
                      </Label>
                    </div>
                  ))}
                  {students.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No students in this class
                    </p>
                  )}
                </ScrollArea>
              </div>

              {/* Questions Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Questions ({selectedQuestions.size}/{questions.length})</Label>
                  <Button variant="ghost" size="sm" onClick={selectAllQuestions}>
                    Select All
                  </Button>
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
                        <Label htmlFor={`question-${question.id}`} className="text-sm cursor-pointer truncate">
                          {question.jmap_id || question.prompt_text?.slice(0, 50) || 'Question'}
                        </Label>
                      </div>
                    ))
                  )}
                  {!loading && questions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No questions available
                    </p>
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
                Each worksheet includes QR codes that encode the student ID and question ID for automatic detection during scanning.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
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
                showQRCodes={includeQRCodes}
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
