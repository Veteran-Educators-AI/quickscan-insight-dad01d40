import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, User, FileText, Target } from "lucide-react";

interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

interface SaveAnalyticsConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  studentName?: string;
  totalScore?: { earned: number; possible: number; percentage: number };
  rubricScores?: RubricScore[];
  questionCount?: number;
  isSaving?: boolean;
}

export function SaveAnalyticsConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  studentName,
  totalScore,
  rubricScores,
  questionCount = 1,
  isSaving,
}: SaveAnalyticsConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Confirm Save Analytics
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-muted-foreground">
                The following data will be saved to the student's record:
              </p>
              
              <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                {/* Student */}
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Student:</span>
                  <span className="text-sm">{studentName || 'Unknown'}</span>
                </div>
                
                {/* Questions */}
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Questions:</span>
                  <span className="text-sm">{questionCount} question{questionCount > 1 ? 's' : ''}</span>
                </div>
                
                {/* Score */}
                {totalScore && (
                  <div className="flex items-center gap-3">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Score:</span>
                    <span className="text-sm">
                      {totalScore.earned}/{totalScore.possible} ({totalScore.percentage}%)
                    </span>
                  </div>
                )}
                
                {/* Rubric breakdown */}
                {rubricScores && rubricScores.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Rubric Scores:</p>
                    <div className="space-y-1">
                      {rubricScores.slice(0, 4).map((score, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="truncate max-w-[200px]">{score.criterion}</span>
                          <span className="font-medium">{score.score}/{score.maxScore}</span>
                        </div>
                      ))}
                      {rubricScores.length > 4 && (
                        <p className="text-xs text-muted-foreground">
                          +{rubricScores.length - 4} more criteria
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Analytics'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
