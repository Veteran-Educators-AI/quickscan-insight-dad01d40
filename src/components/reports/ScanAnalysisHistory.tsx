import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileImage, User, Calendar, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface ScanAnalysisHistoryProps {
  classId?: string;
}

interface AttemptWithDetails {
  id: string;
  created_at: string;
  status: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
  };
  question: {
    id: string;
    prompt_text: string | null;
  };
  scores: {
    points_earned: number | null;
    notes: string | null;
  }[];
  images: {
    image_url: string;
    ocr_text: string | null;
  }[];
}

export function ScanAnalysisHistory({ classId }: ScanAnalysisHistoryProps) {
  const { user } = useAuth();
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptWithDetails | null>(null);

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['scan-analysis-history', user?.id, classId],
    queryFn: async () => {
      let query = supabase
        .from('attempts')
        .select(`
          id,
          created_at,
          status,
          student:students!inner(
            id,
            first_name,
            last_name,
            class_id
          ),
          question:questions!inner(
            id,
            prompt_text
          ),
          scores(
            points_earned,
            notes
          ),
          images:attempt_images(
            image_url,
            ocr_text
          )
        `)
        .eq('status', 'analyzed')
        .order('created_at', { ascending: false })
        .limit(50);

      // Filter by class if specified
      if (classId) {
        query = query.eq('student.class_id', classId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as AttemptWithDetails[];
    },
    enabled: !!user,
  });

  const getScoreDisplay = (attempt: AttemptWithDetails) => {
    const score = attempt.scores?.[0];
    if (!score || score.points_earned === null) return null;
    return score.points_earned;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'secondary';
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan Analysis History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!attempts || attempts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan Analysis History</CardTitle>
          <CardDescription>View results from analyzed student work scans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileImage className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No analyzed scans yet</p>
            <p className="text-sm">Scan and analyze student work to see results here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Scan Analysis History</CardTitle>
          <CardDescription>
            {attempts.length} analyzed scan{attempts.length !== 1 ? 's' : ''} from student work
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {attempts.map(attempt => {
                const score = getScoreDisplay(attempt);
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAttempt(attempt)}
                  >
                    <div className="flex items-center gap-3">
                      {attempt.images?.[0]?.image_url ? (
                        <img
                          src={attempt.images[0].image_url}
                          alt="Scanned work"
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                          <FileImage className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">
                            {attempt.student.first_name} {attempt.student.last_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(attempt.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {score !== null && (
                        <Badge variant={getScoreColor(score)}>
                          {score} pts
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAttempt} onOpenChange={() => setSelectedAttempt(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analysis Details</DialogTitle>
          </DialogHeader>
          {selectedAttempt && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {selectedAttempt.student.first_name} {selectedAttempt.student.last_name}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedAttempt.created_at), 'MMMM d, yyyy h:mm a')}
                </span>
              </div>

              {selectedAttempt.question.prompt_text && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-1">Question</p>
                  <p className="text-sm">{selectedAttempt.question.prompt_text}</p>
                </div>
              )}

              {selectedAttempt.images?.[0]?.image_url && (
                <div>
                  <p className="text-sm font-medium mb-2">Scanned Work</p>
                  <img
                    src={selectedAttempt.images[0].image_url}
                    alt="Scanned student work"
                    className="w-full rounded-lg border"
                  />
                </div>
              )}

              {selectedAttempt.scores?.[0] && (
                <div className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Score</p>
                    <Badge variant={getScoreColor(selectedAttempt.scores[0].points_earned)}>
                      {selectedAttempt.scores[0].points_earned} points
                    </Badge>
                  </div>
                  {selectedAttempt.scores[0].notes && (
                    <p className="text-sm text-muted-foreground">
                      {selectedAttempt.scores[0].notes}
                    </p>
                  )}
                </div>
              )}

              {selectedAttempt.images?.[0]?.ocr_text && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-1">Extracted Text (OCR)</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedAttempt.images[0].ocr_text}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
