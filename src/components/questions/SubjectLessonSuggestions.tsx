import { useState } from 'react';
import { ChevronRight, Clock, Target, Sparkles, Brain, FileText, BookOpen, Calculator, Atom, Globe, Scale, DollarSign, Dna, Mountain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { type TopicCategory, type JMAPTopic } from '@/data/nysTopics';
import { SubjectWorksheetGeneratorDialog, type GeneratedQuestion } from './SubjectWorksheetGeneratorDialog';
import { FORMULA_REFERENCE } from '@/data/formulaReference';
import { GeometryPacingCalendar } from './GeometryPacingCalendar';

interface SubjectLessonSuggestionsProps {
  subject: string;
  subjectId: string;
  categories: TopicCategory[];
  onSelectTopic?: (topic: JMAPTopic, category: TopicCategory) => void;
  onGenerateQuestions?: (questions: GeneratedQuestion[]) => void;
}

// Subject icons mapping
const SUBJECT_ICONS: Record<string, React.ReactNode> = {
  algebra1: <Calculator className="h-5 w-5" />,
  geometry: <Target className="h-5 w-5" />,
  algebra2: <Calculator className="h-5 w-5" />,
  precalculus: <Calculator className="h-5 w-5" />,
  financialmath: <DollarSign className="h-5 w-5" />,
  physics: <Atom className="h-5 w-5" />,
  chemistry: <Atom className="h-5 w-5" />,
  biology: <Dna className="h-5 w-5" />,
  livingenvironment: <Dna className="h-5 w-5" />,
  earthscience: <Mountain className="h-5 w-5" />,
  history: <Globe className="h-5 w-5" />,
  government: <Scale className="h-5 w-5" />,
  economics: <DollarSign className="h-5 w-5" />,
};

// Subject color schemes
const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  algebra1: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  geometry: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  algebra2: { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
  precalculus: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  physics: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  chemistry: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  biology: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  earthscience: { bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
  history: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  government: { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' },
  economics: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
  financialmath: { bg: 'bg-lime-50 dark:bg-lime-950/30', border: 'border-lime-200 dark:border-lime-800', text: 'text-lime-700 dark:text-lime-300', badge: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200' },
};

// Generate suggested lessons for each topic
const generateLessonSuggestions = (topic: JMAPTopic, category: string, subject: string) => {
  return [
    {
      id: `${topic.name}-intro`,
      title: `Introduction to ${topic.name}`,
      description: `Build foundational understanding of ${topic.name} concepts and vocabulary`,
      duration: '45 min',
      objectives: [
        `Define key terms related to ${topic.name}`,
        `Identify real-world applications`,
        `Solve basic problems with guidance`,
      ],
      standards: [topic.standard],
    },
    {
      id: `${topic.name}-practice`,
      title: `${topic.name} Practice Workshop`,
      description: `Hands-on practice with guided examples and independent work`,
      duration: '50 min',
      objectives: [
        `Apply ${topic.name} concepts to solve problems`,
        `Identify and correct common errors`,
        `Build procedural fluency`,
      ],
      standards: [topic.standard],
    },
    {
      id: `${topic.name}-advanced`,
      title: `Advanced ${topic.name} Applications`,
      description: `Challenge problems and real-world applications`,
      duration: '55 min',
      objectives: [
        `Solve complex multi-step problems`,
        `Connect ${topic.name} to other mathematical concepts`,
        `Analyze and evaluate solution strategies`,
      ],
      standards: [topic.standard],
    },
  ];
};

export function SubjectLessonSuggestions({
  subject,
  subjectId,
  categories,
  onSelectTopic,
  onGenerateQuestions,
}: SubjectLessonSuggestionsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showWorksheetGenerator, setShowWorksheetGenerator] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<JMAPTopic | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TopicCategory | null>(null);
  const [preselectedLevel, setPreselectedLevel] = useState<'basic' | 'intermediate' | 'advanced' | undefined>(undefined);

  const colors = SUBJECT_COLORS[subjectId] || SUBJECT_COLORS.algebra1;
  const icon = SUBJECT_ICONS[subjectId] || <BookOpen className="h-5 w-5" />;

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const handleQuestionGeneration = (topic: JMAPTopic, category: TopicCategory, level?: 'basic' | 'intermediate' | 'advanced') => {
    setSelectedTopic(topic);
    setSelectedCategory(category);
    setPreselectedLevel(level);
    setShowWorksheetGenerator(true);
  };

  // Check if category has formulas
  const hasFormulas = (categoryName: string) => {
    return !!FORMULA_REFERENCE[categoryName];
  };

  return (
    <>
      {/* Show Pacing Calendar for Geometry */}
      {subjectId === 'geometry' && (
        <GeometryPacingCalendar />
      )}
      
      <Card className={`border-2 ${colors.border}`}>
        <CardHeader className={`pb-3 ${colors.bg}`}>
          <div className="flex items-center gap-2">
            <div className={colors.text}>{icon}</div>
            <CardTitle className="text-lg">{subject} Lesson Suggestions</CardTitle>
          </div>
          <CardDescription>
            Topic-based lessons with question generation for {subject}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
        <ScrollArea className="h-[500px] pr-2">
          <div className="space-y-3">
            {categories.map((category) => {
              const isExpanded = expandedCategories.has(category.category);
              const topicCount = category.topics.length;

              return (
                <Collapsible
                  key={category.category}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.category)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={`w-full p-3 rounded-lg border ${colors.bg} ${colors.border} hover:shadow-md transition-all text-left`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold text-sm ${colors.text}`}>{category.category}</h3>
                          <Badge variant="secondary" className={`text-xs ${colors.badge}`}>
                            {topicCount} topics
                          </Badge>
                          {hasFormulas(category.category) && (
                            <Badge variant="outline" className="text-xs">
                              <Calculator className="h-3 w-3 mr-1" />
                              Formulas
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-2 ml-2 space-y-2">
                    {category.topics.map((topic) => {
                      const lessons = generateLessonSuggestions(topic, category.category, subject);

                      return (
                        <div key={topic.name} className="p-3 rounded-md border bg-card">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-sm">{topic.name}</h4>
                              <Badge variant="outline" className="text-xs font-mono mt-1">
                                {topic.standard}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => onSelectTopic?.(topic, category)}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Lesson
                            </Button>
                          </div>

                          {/* Quick lesson previews */}
                          <div className="space-y-1 mb-3">
                            {lessons.slice(0, 2).map((lesson) => (
                              <button
                                key={lesson.id}
                                onClick={() => onSelectTopic?.(topic, category)}
                                className="w-full text-left p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium">{lesson.title}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-2 w-2 mr-1" />
                                    {lesson.duration}
                                  </Badge>
                                </div>
                              </button>
                            ))}
                          </div>

                          {/* Question Level Buttons */}
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Brain className="h-3 w-3" />
                              Generate Questions by Level
                            </p>
                            <div className="grid grid-cols-3 gap-1">
                              {(['basic', 'intermediate', 'advanced'] as const).map((level) => (
                                <Button
                                  key={level}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleQuestionGeneration(topic, category, level)}
                                >
                                  {level === 'basic' && '📗'}
                                  {level === 'intermediate' && '📘'}
                                  {level === 'advanced' && '📕'}
                                  <span className="ml-1 capitalize">{level}</span>
                                </Button>
                              ))}
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full h-7 text-xs"
                              onClick={() => handleQuestionGeneration(topic, category)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Custom Worksheet
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Worksheet Generator Dialog */}
      {selectedTopic && selectedCategory && (
        <SubjectWorksheetGeneratorDialog
          open={showWorksheetGenerator}
          onOpenChange={setShowWorksheetGenerator}
          subject={subject}
          subjectId={subjectId}
          category={selectedCategory}
          topic={selectedTopic}
          preselectedLevel={preselectedLevel}
          onGenerate={(questions) => {
            onGenerateQuestions?.(questions);
          }}
        />
      )}
    </Card>
    </>
  );
}
