import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Tag, ExternalLink, ChevronRight, Search, Mail, CheckSquare, Square, Bot, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EmailQuestionDialog } from '@/components/questions/EmailQuestionDialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Question {
  id: string;
  jmap_url: string | null;
  jmap_id: string | null;
  prompt_text: string | null;
  prompt_image_url: string | null;
  difficulty: number;
  created_at: string;
  assessment_mode?: string;
  topics: { id: string; name: string }[];
}

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const isSelectionMode = selectedIds.size > 0;

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          question_topics (
            topic_id,
            topics (id, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(q => ({
        ...q,
        topics: q.question_topics?.map((qt: any) => qt.topics).filter(Boolean) || [],
      }));

      setQuestions(formatted);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load questions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredQuestions = questions.filter(q => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.jmap_id?.toLowerCase().includes(query) ||
      q.prompt_text?.toLowerCase().includes(query) ||
      q.topics.some(t => t.name.toLowerCase().includes(query))
    );
  });

  const getDifficultyLabel = (d: number) => {
    const labels = ['Easy', 'Medium', 'Hard', 'Challenge', 'Expert'];
    return labels[d - 1] || 'Medium';
  };

  const getDifficultyColor = (d: number) => {
    const colors = ['bg-success/10 text-success', 'bg-primary/10 text-primary', 'bg-warning/10 text-warning', 'bg-destructive/10 text-destructive', 'bg-foreground/10 text-foreground'];
    return colors[d - 1] || colors[1];
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const bulkUpdateAssessmentMode = async (mode: 'teacher' | 'ai') => {
    if (selectedIds.size === 0) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({ assessment_mode: mode })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      // Update local state
      setQuestions(prev => prev.map(q => 
        selectedIds.has(q.id) ? { ...q, assessment_mode: mode } : q
      ));

      toast({
        title: 'Questions updated',
        description: `${selectedIds.size} question(s) set to ${mode === 'ai' ? 'AI-Assessed' : 'Teacher-Uploaded'} mode.`,
      });

      clearSelection();
    } catch (error) {
      console.error('Error updating questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update questions',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Question Bank</h1>
            <p className="text-muted-foreground">JMAP Geometry questions with rubrics</p>
          </div>
          <Link to="/questions/new">
            <Button variant="hero">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </Link>
        </div>

        {/* Search and Bulk Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, content, or topic..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Bulk Actions Bar */}
          {filteredQuestions.length > 0 && (
            <div className="flex items-center gap-2">
              {isSelectionMode ? (
                <>
                  <Badge variant="secondary" className="px-3 py-1">
                    {selectedIds.size} selected
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isUpdating}>
                        {isUpdating ? 'Updating...' : 'Change Grading Mode'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => bulkUpdateAssessmentMode('ai')}>
                        <Bot className="h-4 w-4 mr-2 text-primary" />
                        AI-Assessed Solution
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => bulkUpdateAssessmentMode('teacher')}>
                        <User className="h-4 w-4 mr-2" />
                        Teacher-Uploaded Solution
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={selectAll}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select All
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-2/3 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium text-lg mb-2">
                {searchQuery ? 'No matching questions' : 'No questions yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add JMAP questions to build your assessment bank'}
              </p>
              {!searchQuery && (
                <Link to="/questions/new">
                  <Button variant="hero">
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <div key={question.id} className="relative">
                <Link to={isSelectionMode ? '#' : `/questions/${question.id}`} onClick={isSelectionMode ? (e) => toggleSelection(question.id, e) : undefined}>
                  <Card className={`hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${selectedIds.has(question.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox */}
                        <div 
                          className="flex-shrink-0 pt-1"
                          onClick={(e) => toggleSelection(question.id, e)}
                        >
                          <Checkbox 
                            checked={selectedIds.has(question.id)}
                            className="h-5 w-5"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            {question.jmap_id && (
                              <span className="text-primary font-mono">{question.jmap_id}</span>
                            )}
                            {question.jmap_url && (
                              <a
                                href={question.jmap_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {/* Assessment Mode Badge */}
                            {question.assessment_mode === 'ai' ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                <Bot className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted text-muted-foreground">
                                <User className="h-3 w-3 mr-1" />
                                Teacher
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {question.prompt_text || 'No description'}
                          </CardDescription>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 pl-8">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                            {getDifficultyLabel(question.difficulty)}
                          </Badge>
                          {question.topics.slice(0, 3).map((topic) => (
                            <Badge key={topic.id} variant="secondary">
                              <Tag className="h-3 w-3 mr-1" />
                              {topic.name}
                            </Badge>
                          ))}
                          {question.topics.length > 3 && (
                            <Badge variant="secondary">+{question.topics.length - 3}</Badge>
                          )}
                        </div>
                        <div onClick={(e) => e.preventDefault()}>
                          <EmailQuestionDialog
                            questionId={question.id}
                            questionTitle={question.jmap_id || question.prompt_text?.slice(0, 30)}
                            trigger={
                              <Button variant="ghost" size="sm" className="h-8">
                                <Mail className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
