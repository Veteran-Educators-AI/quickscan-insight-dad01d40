import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Printer, FileText, Loader2, Download, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GEOMETRY_TOPICS, ALGEBRA1_TOPICS, ALGEBRA2_TOPICS, TopicCategory } from '@/data/nysTopics';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GeneratedQuestion {
  question: string;
  answer?: string;
  difficulty?: string;
  standard?: string;
  diagramSvg?: string;
}

interface TrainingFormGeneratorProps {
  onFormGenerated?: () => void;
}

const SUBJECTS = [
  { id: 'geometry', name: 'Geometry', topics: GEOMETRY_TOPICS },
  { id: 'algebra1', name: 'Algebra 1', topics: ALGEBRA1_TOPICS },
  { id: 'algebra2', name: 'Algebra 2', topics: ALGEBRA2_TOPICS },
];

export function TrainingFormGenerator({ onFormGenerated }: TrainingFormGeneratorProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentTopicName, setCurrentTopicName] = useState<string>('');
  const [currentStandard, setCurrentStandard] = useState<string>('');

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
  };

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
            <p className="text-sm text-gray-500">NYS Standard: {currentStandard}</p>
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
