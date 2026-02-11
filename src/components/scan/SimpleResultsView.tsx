import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, AlertTriangle, FileText, BookOpen, Target, MessageSquare } from 'lucide-react';

/**
 * SimpleResultsView — a crash-proof fallback for displaying analysis results.
 *
 * ZERO imports from any other file in the scan/ directory.
 * Only depends on @/components/ui/*, lucide-react, and React.
 *
 * Used by ScanResultsErrorBoundary when the fancy display components crash.
 */

interface RubricScore {
  criterion?: string;
  score?: number;
  maxScore?: number;
  feedback?: string;
}

interface TotalScore {
  earned?: number;
  possible?: number;
  percentage?: number;
}

export interface SimpleResult {
  grade?: number;
  overriddenGrade?: number;
  gradeJustification?: string;
  feedback?: string;
  ocrText?: string;
  problemIdentified?: string;
  approachAnalysis?: string;
  strengthsAnalysis?: string[] | string;
  areasForImprovement?: string[] | string;
  whatStudentDidCorrectly?: string;
  whatStudentGotWrong?: string;
  misconceptions?: string[];
  rubricScores?: RubricScore[];
  totalScore?: TotalScore;
  regentsScore?: number;
  regentsScoreJustification?: string;
  conceptsDemonstrated?: string[];
  studentWorkPresent?: boolean;
}

interface SimpleResultsViewProps {
  result: SimpleResult;
  studentName?: string;
}

function toArray(val: string[] | string | undefined | null): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

export function SimpleResultsView({ result, studentName }: SimpleResultsViewProps) {
  const grade = result.overriddenGrade ?? result.grade ?? result.totalScore?.percentage ?? 0;
  const gradeVariant = grade >= 80 ? 'default' : grade >= 60 ? 'secondary' : 'destructive';

  const strengths = toArray(result.strengthsAnalysis);
  const improvements = toArray(result.areasForImprovement);
  const misconceptions = result.misconceptions ?? [];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Grade header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={gradeVariant} className="text-2xl px-4 py-2 font-bold">
                {grade}%
              </Badge>
              {studentName && (
                <span className="text-lg font-medium text-foreground">{studentName}</span>
              )}
            </div>
            {result.regentsScore !== undefined && result.regentsScore !== null && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                Regents: {result.regentsScore}/4
              </Badge>
            )}
          </div>
          {result.studentWorkPresent === false && (
            <div className="mt-2 flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">No student work detected</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Justification */}
      {result.gradeJustification && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              Grade Justification
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm whitespace-pre-wrap">{result.gradeJustification}</p>
          </CardContent>
        </Card>
      )}

      {/* What student did correctly */}
      {result.whatStudentDidCorrectly && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              What the Student Did Correctly
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm whitespace-pre-wrap">{result.whatStudentDidCorrectly}</p>
          </CardContent>
        </Card>
      )}

      {/* What needs improvement */}
      {result.whatStudentGotWrong && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              What Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm whitespace-pre-wrap">{result.whatStudentGotWrong}</p>
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-disc list-inside space-y-1">
              {strengths.map((s, i) => (
                <li key={i} className="text-sm">{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Areas for Improvement */}
      {improvements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-disc list-inside space-y-1">
              {improvements.map((s, i) => (
                <li key={i} className="text-sm">{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Misconceptions */}
      {misconceptions.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Misconceptions Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-disc list-inside space-y-1">
              {misconceptions.map((m, i) => (
                <li key={i} className="text-sm">{m}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Rubric Scores */}
      {result.rubricScores && result.rubricScores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              Rubric Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {result.rubricScores.map((rs, i) => (
              <div key={i} className="flex items-start justify-between gap-2 py-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{rs.criterion || `Step ${i + 1}`}</p>
                  {rs.feedback && <p className="text-xs text-muted-foreground">{rs.feedback}</p>}
                </div>
                <Badge variant={rs.score === rs.maxScore ? 'default' : rs.score === 0 ? 'destructive' : 'secondary'} className="shrink-0">
                  {rs.score ?? 0}/{rs.maxScore ?? 1}
                </Badge>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <Badge variant="outline" className="text-sm">
                {result.totalScore?.earned ?? 0}/{result.totalScore?.possible ?? 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      {result.feedback && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm whitespace-pre-wrap">{result.feedback}</p>
          </CardContent>
        </Card>
      )}

      {/* Approach Analysis */}
      {result.approachAnalysis && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              Approach Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm whitespace-pre-wrap">{result.approachAnalysis}</p>
          </CardContent>
        </Card>
      )}

      {/* Regents Justification */}
      {result.regentsScoreJustification && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Regents Score Justification</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm whitespace-pre-wrap">{result.regentsScoreJustification}</p>
          </CardContent>
        </Card>
      )}

      {/* OCR Text (collapsed by default) */}
      {result.ocrText && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            Show raw OCR text
          </summary>
          <Card className="mt-2">
            <CardContent className="p-3">
              <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground max-h-40 overflow-y-auto">
                {result.ocrText}
              </pre>
            </CardContent>
          </Card>
        </details>
      )}
    </div>
  );
}

export default SimpleResultsView;
