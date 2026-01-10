import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  FileText,
  User,
  Calendar,
  Loader2,
  MessageCircle,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/nycalysis-logo.png';
import { getStudentPseudonym } from '@/lib/studentPseudonyms';

interface AttemptData {
  id: string;
  status: string;
  created_at: string;
  studentId: string;
  question: {
    prompt_text: string | null;
    jmap_id: string | null;
  };
  scores: {
    points_earned: number | null;
    notes: string | null;
    rubric: {
      description: string;
      points: number;
    } | null;
  }[];
  images: {
    image_url: string;
    ocr_text: string | null;
  }[];
}

interface Comment {
  id: string;
  content: string;
  author_type: 'student' | 'teacher';
  author_name: string | null;
  created_at: string;
}

export default function StudentResults() {
  const { studentId, questionId } = useParams<{ studentId: string; questionId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const studentPseudonym = studentId ? getStudentPseudonym(studentId) : 'Student';

  // Fetch results and comments
  useEffect(() => {
    async function fetchResults() {
      if (!studentId || !questionId) {
        setError('Invalid link - missing student or question information');
        setLoading(false);
        return;
      }

      try {
        // Fetch the attempt with related data
        const { data, error: fetchError } = await supabase
          .from('attempts')
          .select(`
            id,
            status,
            created_at,
            student_id,
            questions!inner (prompt_text, jmap_id),
            scores (points_earned, notes, rubrics (description, points)),
            attempt_images (image_url, ocr_text)
          `)
          .eq('student_id', studentId)
          .eq('question_id', questionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('No graded work found for this worksheet yet. Please check back later.');
          } else {
            throw fetchError;
          }
        } else if (data) {
          // Transform the data
          const transformedData: AttemptData = {
            id: data.id,
            status: data.status,
            created_at: data.created_at,
            studentId: data.student_id,
            question: data.questions as unknown as { prompt_text: string | null; jmap_id: string | null },
            scores: (data.scores || []).map((s: any) => ({
              points_earned: s.points_earned,
              notes: s.notes,
              rubric: s.rubrics,
            })),
            images: data.attempt_images || [],
          };
          setAttempt(transformedData);
          
          // Fetch comments for this attempt
          const { data: commentsData } = await supabase
            .from('result_comments')
            .select('*')
            .eq('attempt_id', data.id)
            .order('created_at', { ascending: true });
          
          if (commentsData) {
            setComments(commentsData as Comment[]);
          }
        }
      } catch (err: any) {
        console.error('Error fetching results:', err);
        setError('Unable to load your results. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [studentId, questionId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !attempt) return;
    
    if (newComment.trim().length > 1000) {
      toast.error('Comment is too long (max 1000 characters)');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('result_comments')
        .insert({
          attempt_id: attempt.id,
          content: newComment.trim(),
          author_type: 'student',
          author_name: studentPseudonym,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setComments(prev => [...prev, data as Comment]);
      setNewComment('');
      toast.success('Question submitted! Your teacher will respond soon.');
    } catch (err) {
      console.error('Error submitting comment:', err);
      toast.error('Failed to submit your question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotalScore = () => {
    if (!attempt || attempt.scores.length === 0) return { earned: 0, possible: 0, percentage: 0 };
    
    const earned = attempt.scores.reduce((sum, s) => sum + (s.points_earned || 0), 0);
    const possible = attempt.scores.reduce((sum, s) => sum + (s.rubric?.points || 0), 0);
    const percentage = possible > 0 ? Math.round((earned / possible) * 100) : 0;
    
    return { earned, possible, percentage };
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 90) return { label: 'Excellent', variant: 'default' as const };
    if (percentage >= 80) return { label: 'Good', variant: 'secondary' as const };
    if (percentage >= 70) return { label: 'Satisfactory', variant: 'secondary' as const };
    if (percentage >= 60) return { label: 'Needs Work', variant: 'outline' as const };
    return { label: 'Keep Practicing', variant: 'destructive' as const };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <img src={logo} alt="NYCalysis AI" className="h-8 w-8" />
            <h1 className="text-xl font-bold">NYCalysis AI Results</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
              <h2 className="text-lg font-semibold">Results Not Available</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  const totalScore = calculateTotalScore();
  const scoreBadge = getScoreBadge(totalScore.percentage);
  const hasScores = attempt.scores.length > 0 && totalScore.possible > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logo} alt="NYCalysis AI" className="h-8 w-8" />
          <h1 className="text-xl font-bold">Your Results</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Student Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">
                  {studentPseudonym}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(attempt.created_at).toLocaleDateString()}
                  </span>
                  {attempt.question.jmap_id && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Question {attempt.question.jmap_id}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant={attempt.status === 'analyzed' || attempt.status === 'reviewed' ? 'default' : 'secondary'}>
                {attempt.status === 'analyzed' ? 'Graded' : attempt.status === 'reviewed' ? 'Reviewed' : 'Pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Score Summary */}
        {hasScores ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Your Score</span>
                <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Total Score</span>
                    <span className={`font-bold ${getScoreColor(totalScore.percentage)}`}>
                      {totalScore.earned} / {totalScore.possible}
                    </span>
                  </div>
                  <Progress value={totalScore.percentage} className="h-3" />
                </div>
                <div className={`text-3xl font-bold ${getScoreColor(totalScore.percentage)}`}>
                  {totalScore.percentage}%
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Your work is being graded. Check back soon!</p>
            </CardContent>
          </Card>
        )}

        {/* Rubric Breakdown */}
        {attempt.scores.length > 0 && attempt.scores.some(s => s.rubric) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {attempt.scores.filter(s => s.rubric).map((score, i) => (
                <div key={i} className="flex items-start gap-3">
                  {score.points_earned !== null && score.rubric && score.points_earned >= score.rubric.points ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  ) : score.points_earned !== null && score.points_earned > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm">{score.rubric?.description}</p>
                      <span className="text-sm font-medium whitespace-nowrap">
                        {score.points_earned ?? 0}/{score.rubric?.points ?? 0}
                      </span>
                    </div>
                    {score.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{score.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Feedback Notes */}
        {attempt.scores.some(s => s.notes) && (
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                Teacher Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {attempt.scores
                  .filter(s => s.notes)
                  .map((score, i) => (
                    <li key={i} className="text-sm">
                      {score.notes}
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Question Info */}
        {attempt.question.prompt_text && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{attempt.question.prompt_text}</p>
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Questions & Comments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Comments */}
            {comments.length > 0 && (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div 
                    key={comment.id} 
                    className={`p-3 rounded-lg ${
                      comment.author_type === 'teacher' 
                        ? 'bg-primary/10 border border-primary/20 ml-4' 
                        : 'bg-muted mr-4'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={comment.author_type === 'teacher' ? 'default' : 'secondary'} className="text-xs">
                        {comment.author_type === 'teacher' ? 'Teacher' : comment.author_name || 'You'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}

            {comments.length > 0 && <Separator />}

            {/* New Comment Form */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Have a question about your grade or need help understanding something? Ask your teacher here!
              </p>

              <div className="space-y-2">
                <Label htmlFor="comment" className="text-sm">Your Question or Comment</Label>
                <Textarea
                  id="comment"
                  placeholder="Type your question here..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value.slice(0, 1000))}
                  rows={3}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {newComment.length}/1000
                </p>
              </div>

              <Button 
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Question
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>Powered by NYCalysis AI</p>
          <p className="mt-1">Keep up the great work! 📚</p>
        </div>
      </main>
    </div>
  );
}
