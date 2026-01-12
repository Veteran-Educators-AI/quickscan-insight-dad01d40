import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileQuestion, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface Question {
  id: string;
  jmap_id: string | null;
  prompt_text: string | null;
}

interface ScanQuestionSelectorProps {
  selectedQuestionId: string | null;
  onQuestionChange: (questionId: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ScanQuestionSelector({
  selectedQuestionId,
  onQuestionChange,
  disabled = false,
  compact = false,
}: ScanQuestionSelectorProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchQuestions() {
      if (!user) return;

      setIsLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('id, jmap_id, prompt_text')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching questions:', error);
      } else {
        setQuestions(data || []);
      }
      setIsLoading(false);
    }

    fetchQuestions();
  }, [user]);

  const getQuestionLabel = (question: Question) => {
    if (question.jmap_id) {
      return question.jmap_id;
    }
    if (question.prompt_text) {
      return question.prompt_text.substring(0, 50) + (question.prompt_text.length > 50 ? '...' : '');
    }
    return `Question ${question.id.substring(0, 8)}`;
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading questions...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={`space-y-2 ${compact ? 'text-xs' : ''}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileQuestion className="h-4 w-4" />
          <span>No questions in library</span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/questions/new">
            <Plus className="h-4 w-4 mr-1" />
            Create Question
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!compact && (
        <Label className="text-sm font-medium flex items-center gap-2">
          <FileQuestion className="h-4 w-4" />
          Associate with Question
        </Label>
      )}
      <Select
        value={selectedQuestionId || ''}
        onValueChange={(value) => onQuestionChange(value || null)}
        disabled={disabled}
      >
        <SelectTrigger className={compact ? 'h-8 text-xs' : ''}>
          <SelectValue placeholder="Select a question..." />
        </SelectTrigger>
        <SelectContent>
          {questions.map((question) => (
            <SelectItem key={question.id} value={question.id}>
              <span className="truncate max-w-[250px]">
                {getQuestionLabel(question)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!compact && !selectedQuestionId && (
        <p className="text-xs text-muted-foreground">
          Select a question to save analytics to student records
        </p>
      )}
    </div>
  );
}
