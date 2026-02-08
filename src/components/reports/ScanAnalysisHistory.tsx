import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useStudentNames } from '@/lib/StudentNameContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StudentWorkDetailDialog } from '@/components/scan/StudentWorkDetailDialog';
import { GradeRecalculationDialog } from './GradeRecalculationDialog';
import { MissingSubmissionsAlert } from '@/components/scan/MissingSubmissionsAlert';
import { FileImage, User, Calendar, ChevronRight, Eye, Calculator } from 'lucide-react';
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
    rubric?: {
      description: string;
      points: number;
    } | null;
  }[];
  images: {
    image_url: string;
    ocr_text: string | null;
  }[];
}

export function ScanAnalysisHistory({ classId }: ScanAnalysisHistoryProps) {
  const { user } = useAuth();
  const { getDisplayName } = useStudentNames();
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptWithDetails | null>(null);
  const [showRecalcDialog, setShowRecalcDialog] = useState(false);

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
            notes,
            rubric:rubrics(
              description,
              points
            )
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

  // Transform attempt data into AnalysisResult format for the dialog
  const transformToAnalysisResult = (attempt: AttemptWithDetails) => {
    const totalEarned = attempt.scores?.reduce((sum, s) => sum + (s.points_earned || 0), 0) || 0;
    const totalPossible = attempt.scores?.reduce((sum, s) => sum + (s.rubric?.points || 1), 0) || 1;
    const percentage = Math.round((totalEarned / totalPossible) * 100);

    return {
      ocrText: attempt.images?.[0]?.ocr_text || '',
      problemIdentified: attempt.question?.prompt_text || 'Unknown problem',
      approachAnalysis: '',
      rubricScores: attempt.scores?.map(s => ({
        criterion: s.rubric?.description || 'Criterion',
        score: s.points_earned || 0,
        maxScore: s.rubric?.points || 1,
        feedback: s.notes || '',
      })) || [],
      misconceptions: [],
      totalScore: {
        earned: totalEarned,
        possible: totalPossible,
        percentage,
      },
      feedback: attempt.scores?.[0]?.notes || '',
    };
  };

  // IMPORTANT: All hooks must be called BEFORE any early returns (React Rules of Hooks).
  // These useMemo calls were previously after the loading/empty returns which caused
  // "Cannot access 'Gt' before initialization" crashes when navigating back.
  const analyzedStudentIds = useMemo(() => {
    return [...new Set(attempts?.map(a => a.student.id) || [])];
  }, [attempts]);

  const analyzedStudentNames = useMemo(() => {
    return [...new Set(attempts?.map(a => getDisplayName(a.student.id, a.student.first_name, a.student.last_name)) || [])];
  }, [attempts, getDisplayName]);

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
      {/* Missing Submissions Alert */}
      {classId && attempts && attempts.length > 0 && (
        <MissingSubmissionsAlert
          classId={classId}
          analyzedStudentIds={analyzedStudentIds}
          analyzedStudentNames={analyzedStudentNames}
          assignmentName="recent scans"
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Scan Analysis History
                <Badge variant="outline" className="ml-2 text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Click to zoom in
                </Badge>
              </CardTitle>
              <CardDescription>
                {attempts.length} analyzed scan{attempts.length !== 1 ? 's' : ''} from student work
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowRecalcDialog(true)}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Recalculate Grades
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {attempts.map(attempt => {
                const score = getScoreDisplay(attempt);
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedAttempt(attempt)}
                  >
                    <div className="flex items-center gap-3">
                      {attempt.images?.[0]?.image_url ? (
                        <div className="relative">
                          <img
                            src={attempt.images[0].image_url}
                            alt="Scanned work"
                            className="h-12 w-12 rounded object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                          <FileImage className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">
                            {getDisplayName(attempt.student.id, attempt.student.first_name, attempt.student.last_name)}
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
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Student Work Detail Dialog */}
      {/* Grade Recalculation Dialog */}
      <GradeRecalculationDialog
        open={showRecalcDialog}
        onOpenChange={setShowRecalcDialog}
        classId={classId}
      />

      {selectedAttempt && (
        <StudentWorkDetailDialog
          open={!!selectedAttempt}
          onOpenChange={(open) => !open && setSelectedAttempt(null)}
          studentName={getDisplayName(selectedAttempt.student.id, selectedAttempt.student.first_name, selectedAttempt.student.last_name)}
          imageUrl={selectedAttempt.images?.[0]?.image_url}
          result={transformToAnalysisResult(selectedAttempt)}
        />
      )}
    </>
  );
}
