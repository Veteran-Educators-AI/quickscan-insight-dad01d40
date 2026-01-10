import { useState, useEffect } from 'react';
import { Loader2, Sparkles, Users, Download, FileText, CheckCircle, AlertCircle, Save, Trash2, TrendingUp, Brain } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAdaptiveLevels } from '@/hooks/useAdaptiveLevels';
import jsPDF from 'jspdf';

interface WorksheetPreset {
  id: string;
  name: string;
  questionCount: string;
  warmUpCount: string;
  warmUpDifficulty: 'super-easy' | 'easy' | 'very-easy';
  formCount: string;
  includeHints?: boolean;
}

const FORM_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
type FormLetter = typeof FORM_LETTERS[number];

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
  hasAdaptiveData?: boolean;
}

interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  difficulty: string;
  advancementLevel: AdvancementLevel;
  hint?: string;
}

interface DifferentiatedWorksheetGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosticMode?: boolean;
  initialTopics?: { topicName: string; standard: string }[];
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

export function DifferentiatedWorksheetGenerator({ open, onOpenChange, diagnosticMode = false, initialTopics = [] }: DifferentiatedWorksheetGeneratorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentWithDiagnostic[]>([]);
  const [questionCount, setQuestionCount] = useState('5');
  const [warmUpCount, setWarmUpCount] = useState('2');
  const [warmUpDifficulty, setWarmUpDifficulty] = useState<'super-easy' | 'easy' | 'very-easy'>('very-easy');
  const [formCount, setFormCount] = useState(diagnosticMode ? '4' : '1');
  const [includeHints, setIncludeHints] = useState(false);
  const [useAdaptiveDifficulty, setUseAdaptiveDifficulty] = useState(true);
  
  // Topics from standards menu selection
  const [customTopics, setCustomTopics] = useState<{ topicName: string; standard: string }[]>([]);

  // Adaptive levels based on student performance data
  const { 
    students: adaptiveStudents, 
    isLoading: isLoadingAdaptive,
    studentLevelMap: adaptiveLevelMap,
  } = useAdaptiveLevels({ 
    classId: selectedClassId, 
    topicName: selectedTopics.length > 0 ? selectedTopics[0] : (customTopics.length > 0 ? customTopics[0].topicName : '')
  });

  // Toggle topic selection
  const toggleTopicSelection = (topicName: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicName) 
        ? prev.filter(t => t !== topicName)
        : [...prev, topicName]
    );
  };

  // Pre-configure for diagnostic mode and load initial topics when opened
  useEffect(() => {
    if (open) {
      if (diagnosticMode) {
        setFormCount('4');
        setWarmUpDifficulty('easy');
      }
      // Load initial topics from standards menu selection
      if (initialTopics.length > 0) {
        setCustomTopics(initialTopics);
        // Auto-select all passed topics
        setSelectedTopics(initialTopics.map(t => t.topicName));
      }
    } else {
      // Reset custom topics and selection when closing
      setCustomTopics([]);
      setSelectedTopics([]);
    }
  }, [open, diagnosticMode, initialTopics]);
  
  // Presets
  const [presets, setPresets] = useState<WorksheetPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPresets = localStorage.getItem('worksheet-presets');
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error('Error loading presets:', e);
      }
    }
  }, []);

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
    if ((selectedTopics.length > 0 || customTopics.length > 0) && selectedClassId) {
      fetchStudentsWithDiagnostics();
    }
  }, [selectedTopics, customTopics, adaptiveLevelMap, useAdaptiveDifficulty]);

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
      
      if (selectedTopics.length > 0) {
        diagnosticQuery = diagnosticQuery.in('topic_name', selectedTopics);
      }
      
      const { data: diagnosticsData, error: diagnosticsError } = await diagnosticQuery;

      if (diagnosticsError) throw diagnosticsError;

      // Check if we have custom topics from standards menu (new diagnostic mode)
      const isNewDiagnosticFromStandards = customTopics.length > 0;

      // Merge students with their most recent diagnostic result and adaptive levels
      const studentsWithDiagnostics: StudentWithDiagnostic[] = (studentsData || []).map(student => {
        const studentDiagnostics = (diagnosticsData || [])
          .filter(d => d.student_id === student.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const latestDiagnostic = studentDiagnostics[0];
        
        // Get adaptive level if available and enabled
        const adaptiveLevel = adaptiveLevelMap[student.id];
        const adaptiveStudent = adaptiveStudents.find(s => s.studentId === student.id);
        const hasPerformanceData = adaptiveStudent?.hasPerformanceData ?? false;
        
        // Use adaptive level if enabled and available, otherwise fall back to diagnostic
        const recommendedLevel = (useAdaptiveDifficulty && adaptiveLevel) 
          ? adaptiveLevel 
          : (latestDiagnostic?.recommended_level as AdvancementLevel) || 'C';
        
        // For new diagnostics from standards, pre-select all students
        // For follow-up worksheets, only select students with existing data
        const shouldBeSelected = isNewDiagnosticFromStandards 
          ? true  // Select all students for new diagnostic
          : (!!latestDiagnostic || hasPerformanceData);  // Only select if has data
        
        return {
          ...student,
          diagnosticResult: latestDiagnostic,
          recommendedLevel,
          selected: shouldBeSelected,
          hasAdaptiveData: hasPerformanceData,
        };
      });

      setStudents(studentsWithDiagnostics);
    } catch (error) {
      console.error('Error fetching students with diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Preset functions
  const savePreset = () => {
    if (!newPresetName.trim()) {
      toast({ title: 'Please enter a preset name', variant: 'destructive' });
      return;
    }
    
    const newPreset: WorksheetPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      questionCount,
      warmUpCount,
      warmUpDifficulty,
      formCount,
      includeHints,
    };
    
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('worksheet-presets', JSON.stringify(updatedPresets));
    setNewPresetName('');
    setShowSavePreset(false);
    toast({ title: 'Preset saved!', description: `"${newPreset.name}" saved for quick reuse.` });
  };

  const loadPreset = (preset: WorksheetPreset) => {
    setQuestionCount(preset.questionCount);
    setWarmUpCount(preset.warmUpCount);
    setWarmUpDifficulty(preset.warmUpDifficulty);
    setFormCount(preset.formCount || '1');
    setIncludeHints(preset.includeHints ?? false);
    toast({ title: 'Preset loaded', description: `Applied "${preset.name}" settings.` });
  };

  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);
    localStorage.setItem('worksheet-presets', JSON.stringify(updatedPresets));
    toast({ title: 'Preset deleted' });
  };

  const toggleStudent = (studentId: string) => {
    setStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, selected: !s.selected } : s
    ));
  };

  const selectAll = () => {
    setStudents(prev => prev.map(s => ({ ...s, selected: !!s.diagnosticResult || !!s.hasAdaptiveData })));
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

      const numForms = parseInt(formCount);
      const formsToGenerate = FORM_LETTERS.slice(0, numForms);
      
      // Pre-generate unique question sets for each form and level combination
      // This ensures students with the same level but different forms get different questions
      const formQuestionCache: Record<string, { warmUp: GeneratedQuestion[], main: GeneratedQuestion[] }> = {};
      
      // Calculate total work: forms * levels with students
      const levelsWithStudents = LEVELS.filter(l => studentsByLevel[l]?.length > 0);
      const totalGenerations = numForms * levelsWithStudents.length;
      let generationsComplete = 0;
      
      // Pre-generate questions for each form/level combination
      for (const form of formsToGenerate) {
        for (const level of levelsWithStudents) {
          const cacheKey = `${form}-${level}`;
          setGenerationStatus(`Generating Form ${form} questions for Level ${level}...`);
          
          // Generate warm-up questions for this form
          let warmUpQuestions: GeneratedQuestion[] = [];
          if (parseInt(warmUpCount) > 0) {
            // Build topics array for warm-up
            const warmUpTopicsPayload = selectedTopics.length > 0
              ? selectedTopics.map(t => ({
                  topicName: t,
                  standard: customTopics.find(ct => ct.topicName === t)?.standard || '',
                  subject: 'Mathematics',
                  category: 'Warm-Up',
                }))
              : [{ topicName: 'General Math', standard: '', subject: 'Mathematics', category: 'Warm-Up' }];
            
            const { data: warmUpData } = await supabase.functions.invoke('generate-worksheet-questions', {
              body: {
                topics: warmUpTopicsPayload,
                questionCount: parseInt(warmUpCount),
                difficultyLevels: [warmUpDifficulty],
                worksheetMode: 'warmup',
                formVariation: form,
                formSeed: form.charCodeAt(0) * 1000 + level.charCodeAt(0),
                includeHints,
              },
            });
            warmUpQuestions = warmUpData?.questions || [];
          }
          
          // Build topics array for main questions
          const mainTopicsPayload = selectedTopics.length > 0
            ? selectedTopics.map(t => ({
                topicName: t,
                standard: customTopics.find(ct => ct.topicName === t)?.standard || '',
                subject: 'Mathematics',
                category: 'Differentiated Practice',
              }))
            : [{ topicName: 'General Math', standard: '', subject: 'Mathematics', category: 'Differentiated Practice' }];
          
          // Generate main questions for this form/level
          const { data } = await supabase.functions.invoke('generate-worksheet-questions', {
            body: {
              topics: mainTopicsPayload,
              questionCount: parseInt(questionCount),
              difficultyLevels: level === 'A' || level === 'B' 
                ? ['hard', 'challenging'] 
                : level === 'C' || level === 'D'
                ? ['medium', 'hard']
                : ['easy', 'super-easy', 'medium'],
              worksheetMode: 'diagnostic',
              formVariation: form,
              formSeed: form.charCodeAt(0) * 1000 + level.charCodeAt(0),
              includeHints,
            },
          });
          
          formQuestionCache[cacheKey] = {
            warmUp: warmUpQuestions,
            main: data?.questions || [],
          };
          
          generationsComplete++;
          setGenerationProgress((generationsComplete / totalGenerations) * 50);
        }
      }
      
      const totalWorksheets = selectedStudents.length;
      let processedWorksheets = 0;

      for (const level of LEVELS) {
        const studentsAtLevel = studentsByLevel[level];
        if (!studentsAtLevel || studentsAtLevel.length === 0) continue;

        // Generate worksheets for each student at this level
        for (let studentIdx = 0; studentIdx < studentsAtLevel.length; studentIdx++) {
          const student = studentsAtLevel[studentIdx];
          
          // Assign form based on student index (rotating through available forms)
          const formIndex = studentIdx % numForms;
          const assignedForm = formsToGenerate[formIndex];
          const cacheKey = `${assignedForm}-${level}`;
          
          setGenerationStatus(`Creating worksheet for ${student.first_name} ${student.last_name} (Level ${level}, Form ${assignedForm})...`);

          // Use pre-generated questions from cache
          const cachedQuestions = formQuestionCache[cacheKey];
          const warmUpQuestions = cachedQuestions?.warmUp || [];
          const questions: GeneratedQuestion[] = cachedQuestions?.main || [];
          
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          let yPosition = margin;

          // Header with level and form indicator
          pdf.setFillColor(
            level === 'A' ? 34 : level === 'B' ? 16 : level === 'C' ? 250 : level === 'D' ? 251 : level === 'E' ? 254 : 243,
            level === 'A' ? 197 : level === 'B' ? 185 : level === 'C' ? 204 : level === 'D' ? 146 : level === 'E' ? 202 : 244,
            level === 'A' ? 94 : level === 'B' ? 129 : level === 'C' ? 21 : level === 'D' ? 68 : level === 'E' ? 202 : 246
          );
          pdf.rect(margin, yPosition - 5, contentWidth, 25, 'F');

          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0);
          pdf.text(`Level ${level} - ${getLevelDescription(level)}${numForms > 1 ? ` | Form ${assignedForm}` : ''}`, pageWidth / 2, yPosition + 5, { align: 'center' });

          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          const topicsLabel = selectedTopics.length > 0 ? selectedTopics.join(', ') : 'Math Practice';
          const truncatedTopics = topicsLabel.length > 50 ? topicsLabel.substring(0, 47) + '...' : topicsLabel;
          pdf.text(`${truncatedTopics} - Diagnostic Worksheet`, pageWidth / 2, yPosition + 12, { align: 'center' });
          yPosition += 30;

          // Student info with form indicator
          pdf.setFontSize(11);
          pdf.text(`Name: ${student.first_name} ${student.last_name}`, margin, yPosition);
          if (numForms > 1) {
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Form ${assignedForm}`, pageWidth - margin - 25, yPosition);
            pdf.setFont('helvetica', 'normal');
          }
          pdf.text(`Date: _______________`, pageWidth - margin - 75, yPosition);
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

              // Add hint if available
              if (question.hint && includeHints) {
                yPosition += 2;
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'italic');
                pdf.setTextColor(120, 100, 50);
                const hintLines = pdf.splitTextToSize(`💡 Hint: ${question.hint}`, contentWidth - 15);
                hintLines.forEach((line: string) => {
                  pdf.text(line, margin + 10, yPosition);
                  yPosition += 4;
                });
                pdf.setTextColor(0);
                pdf.setFontSize(11);
              }

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

            // Add hint if available
            if (question.hint && includeHints) {
              yPosition += 2;
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'italic');
              pdf.setTextColor(120, 100, 50);
              const hintLines = pdf.splitTextToSize(`💡 Hint: ${question.hint}`, contentWidth - 15);
              hintLines.forEach((line: string) => {
                if (yPosition > pageHeight - 25) {
                  pdf.addPage();
                  yPosition = margin;
                }
                pdf.text(line, margin + 10, yPosition);
                yPosition += 4;
              });
              pdf.setTextColor(0);
              pdf.setFontSize(11);
            }

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
            `Diagnostic Worksheet - Level ${level}${numForms > 1 ? ` | Form ${assignedForm}` : ''} | Generated by Scan Genius`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
          processedWorksheets++;
          setGenerationProgress(50 + (processedWorksheets / totalWorksheets) * 50);
        }
      }

      // Download the PDF
      const topicsForFilename = selectedTopics.length > 0 ? selectedTopics[0].replace(/\s+/g, '_').substring(0, 20) : 'Math';
      const fileName = `Class_Set_${topicsForFilename}_Forms_${formsToGenerate.join('')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: '🎉 Class set is ready!',
        description: `Created ${totalWorksheets} diagnostic worksheet${totalWorksheets !== 1 ? 's' : ''} for ${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''}${numForms > 1 ? ` across ${numForms} different forms (A-${formsToGenerate[numForms-1]}) to prevent copying` : ''}.`,
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
  const studentsWithDiagnostics = students.filter(s => s.diagnosticResult || s.hasAdaptiveData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {diagnosticMode ? (
              <>
                <FileText className="h-5 w-5 text-emerald-600" />
                Quick Start Diagnostic
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-purple-600" />
                Generate Differentiated Worksheets
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {diagnosticMode 
              ? "Create diagnostic worksheets with multiple forms (A-J) to prevent copying. Each form has unique questions covering the same concepts."
              : "Create personalized follow-up worksheets based on student diagnostic results. Each student receives a worksheet tailored to their recommended advancement level."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-sm font-medium">Presets:</Label>
            {presets.length === 0 ? (
              <span className="text-xs text-muted-foreground">No saved presets</span>
            ) : (
              presets.map(preset => (
                <div key={preset.id} className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPreset(preset)}
                    className="h-7 text-xs"
                  >
                    {preset.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePreset(preset.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
            <Popover open={showSavePreset} onOpenChange={setShowSavePreset}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <Save className="h-3 w-3" />
                  Save Current
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="space-y-2">
                  <Label className="text-sm">Preset Name</Label>
                  <Input
                    placeholder="e.g., Quick Quiz"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && savePreset()}
                  />
                  <Button size="sm" className="w-full" onClick={savePreset}>
                    Save Preset
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

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
              <Label className="flex items-center gap-2">
                Topics
                {customTopics.length > 0 && (
                  <Badge variant="secondary" className="text-xs">From Standards</Badge>
                )}
                {selectedTopics.length > 0 && (
                  <Badge variant="default" className="text-xs">{selectedTopics.length} selected</Badge>
                )}
              </Label>
              
              {/* Multi-select topics with checkboxes */}
              <ScrollArea className="h-[140px] border rounded-md p-2">
                {(topics.length === 0 && customTopics.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No topics available. Select topics from the standards menu first.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {/* Custom topics from standards menu */}
                    {customTopics.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-muted-foreground font-medium sticky top-0 bg-background">
                          From Standards Menu
                        </div>
                        {customTopics.map((topic, idx) => (
                          <div 
                            key={`custom-${idx}`}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                              selectedTopics.includes(topic.topicName) ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => toggleTopicSelection(topic.topicName)}
                          >
                            <Checkbox 
                              checked={selectedTopics.includes(topic.topicName)}
                              onCheckedChange={() => toggleTopicSelection(topic.topicName)}
                            />
                            <span className="flex-1 text-sm">{topic.topicName}</span>
                            <Badge variant="outline" className="text-xs">{topic.standard}</Badge>
                          </div>
                        ))}
                      </>
                    )}
                    
                    {/* Diagnostic topics */}
                    {topics.length > 0 && (
                      <>
                        {customTopics.length > 0 && (
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium border-t mt-2 pt-2 sticky top-0 bg-background">
                            From Past Diagnostics
                          </div>
                        )}
                        {topics.filter(t => !customTopics.some(ct => ct.topicName === t)).map(topic => (
                          <div 
                            key={topic}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                              selectedTopics.includes(topic) ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => toggleTopicSelection(topic)}
                          >
                            <Checkbox 
                              checked={selectedTopics.includes(topic)}
                              onCheckedChange={() => toggleTopicSelection(topic)}
                            />
                            <span className="flex-1 text-sm">{topic}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </ScrollArea>
              
              {selectedTopics.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-emerald-600">
                    ✓ {selectedTopics.length} topic(s) selected for worksheet
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => setSelectedTopics([])}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Questions per Worksheet</Label>
              <Select value={questionCount} onValueChange={setQuestionCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 questions</SelectItem>
                  <SelectItem value="5">5 questions</SelectItem>
                  <SelectItem value="8">8 questions</SelectItem>
                  <SelectItem value="10">10 questions</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Question Distribution Preview */}
              {selectedTopics.length > 1 && (
                <div className="mt-2 p-2 bg-muted/50 rounded-md border">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Question Distribution</p>
                  <div className="space-y-1">
                    {(() => {
                      const totalQuestions = parseInt(questionCount);
                      const topicCount = selectedTopics.length;
                      const basePerTopic = Math.floor(totalQuestions / topicCount);
                      const remainder = totalQuestions % topicCount;
                      
                      return selectedTopics.map((topic, idx) => {
                        const questionsForTopic = basePerTopic + (idx < remainder ? 1 : 0);
                        const percentage = Math.round((questionsForTopic / totalQuestions) * 100);
                        
                        return (
                          <div key={topic} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-xs">
                                <span className="truncate max-w-[120px]" title={topic}>
                                  {topic.length > 18 ? `${topic.slice(0, 18)}...` : topic}
                                </span>
                                <span className="text-muted-foreground whitespace-nowrap ml-1">
                                  ~{questionsForTopic} Q
                                </span>
                              </div>
                              <Progress value={percentage} className="h-1 mt-0.5" />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                    {parseInt(questionCount)} questions ÷ {selectedTopics.length} topics
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Diagnostic Forms (Anti-Copy)</Label>
              <Select value={formCount} onValueChange={setFormCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 form (standard)</SelectItem>
                  <SelectItem value="2">2 forms (A, B)</SelectItem>
                  <SelectItem value="3">3 forms (A, B, C)</SelectItem>
                  <SelectItem value="4">4 forms (A, B, C, D)</SelectItem>
                  <SelectItem value="5">5 forms (A-E)</SelectItem>
                  <SelectItem value="6">6 forms (A-F)</SelectItem>
                  <SelectItem value="7">7 forms (A-G)</SelectItem>
                  <SelectItem value="8">8 forms (A-H)</SelectItem>
                  <SelectItem value="9">9 forms (A-I)</SelectItem>
                  <SelectItem value="10">10 forms (A-J)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Different question sets prevent copying between students</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Warm-Up Questions</Label>
              <Select value={warmUpCount} onValueChange={setWarmUpCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No warm-up</SelectItem>
                  <SelectItem value="1">1 question</SelectItem>
                  <SelectItem value="2">2 questions</SelectItem>
                  <SelectItem value="3">3 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Warm-Up Difficulty</Label>
              <Select 
                value={warmUpDifficulty} 
                onValueChange={(v) => setWarmUpDifficulty(v as 'super-easy' | 'easy' | 'very-easy')}
                disabled={warmUpCount === '0'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super-easy">Super Easy (basic facts)</SelectItem>
                  <SelectItem value="very-easy">Very Easy (basic recall)</SelectItem>
                  <SelectItem value="easy">Easy (simple application)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Confidence-building questions at the start of each worksheet</p>

          {/* Include Hints Option */}
          <div className="flex items-center space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Checkbox
              id="includeHints"
              checked={includeHints}
              onCheckedChange={(checked) => setIncludeHints(checked === true)}
            />
            <div className="flex-1">
              <Label htmlFor="includeHints" className="text-sm font-medium text-amber-900 cursor-pointer">
                💡 Include Hints for Students
              </Label>
              <p className="text-xs text-amber-700 mt-0.5">
                Add a helpful hint under each question so students don't get stuck. Great for practice and building confidence!
              </p>
            </div>
          </div>

          {/* Adaptive Difficulty Option */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <Label htmlFor="adaptiveDifficulty" className="text-sm font-medium text-purple-900 cursor-pointer flex items-center gap-2">
                  Adaptive Difficulty
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          Analyzes each student's past performance to automatically adjust difficulty levels. 
                          Students improving will get slightly harder questions, while struggling students get more support.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="text-xs text-purple-700 mt-0.5">
                  Auto-adjust difficulty based on analyzed student work data
                </p>
              </div>
            </div>
            <Switch
              id="adaptiveDifficulty"
              checked={useAdaptiveDifficulty}
              onCheckedChange={setUseAdaptiveDifficulty}
            />
          </div>

          {useAdaptiveDifficulty && adaptiveStudents.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-medium">Performance-based adjustments active</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {adaptiveStudents.filter(s => s.hasPerformanceData).length} students have graded work data. 
                Their worksheet levels will be personalized based on their performance trends.
              </p>
            </div>
          )}

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
                      No diagnostic results found for this class{selectedTopics.length > 0 ? ` on selected topics` : ''}.
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
                      const hasData = hasDiagnostic || student.hasAdaptiveData;
                      const adaptiveInfo = adaptiveStudents.find(s => s.studentId === student.id);
                      const isAdaptiveAdjusted = useAdaptiveDifficulty && student.hasAdaptiveData && adaptiveInfo;
                      
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            student.selected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                          } ${!hasData ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={student.selected}
                              onCheckedChange={() => toggleStudent(student.id)}
                              disabled={!hasData}
                            />
                            <div>
                              <p className="font-medium text-sm flex items-center gap-1.5">
                                {student.last_name}, {student.first_name}
                                {isAdaptiveAdjusted && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <TrendingUp className="h-3 w-3 text-purple-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Level adjusted based on performance data</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </p>
                              {hasDiagnostic ? (
                                <p className="text-xs text-muted-foreground">
                                  Last assessed: {new Date(student.diagnosticResult!.created_at).toLocaleDateString()}
                                  {isAdaptiveAdjusted && (
                                    <span className="ml-1 text-purple-600">• Adaptive</span>
                                  )}
                                </p>
                              ) : student.hasAdaptiveData ? (
                                <p className="text-xs text-purple-600">
                                  Level from graded work analysis
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">No data available</p>
                              )}
                            </div>
                          </div>
                          
                          {hasData && (
                            <Badge 
                              variant="outline" 
                              className={`${getLevelColor(student.recommendedLevel)} ${isAdaptiveAdjusted ? 'ring-1 ring-purple-400' : ''}`}
                            >
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
