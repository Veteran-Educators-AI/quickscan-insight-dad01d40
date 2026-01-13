import { useState, useMemo } from 'react';
import { Search, BookOpen, ExternalLink, Plus, ChevronDown, ChevronRight, Check, Sparkles, ClipboardCheck, X, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NYS_SUBJECTS, searchTopics, type JMAPTopic, type TopicCategory } from '@/data/nysTopics';
import { WorksheetBuilder, type WorksheetQuestion } from '@/components/questions/WorksheetBuilder';
import { DifferentiatedWorksheetGenerator } from '@/components/questions/DifferentiatedWorksheetGenerator';
import { LessonPlanGenerator } from '@/components/questions/LessonPlanGenerator';
import { useToast } from '@/hooks/use-toast';

export default function Questions() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('geometry');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [worksheetQuestions, setWorksheetQuestions] = useState<WorksheetQuestion[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
const [showDifferentiatedGenerator, setShowDifferentiatedGenerator] = useState(false);
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [initialTopicsForGenerator, setInitialTopicsForGenerator] = useState<{ topicName: string; standard: string }[]>([]);
  const [showLessonGenerator, setShowLessonGenerator] = useState(false);
  const [selectedLessonTopic, setSelectedLessonTopic] = useState<{ topicName: string; standard: string; subject?: string } | null>(null);

  // Get selected topics as array for passing to generator
  const getSelectedTopicsArray = () => {
    const allTopics = NYS_SUBJECTS.flatMap(subject =>
      subject.categories.flatMap(category =>
        category.topics.map(topic => ({
          topic,
          subject: subject.name,
          category: category.category,
          id: getTopicId(topic, subject.name, category.category),
        }))
      )
    );
    
    return Array.from(selectedTopics).map(topicId => {
      const found = allTopics.find(t => t.id === topicId);
      return found ? { topicName: found.topic.name, standard: found.topic.standard } : null;
    }).filter(Boolean) as { topicName: string; standard: string }[];
  };

  // Get topics from both selected checkboxes AND worksheet builder
  const getAllTopicsArray = () => {
    // Get topics from checkbox selection
    const fromSelection = getSelectedTopicsArray();
    
    // Get topics from worksheet builder
    const fromWorksheet = worksheetQuestions.map(q => ({
      topicName: q.topicName,
      standard: q.standard,
    }));
    
    // Merge and dedupe by topicName
    const combined = [...fromSelection];
    fromWorksheet.forEach(wt => {
      if (!combined.some(t => t.topicName === wt.topicName)) {
        combined.push(wt);
      }
    });
    
    return combined;
  };

  const openDiagnosticMode = () => {
    const topicsArray = getAllTopicsArray();
    setInitialTopicsForGenerator(topicsArray);
    setDiagnosticMode(true);
    setShowDifferentiatedGenerator(true);
  };

  const openRegularMode = () => {
    const topicsArray = getAllTopicsArray();
    setInitialTopicsForGenerator(topicsArray);
    setDiagnosticMode(false);
    setShowDifferentiatedGenerator(true);
  };

  const openLessonPlanGenerator = () => {
    const topicsArray = getAllTopicsArray();
    if (topicsArray.length === 0) {
      toast({
        title: 'No topics selected',
        description: 'Please select at least one topic to create a lesson plan.',
      });
      return;
    }
    // Use the first selected topic for the lesson plan
    const firstTopic = topicsArray[0];
    const currentSubjectData = NYS_SUBJECTS.find(s => s.id === selectedSubject);
    setSelectedLessonTopic({
      topicName: firstTopic.topicName,
      standard: firstTopic.standard,
      subject: currentSubjectData?.name,
    });
    setShowLessonGenerator(true);
  };

  // Get current subject data
  const currentSubject = NYS_SUBJECTS.find(s => s.id === selectedSubject);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchTopics(searchQuery);
  }, [searchQuery]);

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

  const getTopicId = (topic: JMAPTopic, subject: string, category: string) => {
    return `${subject}-${category}-${topic.name}`.replace(/\s+/g, '-').toLowerCase();
  };

  const toggleTopicSelection = (topic: JMAPTopic, subject: string, category: string) => {
    const id = getTopicId(topic, subject, category);
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addSelectedToWorksheet = () => {
    if (selectedTopics.size === 0) {
      toast({
        title: 'No topics selected',
        description: 'Please select topics by checking the boxes.',
      });
      return;
    }

    let addedCount = 0;
    const allTopics = NYS_SUBJECTS.flatMap(subject =>
      subject.categories.flatMap(category =>
        category.topics.map(topic => ({
          topic,
          subject: subject.name,
          category: category.category,
          id: getTopicId(topic, subject.name, category.category),
        }))
      )
    );

    selectedTopics.forEach(topicId => {
      const found = allTopics.find(t => t.id === topicId);
      if (found && !worksheetQuestions.some(q => q.id === topicId)) {
        setWorksheetQuestions(prev => [...prev, {
          id: topicId,
          topicName: found.topic.name,
          standard: found.topic.standard,
          jmapUrl: found.topic.url,
          subject: found.subject,
          category: found.category,
        }]);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      toast({
        title: 'Topics added',
        description: `Added ${addedCount} topic(s) to your worksheet.`,
      });
      setSelectedTopics(new Set());
    } else {
      toast({
        title: 'Already added',
        description: 'All selected topics are already in your worksheet.',
      });
    }
  };

  const addToWorksheet = (topic: JMAPTopic, subject: string, category: string) => {
    const id = getTopicId(topic, subject, category);
    
    // Check if already added
    if (worksheetQuestions.some(q => q.id === id)) {
      toast({
        title: 'Already added',
        description: 'This topic is already in your worksheet.',
      });
      return;
    }

    setWorksheetQuestions(prev => [...prev, {
      id,
      topicName: topic.name,
      standard: topic.standard,
      jmapUrl: topic.url,
      subject,
      category,
    }]);

    toast({
      title: 'Added to worksheet',
      description: `"${topic.name}" has been added.`,
    });
  };

  const removeFromWorksheet = (id: string) => {
    setWorksheetQuestions(prev => prev.filter(q => q.id !== id));
  };

  const clearWorksheet = () => {
    setWorksheetQuestions([]);
  };

  const clearAllTopics = () => {
    setSelectedTopics(new Set());
    setWorksheetQuestions([]);
    toast({
      title: 'All topics cleared',
      description: 'Selections and worksheet have been reset.',
    });
  };

  const selectAllInCategory = (category: TopicCategory, subject: string) => {
    const categoryTopicIds = category.topics.map(topic => 
      getTopicId(topic, subject, category.category)
    );
    
    const allSelected = categoryTopicIds.every(id => selectedTopics.has(id));
    
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (allSelected) {
        categoryTopicIds.forEach(id => next.delete(id));
      } else {
        categoryTopicIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const TopicItem = ({ topic, subject, category }: { topic: JMAPTopic; subject: string; category: string }) => {
    const id = getTopicId(topic, subject, category);
    const isAdded = worksheetQuestions.some(q => q.id === id);
    const isSelected = selectedTopics.has(id);

    return (
      <div 
        className={`flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group transition-colors cursor-pointer ${
          isSelected ? 'bg-primary/10 hover:bg-primary/15' : ''
        }`}
        onClick={() => toggleTopicSelection(topic, subject, category)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => toggleTopicSelection(topic, subject, category)}
            onClick={(e) => e.stopPropagation()}
            className="data-[state=checked]:bg-primary"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{topic.name}</span>
              <Badge variant="outline" className="text-xs font-mono">
                {topic.standard}
              </Badge>
              {isAdded && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Added
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={topic.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <Button
            variant={isAdded ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              addToWorksheet(topic, subject, category);
            }}
            disabled={isAdded}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const CategorySection = ({ category, subject }: { category: TopicCategory; subject: string }) => {
    const isExpanded = expandedCategories.has(category.category);
    const categoryTopicIds = category.topics.map(topic => 
      getTopicId(topic, subject, category.category)
    );
    const selectedCount = categoryTopicIds.filter(id => selectedTopics.has(id)).length;
    const allSelected = selectedCount === category.topics.length && category.topics.length > 0;
    const someSelected = selectedCount > 0 && selectedCount < category.topics.length;

    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.category)}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={allSelected}
              className={`${someSelected ? 'data-[state=unchecked]:bg-primary/30' : ''}`}
              onCheckedChange={() => selectAllInCategory(category, subject)}
              onClick={(e) => e.stopPropagation()}
            />
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-semibold text-sm">{category.category}</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Badge variant="default" className="text-xs">
                {selectedCount} selected
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {category.topics.length} topics
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 ml-4 border-l-2 border-muted pl-2">
          {category.topics.map((topic) => (
            <TopicItem
              key={topic.name}
              topic={topic}
              subject={subject}
              category={category.category}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Question Bank & Assessments</h1>
            <p className="text-muted-foreground">
              Browse NYS Regents aligned topics, create AI-generated worksheets, and download assessments
            </p>
          </div>
          <div className="flex gap-2 items-start">
            <TooltipProvider>
              {(selectedTopics.size > 0 || worksheetQuestions.length > 0) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={clearAllTopics}
                      className="h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Clear all topics</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="flex flex-col gap-1">
                <Button 
                  onClick={openDiagnosticMode}
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Quick Start Diagnostic
                  {(selectedTopics.size > 0 || worksheetQuestions.length > 0) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="ml-2 bg-white/20 text-white cursor-help">
                          {getAllTopicsArray().length}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {selectedTopics.size > 0 && `${selectedTopics.size} selected`}
                          {selectedTopics.size > 0 && worksheetQuestions.length > 0 && ' + '}
                          {worksheetQuestions.length > 0 && `${worksheetQuestions.length} in worksheet`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </Button>
                {(selectedTopics.size > 0 || worksheetQuestions.length > 0) && (
                  <span className="text-xs text-emerald-600 text-right">
                    {getAllTopicsArray().length} topic(s) will be loaded
                  </span>
                )}
              </div>
              <Button 
                onClick={openRegularMode}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Differentiated Worksheets
                {(selectedTopics.size > 0 || worksheetQuestions.length > 0) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="ml-2 bg-white/20 text-white cursor-help">
                        {getAllTopicsArray().length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {selectedTopics.size > 0 && `${selectedTopics.size} selected`}
                        {selectedTopics.size > 0 && worksheetQuestions.length > 0 && ' + '}
                        {worksheetQuestions.length > 0 && `${worksheetQuestions.length} in worksheet`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </Button>
              <Button 
                onClick={openLessonPlanGenerator}
                data-tour="create-lesson"
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Presentation className="h-4 w-4 mr-2" />
                Create Lesson Plan
                {(selectedTopics.size > 0 || worksheetQuestions.length > 0) && (
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                    {getAllTopicsArray().length}
                  </Badge>
                )}
              </Button>
            </TooltipProvider>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search topics, standards (e.g., G.CO.A.1), or categories..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Add Selected Button */}
            {selectedTopics.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <span className="text-sm font-medium">
                  {selectedTopics.size} topic(s) selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTopics(new Set())}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    size="sm"
                    onClick={addSelectedToWorksheet}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add to Worksheet
                  </Button>
                </div>
              </div>
            )}

            {/* Search Results or Topic Browser */}
            {searchQuery.trim() ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Search Results</CardTitle>
                  <CardDescription>
                    {searchResults.length} topic(s) found for "{searchQuery}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No topics match your search</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1">
                        {searchResults.map((result, index) => {
                          const id = getTopicId(result.topic, result.subject, result.category);
                          const isSelected = selectedTopics.has(id);
                          const isAdded = worksheetQuestions.some(q => q.id === id);

                          return (
                            <div 
                              key={index} 
                              className={`flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group cursor-pointer ${
                                isSelected ? 'bg-primary/10 hover:bg-primary/15' : ''
                              }`}
                              onClick={() => toggleTopicSelection(result.topic, result.subject, result.category)}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={() => toggleTopicSelection(result.topic, result.subject, result.category)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{result.topic.name}</span>
                                    <Badge variant="outline" className="text-xs font-mono">
                                      {result.topic.standard}
                                    </Badge>
                                    {isAdded && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Check className="h-3 w-3 mr-1" />
                                        Added
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {result.subject} › {result.category}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <a
                                  href={result.topic.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToWorksheet(result.topic, result.subject, result.category);
                                  }}
                                  disabled={isAdded}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Browse by Subject</CardTitle>
                  <CardDescription>
                    Select topics to build your worksheet. Use checkboxes to select multiple topics.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                      {NYS_SUBJECTS.map((subject) => {
                        const isActive = selectedSubject === subject.id;
                        const subjectColors: Record<string, { bg: string; border: string; text: string; activeBg: string }> = {
                          geometry: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', activeBg: 'bg-blue-500' },
                          algebra1: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', activeBg: 'bg-emerald-500' },
                          algebra2: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', activeBg: 'bg-purple-500' },
                          precalculus: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', activeBg: 'bg-orange-500' },
                        };
                        const colors = subjectColors[subject.id] || subjectColors.geometry;
                        
                        return (
                          <button
                            key={subject.id}
                            onClick={() => setSelectedSubject(subject.id)}
                            className={`
                              relative p-4 rounded-xl border-2 transition-all duration-200
                              flex flex-col items-center justify-center text-center gap-2 min-h-[80px]
                              ${isActive 
                                ? `${colors.activeBg} text-white border-transparent shadow-lg scale-[1.02]` 
                                : `${colors.bg} ${colors.border} ${colors.text} hover:shadow-md hover:scale-[1.01]`
                              }
                            `}
                          >
                            <span className="font-bold text-sm md:text-base">{subject.shortName}</span>
                            <span className={`text-xs ${isActive ? 'text-white/80' : 'opacity-70'}`}>
                              {subject.categories.reduce((acc, cat) => acc + cat.topics.length, 0)} topics
                            </span>
                            {isActive && (
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-inherit" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <TabsList className="hidden">
                      {NYS_SUBJECTS.map((subject) => (
                        <TabsTrigger key={subject.id} value={subject.id}>
                          {subject.shortName}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {NYS_SUBJECTS.map((subject) => (
                      <TabsContent key={subject.id} value={subject.id} className="mt-0">
                        <ScrollArea className="h-[450px] pr-4">
                          <div className="space-y-2">
                            {subject.categories.map((category) => (
                              <CategorySection
                                key={category.category}
                                category={category}
                                subject={subject.name}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">AI-Powered Worksheets</p>
                    <p className="text-sm text-muted-foreground">
                      Select topics, choose the number of questions, and click "Compile Worksheet" to generate 
                      higher-order thinking questions aligned to NYS Regents standards.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Worksheet Builder */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <WorksheetBuilder
                selectedQuestions={worksheetQuestions}
                onRemoveQuestion={removeFromWorksheet}
                onClearAll={clearWorksheet}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Differentiated Worksheet Generator Modal */}
      <DifferentiatedWorksheetGenerator
        open={showDifferentiatedGenerator}
        onOpenChange={(open) => {
          setShowDifferentiatedGenerator(open);
          if (!open) {
            setDiagnosticMode(false);
            setInitialTopicsForGenerator([]);
          }
        }}
        diagnosticMode={diagnosticMode}
        initialTopics={initialTopicsForGenerator}
      />

      {/* Lesson Plan Generator Modal */}
      <LessonPlanGenerator
        open={showLessonGenerator}
        onOpenChange={(open) => {
          setShowLessonGenerator(open);
          if (!open) {
            setSelectedLessonTopic(null);
          }
        }}
        topic={selectedLessonTopic}
        relatedTopics={getAllTopicsArray()}
      />
    </AppLayout>
  );
}
