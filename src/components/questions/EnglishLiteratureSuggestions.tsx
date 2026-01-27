import { useState, useMemo, useEffect } from 'react';
import { BookOpen, ChevronRight, Clock, Target, Sparkles, GraduationCap, Brain, Lightbulb, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  LITERARY_TEXTS,
  TEXT_QUESTIONS,
  getLessonsByText,
  getQuestionsByLevel,
  type LiteraryText,
  type LessonSuggestion,
  type TextQuestion,
} from '@/data/englishLiteratureTopics';
import { EnglishWorksheetGeneratorDialog, type GeneratedEnglishQuestion } from './EnglishWorksheetGeneratorDialog';

interface EnglishLiteratureSuggestionsProps {
  searchQuery?: string;
  onSelectLesson?: (lesson: LessonSuggestion) => void;
  onGenerateWorksheet?: (textId: string, questions: TextQuestion[]) => void;
  onGenerateAIQuestions?: (questions: GeneratedEnglishQuestion[]) => void;
}

export function EnglishLiteratureSuggestions({ 
  searchQuery = '',
  onSelectLesson, 
  onGenerateWorksheet,
  onGenerateAIQuestions,
}: EnglishLiteratureSuggestionsProps) {
  const [selectedText, setSelectedText] = useState<LiteraryText | null>(null);
  const [showLessonDetail, setShowLessonDetail] = useState<LessonSuggestion | null>(null);
  const [expandedTexts, setExpandedTexts] = useState<Set<string>>(new Set());
  const [showWorksheetGenerator, setShowWorksheetGenerator] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonSuggestion | null>(null);
  const [preselectedLevel, setPreselectedLevel] = useState<'comprehension' | 'analysis' | 'higher-order' | undefined>(undefined);

  // Filter texts based on search query
  const filteredTexts = useMemo(() => {
    if (!searchQuery.trim()) return LITERARY_TEXTS;
    
    const lowerQuery = searchQuery.toLowerCase();
    
    return LITERARY_TEXTS.filter(text =>
      text.title.toLowerCase().includes(lowerQuery) ||
      text.author.toLowerCase().includes(lowerQuery) ||
      text.genre.toLowerCase().includes(lowerQuery) ||
      text.themes.some(theme => theme.toLowerCase().includes(lowerQuery)) ||
      getLessonsByText(text.id).some(lesson => 
        lesson.title.toLowerCase().includes(lowerQuery) ||
        lesson.description.toLowerCase().includes(lowerQuery)
      )
    );
  }, [searchQuery]);

  // Auto-expand texts when searching
  useEffect(() => {
    if (searchQuery.trim() && filteredTexts.length > 0) {
      setExpandedTexts(new Set(filteredTexts.map(t => t.id)));
    }
  }, [searchQuery, filteredTexts]);

  const toggleText = (textId: string) => {
    setExpandedTexts(prev => {
      const next = new Set(prev);
      if (next.has(textId)) {
        next.delete(textId);
      } else {
        next.add(textId);
      }
      return next;
    });
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
      amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
      rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
    };
    return colors[color] || colors.amber;
  };

  const getLevelIcon = (level: TextQuestion['level']) => {
    switch (level) {
      case 'comprehension': return <BookOpen className="h-4 w-4" />;
      case 'analysis': return <Brain className="h-4 w-4" />;
      case 'higher-order': return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: TextQuestion['level']) => {
    switch (level) {
      case 'comprehension': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'analysis': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'higher-order': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Literature Lesson Suggestions</CardTitle>
          {searchQuery.trim() && (
            <Badge variant="secondary" className="ml-auto">
              {filteredTexts.length} results
            </Badge>
          )}
        </div>
        <CardDescription>
          Pre-built lessons and questions for core literary texts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredTexts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No texts match "{searchQuery}"</p>
          </div>
        ) : filteredTexts.map((text) => {
          const colors = getColorClasses(text.coverColor);
          const lessons = getLessonsByText(text.id);
          const questions = TEXT_QUESTIONS[text.id] || [];
          const isExpanded = expandedTexts.has(text.id);

          return (
            <Collapsible 
              key={text.id} 
              open={isExpanded} 
              onOpenChange={() => toggleText(text.id)}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={`w-full p-4 rounded-lg border ${colors.bg} ${colors.border} hover:shadow-md transition-all text-left`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${colors.text}`}>{text.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {text.gradeLevel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        by {text.author} • {text.genre}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {text.themes.slice(0, 4).map((theme) => (
                          <Badge key={theme} variant="secondary" className={`text-xs ${colors.badge}`}>
                            {theme}
                          </Badge>
                        ))}
                        {text.themes.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{text.themes.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary">
                        {lessons.length} lessons
                      </Badge>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2 ml-4 space-y-3">
                {/* Quick Stats */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" />
                    {questions.length} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {text.literaryDevices.length} literary devices
                  </span>
                </div>

                {/* Literary Devices */}
                <div className="flex flex-wrap gap-1">
                  {text.literaryDevices.map((device) => (
                    <Badge key={device} variant="outline" className="text-xs">
                      {device}
                    </Badge>
                  ))}
                </div>

                {/* Lesson Suggestions */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Suggested Lessons
                  </h4>
                  {lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => setShowLessonDetail(lesson)}
                      className="w-full p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">{lesson.title}</h5>
                          <p className="text-xs text-muted-foreground mt-1">
                            {lesson.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {lesson.duration}
                            </Badge>
                            {lesson.standards.slice(0, 2).map((std) => (
                              <Badge key={std} variant="outline" className="text-xs font-mono">
                                {std}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Question Levels - Opens AI Generator */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    Generate Questions by Level
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(['comprehension', 'analysis', 'higher-order'] as const).map((level) => {
                      const levelQuestions = getQuestionsByLevel(text.id, level);
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            setSelectedText(text);
                            setPreselectedLevel(level);
                            setSelectedLesson(null);
                            setShowWorksheetGenerator(true);
                          }}
                          className={`p-2 rounded-md border hover:shadow-sm transition-all ${getLevelColor(level)}`}
                        >
                          <div className="flex items-center gap-1">
                            {getLevelIcon(level)}
                            <span className="text-xs font-medium capitalize">{level.replace('-', ' ')}</span>
                          </div>
                          <p className="text-lg font-bold mt-1">{levelQuestions.length}</p>
                          <p className="text-xs opacity-75">sample questions</p>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Generate Custom Questions Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => {
                      setSelectedText(text);
                      setPreselectedLevel(undefined);
                      setSelectedLesson(null);
                      setShowWorksheetGenerator(true);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Custom Worksheet
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>

      {/* Lesson Detail Dialog */}
      <Dialog open={!!showLessonDetail} onOpenChange={() => setShowLessonDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {showLessonDetail && (
            <>
              <DialogHeader>
                <DialogTitle>{showLessonDetail.title}</DialogTitle>
                <DialogDescription>{showLessonDetail.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {showLessonDetail.duration}
                  </Badge>
                  {showLessonDetail.standards.map((std) => (
                    <Badge key={std} variant="outline" className="font-mono">
                      {std}
                    </Badge>
                  ))}
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Learning Objectives
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {showLessonDetail.objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Activities
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {showLessonDetail.activities.map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-green-600" />
                    Assessment Ideas
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {showLessonDetail.assessmentIdeas.map((idea, i) => (
                      <li key={i}>{idea}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      onSelectLesson?.(showLessonDetail);
                      setShowLessonDetail(null);
                    }}
                    className="flex-1"
                  >
                    Use This Lesson
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      // Find the text for this lesson
                      const lessonText = LITERARY_TEXTS.find(t => t.id === showLessonDetail.textId);
                      if (lessonText) {
                        setSelectedText(lessonText);
                        setSelectedLesson(showLessonDetail);
                        setPreselectedLevel(undefined);
                        setShowWorksheetGenerator(true);
                        setShowLessonDetail(null);
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Questions
                  </Button>
                  <Button variant="outline" onClick={() => setShowLessonDetail(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Worksheet Generator Dialog */}
      <EnglishWorksheetGeneratorDialog
        open={showWorksheetGenerator}
        onOpenChange={setShowWorksheetGenerator}
        text={selectedText}
        lesson={selectedLesson}
        preselectedLevel={preselectedLevel}
        onGenerate={(questions) => {
          onGenerateAIQuestions?.(questions);
          // Also trigger legacy callback for backward compatibility
          if (selectedText && onGenerateWorksheet) {
            const legacyQuestions = questions.map(q => ({
              level: q.cognitiveLevel,
              bloomLevel: q.cognitiveLevel === 'comprehension' ? 'understand' as const : 
                         q.cognitiveLevel === 'analysis' ? 'analyze' as const : 'evaluate' as const,
              question: q.question,
              standard: q.standard,
            }));
            onGenerateWorksheet(selectedText.id, legacyQuestions);
          }
        }}
      />
    </Card>
  );
}
