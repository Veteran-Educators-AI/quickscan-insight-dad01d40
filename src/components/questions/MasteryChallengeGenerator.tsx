import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  Star,
  ArrowRight,
  Sparkles,
  Users,
  BookOpen,
  Loader2,
  Printer,
  ChevronDown,
  ChevronUp,
  Check,
  GraduationCap,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MasteryChallengeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MasteryStudent {
  id: string;
  firstName: string;
  lastName: string;
  topicName: string;
  currentLevel: string;
  latestGrade: number | null;
  assessmentDate: string;
  selected: boolean;
}

interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  difficulty: string;
  advancementLevel: 'A';
  hint?: string;
}

type ChallengeType = 'deeper' | 'application' | 'next-topic';

const CHALLENGE_TYPES = {
  deeper: {
    label: 'Deeper Mastery',
    description: 'Advanced problems within the same topic to confirm full understanding',
    icon: Star,
  },
  application: {
    label: 'Real-World Application',
    description: 'Apply concepts to complex, multi-step real-world scenarios',
    icon: Sparkles,
  },
  'next-topic': {
    label: 'Bridge to Next Topic',
    description: 'Preview problems that connect to the next topic in the curriculum',
    icon: ArrowRight,
  },
};

const LEVEL_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-800 border-green-300',
  B: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  D: 'bg-orange-100 text-orange-800 border-orange-300',
  E: 'bg-red-100 text-red-800 border-red-300',
  F: 'bg-gray-100 text-gray-800 border-gray-300',
};

export function MasteryChallengeGenerator({ open, onOpenChange }: MasteryChallengeGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'select' | 'configure' | 'preview'>('select');
  const [selectedStudents, setSelectedStudents] = useState<MasteryStudent[]>([]);
  const [challengeType, setChallengeType] = useState<ChallengeType>('deeper');
  const [questionCount, setQuestionCount] = useState('5');
  const [includeHints, setIncludeHints] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Fetch students with Level A on any topic (high achievers)
  const { data: masteryStudents, isLoading } = useQuery({
    queryKey: ['mastery-students', user?.id],
    queryFn: async () => {
      // Get diagnostic results with Level A
      const { data: diagnostics, error: diagError } = await supabase
        .from('diagnostic_results')
        .select(`
          id,
          student_id,
          topic_name,
          recommended_level,
          created_at,
          students!inner(id, first_name, last_name, class_id)
        `)
        .eq('teacher_id', user?.id)
        .eq('recommended_level', 'A')
        .order('created_at', { ascending: false });

      if (diagError) throw diagError;

      // Also get grade history for students with 100%
      const { data: grades, error: gradeError } = await supabase
        .from('grade_history')
        .select(`
          id,
          student_id,
          topic_name,
          grade,
          created_at,
          students!inner(id, first_name, last_name, class_id)
        `)
        .eq('teacher_id', user?.id)
        .gte('grade', 95)
        .order('created_at', { ascending: false });

      if (gradeError) throw gradeError;

      // Combine and dedupe by student+topic
      const studentTopicMap = new Map<string, MasteryStudent>();

      diagnostics?.forEach((d: any) => {
        const key = `${d.student_id}-${d.topic_name}`;
        if (!studentTopicMap.has(key)) {
          studentTopicMap.set(key, {
            id: d.student_id,
            firstName: d.students.first_name,
            lastName: d.students.last_name,
            topicName: d.topic_name,
            currentLevel: 'A',
            latestGrade: null,
            assessmentDate: d.created_at,
            selected: false,
          });
        }
      });

      grades?.forEach((g: any) => {
        const key = `${g.student_id}-${g.topic_name}`;
        if (!studentTopicMap.has(key)) {
          studentTopicMap.set(key, {
            id: g.student_id,
            firstName: g.students.first_name,
            lastName: g.students.last_name,
            topicName: g.topic_name,
            currentLevel: 'A',
            latestGrade: g.grade,
            assessmentDate: g.created_at,
            selected: false,
          });
        } else {
          const existing = studentTopicMap.get(key)!;
          if (!existing.latestGrade || g.grade > existing.latestGrade) {
            existing.latestGrade = g.grade;
          }
        }
      });

      return Array.from(studentTopicMap.values());
    },
    enabled: open && !!user?.id,
  });

  // Group students by topic
  const studentsByTopic = useMemo(() => {
    if (!masteryStudents) return {};
    
    const grouped: Record<string, MasteryStudent[]> = {};
    masteryStudents.forEach(student => {
      if (!grouped[student.topicName]) {
        grouped[student.topicName] = [];
      }
      grouped[student.topicName].push(student);
    });
    
    return grouped;
  }, [masteryStudents]);

  const toggleStudent = (studentId: string, topicName: string) => {
    setSelectedStudents(prev => {
      const exists = prev.find(s => s.id === studentId && s.topicName === topicName);
      if (exists) {
        return prev.filter(s => !(s.id === studentId && s.topicName === topicName));
      }
      
      const student = masteryStudents?.find(s => s.id === studentId && s.topicName === topicName);
      if (student) {
        return [...prev, { ...student, selected: true }];
      }
      return prev;
    });
  };

  const toggleAllInTopic = (topicName: string) => {
    const topicStudents = studentsByTopic[topicName] || [];
    const allSelected = topicStudents.every(s => 
      selectedStudents.some(sel => sel.id === s.id && sel.topicName === s.topicName)
    );

    if (allSelected) {
      setSelectedStudents(prev => 
        prev.filter(s => s.topicName !== topicName)
      );
    } else {
      setSelectedStudents(prev => {
        const existing = prev.filter(s => s.topicName !== topicName);
        return [...existing, ...topicStudents.map(s => ({ ...s, selected: true }))];
      });
    }
  };

  const toggleTopicExpanded = (topic: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: 'No students selected',
        description: 'Please select at least one student to generate a challenge worksheet.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Get unique topics from selected students
      const topics = [...new Set(selectedStudents.map(s => s.topicName))];
      
      const challengePrompt = challengeType === 'deeper' 
        ? 'Create advanced-level questions that test deep understanding and edge cases within the topic.'
        : challengeType === 'application'
        ? 'Create real-world application problems that require students to apply concepts in complex, multi-step scenarios.'
        : 'Create bridge problems that connect this topic to related advanced concepts and preview the next curriculum topic.';

      const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: topics.map(t => ({
            topicName: t,
            standard: '',
            subject: 'Mathematics',
            category: 'Mastery Challenge',
          })),
          questionCount: parseInt(questionCount),
          difficultyLevels: ['challenging', 'hard'],
          worksheetMode: 'practice',
          includeHints,
          customInstructions: `${challengePrompt} These students have demonstrated mastery (Level A or 95%+) on this topic. Create questions that will truly challenge them and confirm their command of the material. Questions should be significantly harder than standard practice problems.`,
        },
      });

      if (error) throw error;

      const questions = (data?.questions || []).map((q: any, idx: number) => ({
        ...q,
        questionNumber: idx + 1,
        advancementLevel: 'A' as const,
      }));

      setGeneratedQuestions(questions);
      setStep('preview');
      
      toast({
        title: 'Mastery challenge generated!',
        description: `Created ${questions.length} advanced questions for ${selectedStudents.length} student(s).`,
      });
    } catch (error: any) {
      console.error('Error generating mastery challenge:', error);
      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate mastery challenge questions.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedStudents([]);
    setGeneratedQuestions([]);
    onOpenChange(false);
  };

  const selectedTopics = [...new Set(selectedStudents.map(s => s.topicName))];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-5 w-5 text-amber-500" />
            Mastery Challenge Generator
          </DialogTitle>
          <DialogDescription>
            Generate advanced worksheets for students who have achieved Level A or scored 95%+ to test their command of the topic
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <>
            <ScrollArea className="flex-1 pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : Object.keys(studentsByTopic).length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium text-lg mb-2">No Mastery Students Yet</h3>
                    <p className="text-muted-foreground">
                      Students will appear here once they achieve Level A on diagnostic assessments or score 95%+ on topic assessments.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      Select students who have mastered topics to generate challenge worksheets
                    </p>
                    {selectedStudents.length > 0 && (
                      <Badge variant="default" className="bg-amber-500">
                        {selectedStudents.length} selected
                      </Badge>
                    )}
                  </div>

                  {Object.entries(studentsByTopic).map(([topic, students]) => {
                    const isExpanded = expandedTopics.has(topic);
                    const selectedInTopic = students.filter(s => 
                      selectedStudents.some(sel => sel.id === s.id && sel.topicName === s.topicName)
                    ).length;
                    const allSelected = selectedInTopic === students.length;

                    return (
                      <Collapsible key={topic} open={isExpanded} onOpenChange={() => toggleTopicExpanded(topic)}>
                        <Card>
                          <CollapsibleTrigger className="w-full">
                            <CardHeader className="py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={() => toggleAllInTopic(topic)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <div className="text-left">
                                    <CardTitle className="text-sm font-medium">{topic}</CardTitle>
                                    <CardDescription className="text-xs">
                                      {students.length} student{students.length !== 1 ? 's' : ''} at mastery level
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selectedInTopic > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {selectedInTopic} selected
                                    </Badge>
                                  )}
                                  <Badge className={cn('text-xs', LEVEL_COLORS['A'])}>
                                    Level A
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <div className="grid gap-2">
                                {students.map(student => {
                                  const isSelected = selectedStudents.some(
                                    s => s.id === student.id && s.topicName === student.topicName
                                  );

                                  return (
                                    <div
                                      key={`${student.id}-${student.topicName}`}
                                      className={cn(
                                        'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors',
                                        isSelected 
                                          ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                                          : 'hover:bg-muted/50'
                                      )}
                                      onClick={() => toggleStudent(student.id, student.topicName)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleStudent(student.id, student.topicName)}
                                        />
                                        <div>
                                          <p className="font-medium text-sm">
                                            {student.firstName} {student.lastName}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {student.latestGrade !== null && `Score: ${student.latestGrade}%`}
                                          </p>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <Check className="h-4 w-4 text-amber-600" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={() => setStep('configure')}
                disabled={selectedStudents.length === 0}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Users className="h-4 w-4 mr-2" />
                Configure Challenge ({selectedStudents.length})
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'configure' && (
          <>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Selected Summary */}
                <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      <span className="font-medium">Challenge for {selectedStudents.length} student(s)</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedTopics.map(topic => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Challenge Type Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Challenge Type</Label>
                  <div className="grid gap-3">
                    {Object.entries(CHALLENGE_TYPES).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <Card 
                          key={key}
                          className={cn(
                            'cursor-pointer transition-all',
                            challengeType === key 
                              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' 
                              : 'hover:border-muted-foreground/50'
                          )}
                          onClick={() => setChallengeType(key as ChallengeType)}
                        >
                          <CardContent className="p-4 flex items-start gap-3">
                            <div className={cn(
                              'p-2 rounded-lg',
                              challengeType === key ? 'bg-amber-100 text-amber-700' : 'bg-muted'
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{config.label}</h4>
                                {challengeType === key && (
                                  <Check className="h-4 w-4 text-amber-600" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {config.description}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Questions</Label>
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
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="hints" className="cursor-pointer">Include Hints</Label>
                    <Checkbox
                      id="hints"
                      checked={includeHints}
                      onCheckedChange={(checked) => setIncludeHints(!!checked)}
                    />
                  </div>
                </div>

                {/* Info Box */}
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <BookOpen className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          What happens next?
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          Students who complete the mastery challenge successfully can move on to a new topic or receive enrichment materials. 
                          Those who struggle may need additional review before progressing.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Challenge
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && (
          <>
            <ScrollArea className="flex-1 pr-4">
              <div className="mastery-challenge-worksheet bg-white text-black p-6 rounded-lg border">
                {/* Header */}
                <div className="border-b-2 border-black pb-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold">Mastery Challenge</h1>
                      <p className="text-sm text-gray-600">{selectedTopics.join(', ')}</p>
                    </div>
                    <Badge className={cn('text-sm', LEVEL_COLORS['A'])}>
                      Level A - Advanced
                    </Badge>
                  </div>
                  {selectedStudents.length === 1 && (
                    <p className="mt-2">
                      <strong>Student:</strong> {selectedStudents[0].firstName} {selectedStudents[0].lastName}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>Date: _______________</span>
                    <span>Period: ________</span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm">
                  <strong>Instructions:</strong> This is an advanced challenge worksheet. 
                  Show all your work and explain your reasoning. These problems are designed to test 
                  your complete mastery of the topic.
                </div>

                {/* Questions */}
                <div className="space-y-6">
                  {generatedQuestions.map((q, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                          {q.questionNumber}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {q.difficulty}
                        </Badge>
                      </div>
                      <p className="text-base mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                        {q.question}
                      </p>
                      {includeHints && q.hint && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4 text-sm">
                          <span className="font-semibold text-yellow-700">💡 Hint:</span>{' '}
                          <span className="text-yellow-800 italic">{q.hint}</span>
                        </div>
                      )}
                      <div className="border-2 border-dashed border-gray-300 rounded p-4 min-h-[120px]">
                        <p className="text-xs text-gray-400">Show your work:</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
                  Mastery Challenge • {selectedTopics[0] || 'Mathematics'}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('configure')}>
                Back
              </Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Worksheet
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}