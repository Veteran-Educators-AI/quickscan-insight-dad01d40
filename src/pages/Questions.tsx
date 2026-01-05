import { useState, useMemo } from 'react';
import { Search, BookOpen, ExternalLink, Plus, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NYS_SUBJECTS, searchTopics, type JMAPTopic, type TopicCategory } from '@/data/nysTopics';
import { WorksheetBuilder, type WorksheetQuestion } from '@/components/questions/WorksheetBuilder';
import { useToast } from '@/hooks/use-toast';

export default function Questions() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('geometry');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [worksheetQuestions, setWorksheetQuestions] = useState<WorksheetQuestion[]>([]);

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

  const addToWorksheet = (topic: JMAPTopic, subject: string, category: string) => {
    const id = `${subject}-${category}-${topic.name}`.replace(/\s+/g, '-').toLowerCase();
    
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

  const TopicItem = ({ topic, subject, category }: { topic: JMAPTopic; subject: string; category: string }) => {
    const id = `${subject}-${category}-${topic.name}`.replace(/\s+/g, '-').toLowerCase();
    const isAdded = worksheetQuestions.some(q => q.id === id);

    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{topic.name}</span>
            <Badge variant="outline" className="text-xs font-mono">
              {topic.standard}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={topic.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <Button
            variant={isAdded ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => addToWorksheet(topic, subject, category)}
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

    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.category)}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-semibold text-sm">{category.category}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {category.topics.length} topics
          </Badge>
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
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Question Bank</h1>
          <p className="text-muted-foreground">
            Browse NYS Regents aligned topics and create downloadable worksheets
          </p>
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
                        {searchResults.map((result, index) => (
                          <div key={index} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{result.topic.name}</span>
                                <Badge variant="outline" className="text-xs font-mono">
                                  {result.topic.standard}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {result.subject} › {result.category}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <a
                                href={result.topic.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => addToWorksheet(result.topic, result.subject, result.category)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
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
                    Select a subject to explore NYS Regents aligned topics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
                    <TabsList className="grid w-full grid-cols-4 mb-4">
                      {NYS_SUBJECTS.map((subject) => (
                        <TabsTrigger key={subject.id} value={subject.id} className="text-xs sm:text-sm">
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
                    <p className="font-medium text-sm">JMAP Resources</p>
                    <p className="text-sm text-muted-foreground">
                      Click the external link icon on any topic to access free practice problems, 
                      answer keys, and instructional resources from JMAP.org aligned to NYS Regents exams.
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
    </AppLayout>
  );
}
