import { useState, useEffect } from 'react';
import { Check, ChevronDown, FileQuestion, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  jmap_id: string | null;
  prompt_text: string | null;
}

interface MultiQuestionSelectorProps {
  selectedQuestionIds: string[];
  onQuestionsChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function MultiQuestionSelector({ 
  selectedQuestionIds, 
  onQuestionsChange, 
  disabled 
}: MultiQuestionSelectorProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user) return;
      
      setIsLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('id, jmap_id, prompt_text')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setQuestions(data);
      }
      setIsLoading(false);
    };

    fetchQuestions();
  }, [user]);

  const toggleQuestion = (questionId: string) => {
    if (selectedQuestionIds.includes(questionId)) {
      onQuestionsChange(selectedQuestionIds.filter(id => id !== questionId));
    } else {
      onQuestionsChange([...selectedQuestionIds, questionId]);
    }
  };

  const removeQuestion = (questionId: string) => {
    onQuestionsChange(selectedQuestionIds.filter(id => id !== questionId));
  };

  const getQuestionLabel = (question: Question) => {
    if (question.jmap_id) return question.jmap_id;
    if (question.prompt_text) return question.prompt_text.slice(0, 40) + (question.prompt_text.length > 40 ? '...' : '');
    return 'Question';
  };

  const selectedQuestions = questions.filter(q => selectedQuestionIds.includes(q.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between text-left font-normal"
            disabled={disabled || isLoading}
          >
            <div className="flex items-center gap-2 truncate">
              <FileQuestion className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className={cn(
                "truncate",
                selectedQuestionIds.length === 0 && "text-muted-foreground italic"
              )}>
                {isLoading 
                  ? 'Loading questions...'
                  : selectedQuestionIds.length === 0 
                    ? 'Select questions to analyze...'
                    : `${selectedQuestionIds.length} question(s) selected`
                }
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search questions..." />
            <CommandList>
              <CommandEmpty>No questions found.</CommandEmpty>
              <CommandGroup>
                {questions.map((question) => (
                  <CommandItem
                    key={question.id}
                    value={getQuestionLabel(question)}
                    onSelect={() => toggleQuestion(question.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedQuestionIds.includes(question.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{getQuestionLabel(question)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedQuestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedQuestions.map((question) => (
            <Badge 
              key={question.id} 
              variant="secondary" 
              className="gap-1 pr-1"
            >
              <span className="truncate max-w-[120px]">{getQuestionLabel(question)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  removeQuestion(question.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
