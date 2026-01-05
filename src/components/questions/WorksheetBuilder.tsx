import { useState, useRef, useEffect } from 'react';
import { Download, Printer, FileText, X, Sparkles, Loader2, Save, FolderOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import jsPDF from 'jspdf';

export interface WorksheetQuestion {
  id: string;
  topicName: string;
  standard: string;
  jmapUrl: string;
  subject: string;
  category: string;
}

interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  difficulty: 'medium' | 'hard' | 'challenging';
}

interface SavedWorksheet {
  id: string;
  title: string;
  teacher_name: string | null;
  questions: GeneratedQuestion[];
  topics: WorksheetQuestion[];
  settings: {
    questionCount: string;
    difficultyFilter: string[];
    showAnswerLines: boolean;
  };
  created_at: string;
}

interface WorksheetBuilderProps {
  selectedQuestions: WorksheetQuestion[];
  onRemoveQuestion: (id: string) => void;
  onClearAll: () => void;
}

export function WorksheetBuilder({ selectedQuestions, onRemoveQuestion, onClearAll }: WorksheetBuilderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [worksheetTitle, setWorksheetTitle] = useState('Math Practice Worksheet');
  const [teacherName, setTeacherName] = useState('');
  const [showAnswerLines, setShowAnswerLines] = useState(true);
  const [questionCount, setQuestionCount] = useState('5');
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>(['medium', 'hard', 'challenging']);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledQuestions, setCompiledQuestions] = useState<GeneratedQuestion[]>([]);
  const [isCompiled, setIsCompiled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedWorksheets, setSavedWorksheets] = useState<SavedWorksheet[]>([]);
  const [showSavedWorksheets, setShowSavedWorksheets] = useState(false);
  const [isLoadingWorksheets, setIsLoadingWorksheets] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleDifficulty = (difficulty: string) => {
    setDifficultyFilter(prev => 
      prev.includes(difficulty)
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    );
  };

  const fetchSavedWorksheets = async () => {
    if (!user) return;
    setIsLoadingWorksheets(true);
    try {
      const { data, error } = await supabase
        .from('worksheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedWorksheets((data || []).map(w => ({
        ...w,
        questions: w.questions as unknown as GeneratedQuestion[],
        topics: w.topics as unknown as WorksheetQuestion[],
        settings: w.settings as unknown as SavedWorksheet['settings'],
      })));
    } catch (error) {
      console.error('Error fetching worksheets:', error);
    } finally {
      setIsLoadingWorksheets(false);
    }
  };

  const saveWorksheet = async () => {
    if (!user || compiledQuestions.length === 0) return;

    setIsSaving(true);
    try {
      const worksheetData = {
        teacher_id: user.id,
        title: worksheetTitle,
        teacher_name: teacherName || null,
        questions: JSON.parse(JSON.stringify(compiledQuestions)),
        topics: JSON.parse(JSON.stringify(selectedQuestions)),
        settings: JSON.parse(JSON.stringify({
          questionCount,
          difficultyFilter,
          showAnswerLines,
        })),
      };
      const { error } = await supabase.from('worksheets').insert([worksheetData]);

      if (error) throw error;

      toast({
        title: 'Worksheet saved!',
        description: 'You can access it from your saved worksheets.',
      });
      fetchSavedWorksheets();
    } catch (error) {
      console.error('Error saving worksheet:', error);
      toast({
        title: 'Failed to save',
        description: 'Could not save worksheet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadWorksheet = (worksheet: SavedWorksheet) => {
    setWorksheetTitle(worksheet.title);
    setTeacherName(worksheet.teacher_name || '');
    setCompiledQuestions(worksheet.questions);
    setQuestionCount(worksheet.settings.questionCount);
    setDifficultyFilter(worksheet.settings.difficultyFilter);
    setShowAnswerLines(worksheet.settings.showAnswerLines);
    setIsCompiled(true);
    setShowSavedWorksheets(false);
    toast({
      title: 'Worksheet loaded',
      description: `"${worksheet.title}" has been loaded.`,
    });
  };

  const deleteWorksheet = async (id: string) => {
    try {
      const { error } = await supabase.from('worksheets').delete().eq('id', id);
      if (error) throw error;
      setSavedWorksheets(prev => prev.filter(w => w.id !== id));
      toast({ title: 'Worksheet deleted' });
    } catch (error) {
      console.error('Error deleting worksheet:', error);
      toast({
        title: 'Failed to delete',
        description: 'Could not delete worksheet.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavedWorksheets();
    }
  }, [user]);

  const compileWorksheet = async () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: 'No topics selected',
        description: 'Please select at least one topic to compile.',
        variant: 'destructive',
      });
      return;
    }

    setIsCompiling(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: selectedQuestions.map(q => ({
            topicName: q.topicName,
            standard: q.standard,
            subject: q.subject,
            category: q.category,
          })),
          questionCount: parseInt(questionCount),
          difficultyLevels: difficultyFilter,
        },
      });

      if (error) throw error;

      if (data.questions && data.questions.length > 0) {
        setCompiledQuestions(data.questions);
        setIsCompiled(true);
        toast({
          title: 'Worksheet compiled!',
          description: `Generated ${data.questions.length} higher-order questions.`,
        });
      } else {
        throw new Error('No questions generated');
      }
    } catch (error) {
      console.error('Error compiling worksheet:', error);
      toast({
        title: 'Compilation failed',
        description: 'Failed to generate questions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const resetCompilation = () => {
    setIsCompiled(false);
    setCompiledQuestions([]);
  };

  const generatePDF = async () => {
    if (compiledQuestions.length === 0) {
      toast({
        title: 'No questions compiled',
        description: 'Please compile the worksheet first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(worksheetTitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      if (teacherName) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Teacher: ${teacherName}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }

      // Student info line
      pdf.setFontSize(11);
      pdf.text('Name: _______________________   Date: ___________   Period: _____', margin, yPosition);
      yPosition += 15;

      // Separator
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);

      // Questions
      compiledQuestions.forEach((question, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        // Question number and difficulty badge
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        const difficultyText = question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
        pdf.text(`${question.questionNumber}. [${difficultyText}]`, margin, yPosition);
        yPosition += 6;

        // Topic and standard reference
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(`${question.topic} (${question.standard})`, margin + 5, yPosition);
        pdf.setTextColor(0);
        yPosition += 8;

        // Question text - wrap long text
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(question.question, contentWidth - 10);
        
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin + 5, yPosition);
          yPosition += 6;
        });

        yPosition += 4;

        // Work area
        if (showAnswerLines) {
          pdf.setDrawColor(200);
          pdf.setLineWidth(0.2);
          for (let i = 0; i < 5; i++) {
            if (yPosition > pageHeight - 30) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.line(margin + 5, yPosition + (i * 8), pageWidth - margin, yPosition + (i * 8));
          }
          yPosition += 45;
        } else {
          yPosition += 15;
        }
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text('Generated with Scan Genius - NYS Regents Aligned', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Download
      pdf.save(`${worksheetTitle.replace(/\s+/g, '_')}.pdf`);

      toast({
        title: 'Worksheet downloaded!',
        description: `Your worksheet with ${compiledQuestions.length} question(s) has been saved.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate worksheet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (compiledQuestions.length === 0) {
      toast({
        title: 'No questions compiled',
        description: 'Please compile the worksheet first.',
        variant: 'destructive',
      });
      return;
    }
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'challenging': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (selectedQuestions.length === 0 && !isCompiled && !showSavedWorksheets) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-lg mb-2">Worksheet Builder</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            Select topics from the list to add them to your worksheet. Click the + button next to any topic.
          </p>
          {savedWorksheets.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowSavedWorksheets(true)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Load Saved ({savedWorksheets.length})
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showSavedWorksheets) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Saved Worksheets</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSavedWorksheets(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingWorksheets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedWorksheets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No saved worksheets yet.
            </p>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {savedWorksheets.map((worksheet) => (
                  <div
                    key={worksheet.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{worksheet.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {worksheet.questions.length} questions • {new Date(worksheet.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadWorksheet(worksheet)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteWorksheet(worksheet.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Worksheet Builder</CardTitle>
            <Badge variant="secondary">
              {isCompiled ? `${compiledQuestions.length} questions` : `${selectedQuestions.length} topic(s)`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCompiled ? (
            <>
              {/* Configuration */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-sm">Worksheet Title</Label>
                  <Input
                    id="title"
                    value={worksheetTitle}
                    onChange={(e) => setWorksheetTitle(e.target.value)}
                    placeholder="Enter worksheet title"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="teacher" className="text-sm">Teacher Name (optional)</Label>
                  <Input
                    id="teacher"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="questionCount" className="text-sm">Number of Questions</Label>
                  <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 questions</SelectItem>
                      <SelectItem value="5">5 questions</SelectItem>
                      <SelectItem value="8">8 questions</SelectItem>
                      <SelectItem value="10">10 questions</SelectItem>
                      <SelectItem value="15">15 questions</SelectItem>
                      <SelectItem value="20">20 questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Difficulty Levels</Label>
                  <div className="flex flex-wrap gap-2">
                    {['medium', 'hard', 'challenging'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleDifficulty(level)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                          difficultyFilter.includes(level)
                            ? level === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              : level === 'hard'
                              ? 'bg-orange-100 text-orange-800 border-orange-300'
                              : 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                  {difficultyFilter.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one difficulty level</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="answerLines"
                    checked={showAnswerLines}
                    onChange={(e) => setShowAnswerLines(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="answerLines" className="text-sm cursor-pointer">
                    Include answer lines
                  </Label>
                </div>
              </div>

              <Separator />

              {/* Selected Topics */}
              <div className="space-y-2">
                <Label className="text-sm">Selected Topics</Label>
                <ScrollArea className="h-40 rounded-md border p-2">
                  {selectedQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded-md group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground w-5">{index + 1}.</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{question.topicName}</p>
                          <p className="text-xs text-muted-foreground">{question.standard}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => onRemoveQuestion(question.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Compile Button */}
              <Button
                className="w-full"
                onClick={compileWorksheet}
                disabled={isCompiling || difficultyFilter.length === 0}
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Compile Worksheet
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={onClearAll}
              >
                Clear All
              </Button>
            </>
          ) : (
            <>
              {/* Compiled Questions Preview */}
              <div className="space-y-2">
                <Label className="text-sm">Generated Questions</Label>
                <ScrollArea className="h-64 rounded-md border p-2">
                  {compiledQuestions.map((question) => (
                    <div
                      key={question.questionNumber}
                      className="py-3 px-2 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">{question.questionNumber}.</span>
                        <Badge variant="outline" className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {question.topic} ({question.standard})
                      </p>
                      <p className="text-sm">{question.question}</p>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Download/Print/Save Actions */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={generatePDF}
                  disabled={isGenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Download PDF'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={saveWorksheet}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Worksheet
                </Button>
                {savedWorksheets.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSavedWorksheets(true)}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={resetCompilation}
              >
                Edit Topics
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Print Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto print:static print:overflow-visible">
          <div className="print:hidden p-4 bg-muted border-b flex items-center justify-between">
            <p>Print preview - press Ctrl+P or Cmd+P to print</p>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </div>
          <div ref={printRef} className="p-8 max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">{worksheetTitle}</h1>
              {teacherName && <p className="text-muted-foreground mt-1">Teacher: {teacherName}</p>}
            </div>
            <div className="flex justify-between text-sm mb-6 border-b pb-4">
              <span>Name: _______________________</span>
              <span>Date: ___________</span>
              <span>Period: _____</span>
            </div>
            <div className="space-y-8">
              {compiledQuestions.map((question) => (
                <div key={question.questionNumber} className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold">{question.questionNumber}.</span>
                    <span className="text-xs px-2 py-0.5 rounded border bg-muted">
                      {question.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-5">
                    {question.topic} ({question.standard})
                  </p>
                  <p className="ml-5">{question.question}</p>
                  {showAnswerLines && (
                    <div className="ml-5 mt-4 space-y-3">
                      {[1, 2, 3, 4, 5].map((line) => (
                        <div key={line} className="border-b border-gray-300" style={{ height: '24px' }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-12 text-center text-xs text-muted-foreground">
              Generated with Scan Genius - NYS Regents Aligned
            </div>
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
          @page {
            margin: 0.75in;
          }
        }
      `}</style>
    </>
  );
}
