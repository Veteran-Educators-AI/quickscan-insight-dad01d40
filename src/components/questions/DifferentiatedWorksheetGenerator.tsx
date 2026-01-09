import { useState, useEffect } from 'react';
import { Loader2, Sparkles, Users, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import jsPDF from 'jspdf';

type AdvancementLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface DiagnosticResult {
  id: string;
  student_id: string;
  topic_name: string;
  standard: string | null;
  recommended_level: string | null;
  level_a_score: number;
  level_a_total: number;
  level_b_score: number;
  level_b_total: number;
  level_c_score: number;
  level_c_total: number;
  level_d_score: number;
  level_d_total: number;
  level_e_score: number;
  level_e_total: number;
  level_f_score: number;
  level_f_total: number;
  created_at: string;
}

interface StudentWithDiagnostic extends Student {
  diagnosticResult?: DiagnosticResult;
  recommendedLevel: AdvancementLevel;
  selected: boolean;
}

interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  difficulty: string;
  advancementLevel: AdvancementLevel;
}

interface DifferentiatedWorksheetGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LEVELS: AdvancementLevel[] = ['A', 'B', 'C', 'D', 'E', 'F'];

const getLevelColor = (level: AdvancementLevel) => {
  switch (level) {
    case 'A': return 'bg-green-100 text-green-800 border-green-300';
    case 'B': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'E': return 'bg-red-100 text-red-800 border-red-300';
    case 'F': return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getLevelDescription = (level: AdvancementLevel) => {
  switch (level) {
    case 'A': return 'Advanced';
    case 'B': return 'Proficient';
    case 'C': return 'Developing';
    case 'D': return 'Beginning';
    case 'E': return 'Emerging';
    case 'F': return 'Foundational';
  }
};

// Generate a simple hash from student name for variation
const getStudentVariationSeed = (firstName: string, lastName: string): number => {
  const str = `${firstName}${lastName}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

interface ClassOption {
  id: string;
  name: string;
}

export function DifferentiatedWorksheetGenerator({ open, onOpenChange }: DifferentiatedWorksheetGeneratorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [students, setStudents] = useState<StudentWithDiagnostic[]>([]);
  const [questionCount, setQuestionCount] = useState('5');
  const [warmUpCount, setWarmUpCount] = useState('2');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');

  useEffect(() => {
    if (open && user) {
      fetchClasses();
    }
  }, [open, user]);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudentsWithDiagnostics();
      fetchTopics();
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedTopic && selectedClassId) {
      fetchStudentsWithDiagnostics();
    }
  }, [selectedTopic]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTopics = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('diagnostic_results')
        .select('topic_name')
        .eq('teacher_id', user.id);

      if (error) throw error;
      
      const uniqueTopics = [...new Set((data || []).map(d => d.topic_name))];
      setTopics(uniqueTopics);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchStudentsWithDiagnostics = async () => {
    if (!selectedClassId || !user) return;

    setIsLoading(true);
    try {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', selectedClassId)
        .order('last_name');

      if (studentsError) throw studentsError;

      // Fetch diagnostic results for these students
      const studentIds = (studentsData || []).map(s => s.id);
      
      let diagnosticQuery = supabase
        .from('diagnostic_results')
        .select('*')
        .in('student_id', studentIds)
        .eq('teacher_id', user.id);
      
      if (selectedTopic) {
        diagnosticQuery = diagnosticQuery.eq('topic_name', selectedTopic);
      }
      
      const { data: diagnosticsData, error: diagnosticsError } = await diagnosticQuery;

      if (diagnosticsError) throw diagnosticsError;

      // Merge students with their most recent diagnostic result
      const studentsWithDiagnostics: StudentWithDiagnostic[] = (studentsData || []).map(student => {
        const studentDiagnostics = (diagnosticsData || [])
          .filter(d => d.student_id === student.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const latestDiagnostic = studentDiagnostics[0];
        
        return {
          ...student,
          diagnosticResult: latestDiagnostic,
          recommendedLevel: (latestDiagnostic?.recommended_level as AdvancementLevel) || 'C',
          selected: !!latestDiagnostic,
        };
      });

      setStudents(studentsWithDiagnostics);
    } catch (error) {
      console.error('Error fetching students with diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    setStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, selected: !s.selected } : s
    ));
  };

  const selectAll = () => {
    setStudents(prev => prev.map(s => ({ ...s, selected: !!s.diagnosticResult })));
  };

  const deselectAll = () => {
    setStudents(prev => prev.map(s => ({ ...s, selected: false })));
  };

  const generateDifferentiatedWorksheets = async () => {
    const selectedStudents = students.filter(s => s.selected);
    if (selectedStudents.length === 0) {
      toast({
        title: 'No students selected',
        description: 'Please select at least one student.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Preparing differentiated worksheets...');

    try {
      // Group students by their recommended level
      const studentsByLevel = selectedStudents.reduce((acc, student) => {
        const level = student.recommendedLevel;
        if (!acc[level]) acc[level] = [];
        acc[level].push(student);
        return acc;
      }, {} as Record<AdvancementLevel, StudentWithDiagnostic[]>);

      const pdf = new jsPDF('p', 'mm', 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let isFirstPage = true;

      const totalStudents = selectedStudents.length;
      let processedStudents = 0;

      for (const level of LEVELS) {
        const studentsAtLevel = studentsByLevel[level];
        if (!studentsAtLevel || studentsAtLevel.length === 0) continue;

        // Generate a unique worksheet for each student at this level
        for (let studentIdx = 0; studentIdx < studentsAtLevel.length; studentIdx++) {
          const student = studentsAtLevel[studentIdx];
          const variationSeed = getStudentVariationSeed(student.first_name, student.last_name);
          
          setGenerationStatus(`Generating worksheet for ${student.first_name} ${student.last_name} (Level ${level})...`);

          // Generate warm-up questions first (very basic confidence builders)
          let warmUpQuestions: GeneratedQuestion[] = [];
          if (parseInt(warmUpCount) > 0) {
            const { data: warmUpData, error: warmUpError } = await supabase.functions.invoke('generate-worksheet-questions', {
              body: {
                topics: [{
                  topicName: selectedTopic || 'General Math',
                  standard: '',
                  subject: 'Mathematics',
                  category: 'Warm-Up',
                }],
                questionCount: parseInt(warmUpCount),
                difficultyLevels: ['easy'],
                worksheetMode: 'warmup',
                variationSeed: variationSeed,
                studentName: `${student.first_name} ${student.last_name}`,
              },
            });
            warmUpQuestions = warmUpData?.questions || [];
          }

          // Generate level-appropriate questions with variation
          const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
            body: {
              topics: [{
                topicName: selectedTopic || 'General Math',
                standard: '',
                subject: 'Mathematics',
                category: 'Differentiated Practice',
              }],
              questionCount: parseInt(questionCount),
              difficultyLevels: level === 'A' || level === 'B' 
                ? ['hard', 'challenging'] 
                : level === 'C' || level === 'D'
                ? ['medium', 'hard']
                : ['medium'],
              worksheetMode: 'diagnostic',
              variationSeed: variationSeed,
              studentName: `${student.first_name} ${student.last_name}`,
            },
          });

          if (error) {
            console.error(`Error generating Level ${level} questions for ${student.first_name}:`, error);
            continue;
          }

          const questions: GeneratedQuestion[] = data.questions || [];
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          let yPosition = margin;

          // Header with level indicator
          pdf.setFillColor(
            level === 'A' ? 34 : level === 'B' ? 16 : level === 'C' ? 250 : level === 'D' ? 251 : level === 'E' ? 254 : 243,
            level === 'A' ? 197 : level === 'B' ? 185 : level === 'C' ? 204 : level === 'D' ? 146 : level === 'E' ? 202 : 244,
            level === 'A' ? 94 : level === 'B' ? 129 : level === 'C' ? 21 : level === 'D' ? 68 : level === 'E' ? 202 : 246
          );
          pdf.rect(margin, yPosition - 5, contentWidth, 25, 'F');

          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0);
          pdf.text(`Level ${level} - ${getLevelDescription(level)}`, pageWidth / 2, yPosition + 5, { align: 'center' });

          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${selectedTopic || 'Math Practice'} - Differentiated Worksheet`, pageWidth / 2, yPosition + 12, { align: 'center' });
          yPosition += 30;

          // Student info
          pdf.setFontSize(11);
          pdf.text(`Name: ${student.first_name} ${student.last_name}`, margin, yPosition);
          pdf.text(`Date: _______________`, pageWidth - margin - 50, yPosition);
          yPosition += 10;

          pdf.setLineWidth(0.5);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;

          // Warm-Up Section (confidence builders)
          if (warmUpQuestions.length > 0) {
            pdf.setFillColor(240, 253, 244); // Light green
            pdf.rect(margin, yPosition - 3, contentWidth, 8, 'F');
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(22, 101, 52);
            pdf.text('✨ Warm-Up: Let\'s Get Started!', margin + 3, yPosition + 2);
            yPosition += 12;
            pdf.setTextColor(0);

            for (const question of warmUpQuestions) {
              if (yPosition > pageHeight - 50) {
                pdf.addPage();
                yPosition = margin;
              }

              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.text(`${question.questionNumber}.`, margin, yPosition);
              yPosition += 6;

              pdf.setFont('helvetica', 'normal');
              const lines = pdf.splitTextToSize(question.question, contentWidth - 10);
              lines.forEach((line: string) => {
                pdf.text(line, margin + 5, yPosition);
                yPosition += 5;
              });

              // Smaller answer space for warm-up
              yPosition += 3;
              pdf.setDrawColor(200);
              pdf.setLineWidth(0.2);
              for (let i = 0; i < 2; i++) {
                pdf.line(margin + 5, yPosition, pageWidth - margin, yPosition);
                yPosition += 7;
              }
              yPosition += 5;
            }

            // Separator before main questions
            yPosition += 5;
            pdf.setLineWidth(0.3);
            pdf.setDrawColor(150);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 8;

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(60);
            pdf.text('📝 Practice Questions', margin, yPosition);
            yPosition += 10;
            pdf.setTextColor(0);
          }

          // Main Questions
          for (const question of questions) {
            if (yPosition > pageHeight - 60) {
              pdf.addPage();
              yPosition = margin;
            }

            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${question.questionNumber}.`, margin, yPosition);
            yPosition += 6;

            pdf.setFont('helvetica', 'normal');
            const lines = pdf.splitTextToSize(question.question, contentWidth - 10);
            lines.forEach((line: string) => {
              if (yPosition > pageHeight - 30) {
                pdf.addPage();
                yPosition = margin;
              }
              pdf.text(line, margin + 5, yPosition);
              yPosition += 5;
            });

            // Answer lines
            yPosition += 5;
            pdf.setDrawColor(200);
            pdf.setLineWidth(0.2);
            for (let i = 0; i < 4; i++) {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = margin;
              }
              pdf.line(margin + 5, yPosition, pageWidth - margin, yPosition);
              yPosition += 8;
            }
            yPosition += 5;
          }

          // Footer
          pdf.setFontSize(8);
          pdf.setTextColor(150);
          pdf.text(
            `Differentiated Worksheet - Level ${level} | Generated by Scan Genius`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
          processedStudents++;
          setGenerationProgress((processedStudents / totalStudents) * 100);
        }
      }

      // Download the PDF
      const fileName = `Differentiated_Worksheets_${selectedTopic || 'Math'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'Worksheets generated!',
        description: `Created ${selectedStudents.length} personalized worksheets.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error generating worksheets:', error);
      toast({
        title: 'Generation failed',
        description: 'Could not generate differentiated worksheets.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const selectedCount = students.filter(s => s.selected).length;
  const studentsWithDiagnostics = students.filter(s => s.diagnosticResult);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Generate Differentiated Worksheets
          </DialogTitle>
          <DialogDescription>
            Create personalized follow-up worksheets based on student diagnostic results. Each student receives a worksheet tailored to their recommended advancement level.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Class Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic (from diagnostics)</Label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={topics.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={topics.length === 0 ? "No diagnostics found" : "Choose topic..."} />
                </SelectTrigger>
                <SelectContent>
                  {topics.map(topic => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Questions per Worksheet</Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 questions</SelectItem>
                <SelectItem value="5">5 questions</SelectItem>
                <SelectItem value="8">8 questions</SelectItem>
                <SelectItem value="10">10 questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Warm-Up Questions</Label>
            <Select value={warmUpCount} onValueChange={setWarmUpCount}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No warm-up</SelectItem>
                <SelectItem value="1">1 question</SelectItem>
                <SelectItem value="2">2 questions</SelectItem>
                <SelectItem value="3">3 questions</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Easy confidence-building questions at the start</p>
          </div>

          <Separator />

          {/* Students with Diagnostic Results */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedClassId ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Students with Diagnostic Data</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>Deselect All</Button>
                </div>
              </div>

              {studentsWithDiagnostics.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No diagnostic results found for this class{selectedTopic ? ` on "${selectedTopic}"` : ''}.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create a diagnostic worksheet first, then record student results.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[280px] border rounded-md p-2">
                  <div className="space-y-2">
                    {students.map(student => {
                      const hasDiagnostic = !!student.diagnosticResult;
                      
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            student.selected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                          } ${!hasDiagnostic ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={student.selected}
                              onCheckedChange={() => toggleStudent(student.id)}
                              disabled={!hasDiagnostic}
                            />
                            <div>
                              <p className="font-medium text-sm">
                                {student.last_name}, {student.first_name}
                              </p>
                              {hasDiagnostic ? (
                                <p className="text-xs text-muted-foreground">
                                  Last assessed: {new Date(student.diagnosticResult!.created_at).toLocaleDateString()}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">No diagnostic data</p>
                              )}
                            </div>
                          </div>
                          
                          {hasDiagnostic && (
                            <Badge variant="outline" className={getLevelColor(student.recommendedLevel)}>
                              Level {student.recommendedLevel}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Level distribution summary */}
              {selectedCount > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium mr-2">Distribution:</span>
                  {LEVELS.map(level => {
                    const count = students.filter(s => s.selected && s.recommendedLevel === level).length;
                    if (count === 0) return null;
                    return (
                      <Badge key={level} variant="outline" className={getLevelColor(level)}>
                        Level {level}: {count}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Select a class to view students</p>
              </CardContent>
            </Card>
          )}

          {/* Generation progress */}
          {isGenerating && (
            <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple-700">{generationStatus}</span>
                <span className="font-medium text-purple-900">{Math.round(generationProgress)}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={generateDifferentiatedWorksheets}
            disabled={isGenerating || selectedCount === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate {selectedCount} Worksheet{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
