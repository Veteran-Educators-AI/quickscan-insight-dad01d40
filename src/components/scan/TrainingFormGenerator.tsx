import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Printer, FileText, Loader2, AlertCircle, Zap, TrendingDown, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GEOMETRY_TOPICS, ALGEBRA1_TOPICS, ALGEBRA2_TOPICS, TopicCategory } from '@/data/nysTopics';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';

interface GeneratedQuestion {
  question: string;
  answer?: string;
  difficulty?: string;
  standard?: string;
  diagramSvg?: string;
  topicName?: string; // For multi-topic forms
}

interface TrainingFormGeneratorProps {
  onFormGenerated?: () => void;
}

interface WeakTopic {
  topicName: string;
  standard: string | null;
  studentCount: number;
  averageScore: number;
  subject: string;
  hasSamples: boolean;
  sampleCount: number;
}

const SUBJECTS = [
  { id: 'geometry', name: 'Geometry', topics: GEOMETRY_TOPICS },
  { id: 'algebra1', name: 'Algebra 1', topics: ALGEBRA1_TOPICS },
  { id: 'algebra2', name: 'Algebra 2', topics: ALGEBRA2_TOPICS },
];

export function TrainingFormGenerator({ onFormGenerated }: TrainingFormGeneratorProps) {
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentTopicName, setCurrentTopicName] = useState<string>('');
  const [currentStandard, setCurrentStandard] = useState<string>('');
  const [isLoadingWeakTopics, setIsLoadingWeakTopics] = useState(false);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [showQuickGenerate, setShowQuickGenerate] = useState(false);
  const [isMultiTopicForm, setIsMultiTopicForm] = useState(false);
  const [multiTopicNames, setMultiTopicNames] = useState<string[]>([]);

  const getTopicsForSubject = (subjectId: string): TopicCategory[] => {
    const subject = SUBJECTS.find(s => s.id === subjectId);
    return subject?.topics || [];
  };

  const getFlatTopics = (categories: TopicCategory[]) => {
    return categories.flatMap(cat => 
      cat.topics.map(t => ({
        ...t,
        category: cat.category,
        fullLabel: `${cat.category} - ${t.name}`
      }))
    );
  };

  // Find which subject a topic belongs to
  const findSubjectForTopic = (topicName: string): { subject: string; standard: string; category: string } | null => {
    for (const subject of SUBJECTS) {
      const flatTopics = getFlatTopics(subject.topics);
      const found = flatTopics.find(t => t.name.toLowerCase() === topicName.toLowerCase());
      if (found) {
        return { subject: subject.id, standard: found.standard, category: found.category };
      }
    }
    return null;
  };

  const fetchWeakTopics = async () => {
    if (!user) return;

    setIsLoadingWeakTopics(true);
    try {
      // Fetch grade history and teacher samples in parallel
      const [gradeResult, samplesResult] = await Promise.all([
        supabase
          .from('grade_history')
          .select('topic_name, nys_standard, grade, student_id')
          .eq('teacher_id', user.id),
        supabase
          .from('teacher_answer_samples')
          .select('topic_name')
          .eq('teacher_id', user.id)
      ]);

      if (gradeResult.error) throw gradeResult.error;
      if (samplesResult.error) throw samplesResult.error;

      const gradeData = gradeResult.data;
      const samplesData = samplesResult.data;

      if (!gradeData || gradeData.length === 0) {
        toast.info('No student data yet. Add some grades first to see weak topics.');
        setShowQuickGenerate(false);
        return;
      }

      // Count samples per topic (normalize topic names for matching)
      const sampleCounts: Record<string, number> = {};
      for (const sample of samplesData || []) {
        const normalizedName = sample.topic_name.toLowerCase().trim();
        sampleCounts[normalizedName] = (sampleCounts[normalizedName] || 0) + 1;
      }

      // Group grades by topic and calculate stats
      const topicStats: Record<string, { 
        scores: number[]; 
        students: Set<string>; 
        standard: string | null;
      }> = {};

      for (const grade of gradeData) {
        if (!topicStats[grade.topic_name]) {
          topicStats[grade.topic_name] = { 
            scores: [], 
            students: new Set(), 
            standard: grade.nys_standard 
          };
        }
        topicStats[grade.topic_name].scores.push(grade.grade);
        topicStats[grade.topic_name].students.add(grade.student_id);
      }

      // Find weak topics (average score < 70)
      const weak: WeakTopic[] = [];
      for (const [topicName, stats] of Object.entries(topicStats)) {
        const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
        if (avg < 70) {
          const subjectInfo = findSubjectForTopic(topicName);
          if (subjectInfo) {
            const normalizedName = topicName.toLowerCase().trim();
            const sampleCount = sampleCounts[normalizedName] || 0;
            weak.push({
              topicName,
              standard: stats.standard || subjectInfo.standard,
              studentCount: stats.students.size,
              averageScore: Math.round(avg),
              subject: subjectInfo.subject,
              hasSamples: sampleCount > 0,
              sampleCount,
            });
          }
        }
      }

      // Sort: prioritize topics WITHOUT samples, then by severity
      weak.sort((a, b) => {
        // First: topics without samples come first
        if (!a.hasSamples && b.hasSamples) return -1;
        if (a.hasSamples && !b.hasSamples) return 1;
        
        // Second: sort by severity (student count × score gap)
        const scoreA = a.studentCount * (70 - a.averageScore);
        const scoreB = b.studentCount * (70 - b.averageScore);
        return scoreB - scoreA;
      });

      setWeakTopics(weak.slice(0, 5)); // Top 5 weak topics
      setShowQuickGenerate(true);

      if (weak.length === 0) {
        toast.success('Great news! No weak topics found. Your students are doing well!');
        setShowQuickGenerate(false);
      } else {
        const untrainedCount = weak.filter(t => !t.hasSamples).length;
        if (untrainedCount > 0) {
          toast.info(`Found ${untrainedCount} weak topic${untrainedCount > 1 ? 's' : ''} without training samples - prioritized first!`);
        }
      }
    } catch (error) {
      console.error('Error fetching weak topics:', error);
      toast.error('Failed to analyze student data');
    } finally {
      setIsLoadingWeakTopics(false);
    }
  };

  const handleQuickGenerate = async (topic: WeakTopic) => {
    const subjectInfo = findSubjectForTopic(topic.topicName);
    if (!subjectInfo) {
      toast.error('Could not find topic in curriculum');
      return;
    }

    setIsGenerating(true);
    setCurrentTopicName(topic.topicName);
    setCurrentStandard(topic.standard || subjectInfo.standard);

    try {
      const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: [{
            topicName: topic.topicName,
            standard: topic.standard || subjectInfo.standard,
            subject: topic.subject,
            category: subjectInfo.category,
          }],
          questionCount,
          difficultyLevels: ['medium', 'hard'],
          worksheetMode: 'practice',
          includeAnswerKey: true,
          includeHints: false,
        },
      });

      if (error) throw error;

      if (data?.questions && data.questions.length > 0) {
        setGeneratedQuestions(data.questions);
        setShowQuickGenerate(false);
        toast.success(`Generated ${data.questions.length} questions for "${topic.topicName}"!`);
        onFormGenerated?.();
      } else {
        throw new Error('No questions generated');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTrainAll = async () => {
    const untrainedTopics = weakTopics.filter(t => !t.hasSamples);
    if (untrainedTopics.length === 0) {
      toast.info('All weak topics already have training samples!');
      return;
    }

    setIsGenerating(true);
    setIsMultiTopicForm(true);
    setMultiTopicNames(untrainedTopics.map(t => t.topicName));

    try {
      // Generate 2 questions per topic for a manageable combined form
      const questionsPerTopic = Math.min(2, questionCount);
      const allQuestions: GeneratedQuestion[] = [];

      for (const topic of untrainedTopics) {
        const subjectInfo = findSubjectForTopic(topic.topicName);
        if (!subjectInfo) continue;

        const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
          body: {
            topics: [{
              topicName: topic.topicName,
              standard: topic.standard || subjectInfo.standard,
              subject: topic.subject,
              category: subjectInfo.category,
            }],
            questionCount: questionsPerTopic,
            difficultyLevels: ['medium', 'hard'],
            worksheetMode: 'practice',
            includeAnswerKey: true,
            includeHints: false,
          },
        });

        if (!error && data?.questions) {
          // Tag each question with its topic
          const taggedQuestions = data.questions.map((q: GeneratedQuestion) => ({
            ...q,
            topicName: topic.topicName,
          }));
          allQuestions.push(...taggedQuestions);
        }
      }

      if (allQuestions.length > 0) {
        setGeneratedQuestions(allQuestions);
        setCurrentTopicName(`${untrainedTopics.length} Untrained Topics`);
        setCurrentStandard('Multiple Standards');
        setShowQuickGenerate(false);
        toast.success(`Generated ${allQuestions.length} questions across ${untrainedTopics.length} topics!`);
        onFormGenerated?.();
      } else {
        throw new Error('No questions generated');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to generate questions. Please try again.');
      setIsMultiTopicForm(false);
      setMultiTopicNames([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSubject || !selectedTopic) {
      toast.error('Please select a subject and topic');
      return;
    }

    const topics = getTopicsForSubject(selectedSubject);
    const flatTopics = getFlatTopics(topics);
    const topic = flatTopics.find(t => t.name === selectedTopic);

    if (!topic) {
      toast.error('Topic not found');
      return;
    }

    setIsGenerating(true);
    setCurrentTopicName(topic.name);
    setCurrentStandard(topic.standard);
    setIsMultiTopicForm(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: [{
            topicName: topic.name,
            standard: topic.standard,
            subject: selectedSubject,
            category: topic.category,
          }],
          questionCount,
          difficultyLevels: ['medium', 'hard'],
          worksheetMode: 'practice',
          includeAnswerKey: true,
          includeHints: false,
        },
      });

      if (error) throw error;

      if (data?.questions && data.questions.length > 0) {
        setGeneratedQuestions(data.questions);
        toast.success(`Generated ${data.questions.length} questions for you to solve!`);
        onFormGenerated?.();
      } else {
        throw new Error('No questions generated');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setGeneratedQuestions([]);
    setCurrentTopicName('');
    setCurrentStandard('');
    setShowQuickGenerate(false);
    setIsMultiTopicForm(false);
    setMultiTopicNames([]);
  };

  const untrainedCount = weakTopics.filter(t => !t.hasSamples).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Training Form
          </CardTitle>
          <CardDescription>
            Create a blank assessment form to solve by hand, then scan your answers to train the AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {generatedQuestions.length === 0 ? (
            <>
              {/* Quick Generate Button */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  onClick={fetchWeakTopics}
                  disabled={isLoadingWeakTopics || isGenerating}
                  className="flex-1"
                >
                  {isLoadingWeakTopics ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Student Data...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Quick Generate from Weak Topics
                    </>
                  )}
                </Button>
              </div>

              {/* Weak Topics Display */}
              {showQuickGenerate && weakTopics.length > 0 && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    Topics Where Students Struggle Most
                  </div>
                  <div className="space-y-2">
                    {weakTopics.map((topic, idx) => (
                      <div
                        key={topic.topicName}
                        className={`flex items-center justify-between p-3 bg-background rounded-md border ${
                          !topic.hasSamples ? 'border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{topic.topicName}</p>
                            {!topic.hasSamples && (
                              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                Needs Training
                              </Badge>
                            )}
                            {topic.hasSamples && (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {topic.sampleCount} sample{topic.sampleCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {topic.studentCount} student{topic.studentCount !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="destructive" className="text-xs">
                              Avg: {topic.averageScore}%
                            </Badge>
                            {topic.standard && (
                              <span className="text-xs text-muted-foreground">
                                {topic.standard}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={!topic.hasSamples ? "default" : "outline"}
                          onClick={() => handleQuickGenerate(topic)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Generate'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Train All Button */}
                  {untrainedCount > 1 && (
                    <Button
                      onClick={handleTrainAll}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating for All Topics...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Train All ({untrainedCount} untrained topics)
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickGenerate(false)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Manual Selection */}
              {!showQuickGenerate && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or select manually
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select value={selectedSubject} onValueChange={(v) => {
                        setSelectedSubject(v);
                        setSelectedTopic('');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Number of Questions</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 3)))}
                      />
                    </div>
                  </div>

                  {selectedSubject && (
                    <div className="space-y-2">
                      <Label>Topic</Label>
                      <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select topic" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {getTopicsForSubject(selectedSubject).map(category => (
                            <div key={category.category}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                                {category.category}
                              </div>
                              {category.topics.map(topic => (
                                <SelectItem key={topic.name} value={topic.name}>
                                  {topic.name} ({topic.standard})
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      After generating, print the form, solve the problems by hand showing your work, 
                      then scan your completed work using the Teacher Answer Sample Uploader above.
                    </AlertDescription>
                  </Alert>

                  <Button 
                    onClick={handleGenerate} 
                    disabled={!selectedSubject || !selectedTopic || isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Training Form
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{currentTopicName}</p>
                  <p className="text-sm text-muted-foreground">NYS Standard: {currentStandard}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    Generate New
                  </Button>
                  <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Form
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-card">
                <p className="text-sm text-muted-foreground mb-4">
                  Preview of your training form ({generatedQuestions.length} questions):
                </p>
                <div className="space-y-4">
                  {generatedQuestions.slice(0, 2).map((q, idx) => (
                    <div key={idx} className="border-l-2 border-primary pl-3">
                      <p className="text-sm font-medium">Question {idx + 1}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{q.question}</p>
                    </div>
                  ))}
                  {generatedQuestions.length > 2 && (
                    <p className="text-sm text-muted-foreground italic">
                      +{generatedQuestions.length - 2} more questions...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print-only content */}
      <div className="hidden print:block">
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              .print-training-form, .print-training-form * { visibility: visible; }
              .print-training-form { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%;
                padding: 20px;
              }
              @page { margin: 0.75in; }
            }
          `}
        </style>
        <div className="print-training-form">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Teacher Training Form</h1>
            <p className="text-lg">{currentTopicName}</p>
            {!isMultiTopicForm && (
              <p className="text-sm text-gray-500">NYS Standard: {currentStandard}</p>
            )}
            {isMultiTopicForm && multiTopicNames.length > 0 && (
              <p className="text-sm text-gray-500">
                Topics: {multiTopicNames.join(', ')}
              </p>
            )}
            <p className="text-sm text-gray-400 mt-2">
              Solve each problem showing all work. Then scan this completed form to train the AI grader.
            </p>
          </div>

          <div className="space-y-8">
            {generatedQuestions.map((q, idx) => (
              <div key={idx} className="border-b pb-6">
                <div className="flex items-start gap-2 mb-4">
                  <span className="font-bold text-lg">{idx + 1}.</span>
                  <div>
                    {isMultiTopicForm && q.topicName && (
                      <p className="text-xs text-gray-500 mb-1 font-medium">[{q.topicName}]</p>
                    )}
                    <p className="text-base">{q.question}</p>
                    {q.diagramSvg && (
                      <div 
                        className="mt-2 max-w-xs" 
                        dangerouslySetInnerHTML={{ __html: q.diagramSvg }} 
                      />
                    )}
                  </div>
                </div>
                {/* Work space */}
                <div className="ml-6">
                  <p className="text-xs text-gray-400 mb-2">Show your work:</p>
                  <div className="border border-gray-300 h-48 bg-white"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
            <p>After completing, use the Teacher Answer Sample Uploader to scan this form.</p>
            <p>The AI will learn your notation, methods, and grading preferences from your solutions.</p>
          </div>
        </div>
      </div>
    </>
  );
}
