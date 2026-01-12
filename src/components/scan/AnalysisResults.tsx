import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Lightbulb, Save, UserPlus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AIWorkDetector } from './AIWorkDetector';
import { GradeOverrideDialog } from './GradeOverrideDialog';
import { RemediationActions } from './RemediationActions';

interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface AnalysisResult {
  ocrText: string;
  problemIdentified: string;
  approachAnalysis: string;
  rubricScores: RubricScore[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  grade?: number;
  gradeJustification?: string;
  feedback: string;
}

interface RemediationQuestion {
  questionNumber: number;
  question: string;
  targetMisconception: string;
  difficulty: 'scaffolded' | 'practice' | 'challenge';
  hint: string;
}

interface AnalysisResultsProps {
  result: AnalysisResult;
  rawAnalysis?: string | null;
  onSaveAnalytics?: () => void;
  onAssociateStudent?: () => void;
  onGradeOverride?: (grade: number, justification: string) => void;
  onPushRemediationToApp?: (questions: RemediationQuestion[]) => void;
  onGenerateRemediationWorksheet?: (questions: RemediationQuestion[]) => void;
  isSaving?: boolean;
  studentName?: string | null;
  studentId?: string | null;
  classId?: string | null;
  topicName?: string | null;
}

export function AnalysisResults({ 
  result, 
  rawAnalysis, 
  onSaveAnalytics, 
  onAssociateStudent,
  onGradeOverride,
  onPushRemediationToApp,
  onGenerateRemediationWorksheet,
  isSaving = false,
  studentName = null,
  studentId = null,
  classId = null,
  topicName = null,
}: AnalysisResultsProps) {
  const [overriddenGrade, setOverriddenGrade] = useState<{ grade: number; justification: string } | null>(null);
  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getGradeBadge = (grade: number) => {
    if (grade >= 90) return { label: 'Exceeds Standards', variant: 'default' as const };
    if (grade >= 80) return { label: 'Meets Standards', variant: 'secondary' as const };
    if (grade >= 70) return { label: 'Approaching Standards', variant: 'outline' as const };
    return { label: 'Below Standards', variant: 'destructive' as const };
  };

  const handleGradeOverride = (newGrade: number, newJustification: string) => {
    setOverriddenGrade({ grade: newGrade, justification: newJustification });
    onGradeOverride?.(newGrade, newJustification);
  };

  // Calculate grade with minimum 55, but only 55 if no points earned
  const hasAnyPoints = result.totalScore.earned > 0;
  const baseGrade = hasAnyPoints ? 60 : 55;
  const calculatedGrade = hasAnyPoints 
    ? Math.round(baseGrade + (result.totalScore.percentage / 100) * (100 - baseGrade))
    : 55;
  const aiGrade = result.grade ?? calculatedGrade;
  const grade = overriddenGrade?.grade ?? aiGrade;
  const gradeJustification = overriddenGrade?.justification ?? result.gradeJustification;
  const isOverridden = overriddenGrade !== null;
  const gradeBadge = getGradeBadge(grade);

  return (
    <div className="space-y-4">
      {/* Grade Summary */}
      <Card className={isOverridden ? 'border-primary' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <span>Analysis Results</span>
              {isOverridden && (
                <Badge variant="outline" className="text-xs">Teacher Override</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={gradeBadge.variant}>{gradeBadge.label}</Badge>
              <GradeOverrideDialog
                currentGrade={grade}
                currentJustification={gradeJustification}
                onOverride={handleGradeOverride}
                disabled={isSaving}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grade Display */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-muted-foreground">Grade (55-100 scale)</span>
                <span className={`font-bold ${getGradeColor(grade)}`}>
                  {grade}
                </span>
              </div>
              <Progress value={(grade - 55) / 45 * 100} className="h-3" />
            </div>
            <div className={`text-3xl font-bold ${getGradeColor(grade)}`}>
              {grade}
            </div>
          </div>

          {/* Grade Justification */}
          {result.gradeJustification && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Grade Justification</p>
              <p className="text-sm">{result.gradeJustification}</p>
            </div>
          )}

          <Separator />

          {/* Raw Score */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-muted-foreground">Raw Score</span>
                <span className={`font-medium ${getScoreColor(result.totalScore.percentage)}`}>
                  {result.totalScore.earned} / {result.totalScore.possible} ({result.totalScore.percentage}%)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {(onSaveAnalytics || onAssociateStudent) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {onSaveAnalytics && (
                <Button 
                  onClick={onSaveAnalytics}
                  disabled={isSaving}
                  className="flex-1"
                  variant="hero"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Analytics
                </Button>
              )}
              {onAssociateStudent && (
                <Button 
                  onClick={onAssociateStudent}
                  disabled={isSaving}
                  variant="outline"
                  className="flex-1"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {studentName ? `Change Student (${studentName})` : 'Associate with Student'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {result.rubricScores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rubric Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.rubricScores.map((score, i) => (
              <div key={i} className="flex items-start gap-3">
                {score.score >= score.maxScore ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                ) : score.score > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm">{score.criterion}</p>
                    <span className="text-sm font-medium whitespace-nowrap">
                      {score.score}/{score.maxScore}
                    </span>
                  </div>
                  {score.feedback && (
                    <p className="text-xs text-muted-foreground mt-0.5">{score.feedback}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Misconceptions */}
      {result.misconceptions.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Identified Misconceptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.misconceptions.map((misconception, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  {misconception}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Remediation Actions - Generate practice questions based on misconceptions */}
      {result.misconceptions.length > 0 && (
        <RemediationActions
          misconceptions={result.misconceptions}
          problemContext={result.problemIdentified}
          studentName={studentName || undefined}
          studentId={studentId || undefined}
          classId={classId || undefined}
          topicName={topicName || result.problemIdentified || undefined}
          onPushToStudentApp={onPushRemediationToApp}
          onGenerateWorksheet={onGenerateRemediationWorksheet}
        />
      )}

      {/* Feedback */}
      {result.feedback && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              Feedback & Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{result.feedback}</p>
          </CardContent>
        </Card>
      )}

      {/* AI Work Detection */}
      {result.ocrText && result.ocrText.length > 20 && (
        <AIWorkDetector 
          text={result.ocrText} 
          studentName={studentName || undefined}
          studentId={studentId || undefined}
          questionContext={result.problemIdentified}
        />
      )}

      {/* Detailed Analysis Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="ocr">
          <AccordionTrigger className="text-sm">Extracted Text (OCR)</AccordionTrigger>
          <AccordionContent>
            <div className="bg-muted rounded-md p-3 text-sm font-mono whitespace-pre-wrap">
              {result.ocrText || 'No text extracted'}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="problem">
          <AccordionTrigger className="text-sm">Problem Identified</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm">{result.problemIdentified || 'Not identified'}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="approach">
          <AccordionTrigger className="text-sm">Approach Analysis</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm">{result.approachAnalysis || 'No analysis available'}</p>
          </AccordionContent>
        </AccordionItem>

        {rawAnalysis && (
          <AccordionItem value="raw">
            <AccordionTrigger className="text-sm">Full AI Response</AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {rawAnalysis}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
