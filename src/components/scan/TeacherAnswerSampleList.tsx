import { useState, useEffect } from 'react';
import { Trash2, Eye, BookOpen, Calendar, Target, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TeacherAnswerSample {
  id: string;
  topic_name: string;
  nys_standard: string | null;
  question_context: string | null;
  image_url: string;
  ocr_text: string | null;
  key_steps: string[] | null;
  grading_emphasis: string | null;
  notes: string | null;
  created_at: string;
}

interface TeacherAnswerSampleListProps {
  refreshTrigger?: number;
}

export function TeacherAnswerSampleList({ refreshTrigger }: TeacherAnswerSampleListProps) {
  const [samples, setSamples] = useState<TeacherAnswerSample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSamples = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('teacher_answer_samples')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSamples(data || []);
    } catch (error) {
      console.error('Error fetching samples:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('teacher_answer_samples')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSamples(prev => prev.filter(s => s.id !== id));
      toast.success('Answer sample deleted');
    } catch (error) {
      console.error('Error deleting sample:', error);
      toast.error('Failed to delete sample');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (samples.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No answer samples yet. Upload your first solution above to start training the AI!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group samples by topic
  const samplesByTopic = samples.reduce((acc, sample) => {
    const topic = sample.topic_name;
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(sample);
    return acc;
  }, {} as Record<string, TeacherAnswerSample[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Your Answer Samples ({samples.length})
        </CardTitle>
        <CardDescription>
          The AI uses these to understand your grading style for each topic
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-96">
          <div className="space-y-4">
            {Object.entries(samplesByTopic).map(([topic, topicSamples]) => (
              <div key={topic} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{topic}</span>
                  <Badge variant="secondary" className="text-xs">
                    {topicSamples.length} sample{topicSamples.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="divide-y border rounded-lg">
                  {topicSamples.map((sample) => (
                    <div 
                      key={sample.id} 
                      className="flex items-center justify-between p-3 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img 
                          src={sample.image_url} 
                          alt="Sample" 
                          className="w-12 h-12 object-cover rounded border"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {sample.nys_standard && (
                              <span className="text-xs font-mono text-primary">
                                {sample.nys_standard}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {sample.question_context || sample.grading_emphasis || 'No description'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(sample.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{sample.topic_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <img 
                                src={sample.image_url} 
                                alt="Full sample" 
                                className="w-full rounded-lg border"
                              />
                              {sample.grading_emphasis && (
                                <div>
                                  <p className="text-sm font-medium">Grading Focus:</p>
                                  <p className="text-sm text-muted-foreground">{sample.grading_emphasis}</p>
                                </div>
                              )}
                              {sample.ocr_text && (
                                <div>
                                  <p className="text-sm font-medium">Extracted Text:</p>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sample.ocr_text}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              disabled={deletingId === sample.id}
                            >
                              {deletingId === sample.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Answer Sample?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove this sample from AI training. The AI will no longer reference your approach for this topic.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(sample.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}