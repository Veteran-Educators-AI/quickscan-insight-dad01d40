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
import { useGradeFloorSettings } from '@/hooks/useGradeFloorSettings';

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
  nysStandard?: string;
  regentsScore?: number;
  regentsScoreJustification?: string;
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
  const { gradeFloor, gradeFloorWithEffort, calculateGrade } = useGradeFloorSettings();
  
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

  const getGradeBgColor = (grade: number) => {
    if (grade >= 90) return 'bg-green-100 dark:bg-green-900/30';
    if (grade >= 80) return 'bg-blue-100 dark:bg-blue-900/30';
    if (grade >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-orange-100 dark:bg-orange-900/30';
  };

  const getGradeBadge = (grade: number) => {
    if (grade >= 90) return { label: 'Exceeds Standards', variant: 'default' as const };
    if (grade >= 80) return { label: 'Meets Standards', variant: 'secondary' as const };
    if (grade >= 70) return { label: 'Approaching Standards', variant: 'outline' as const };
    return { label: 'Below Standards', variant: 'destructive' as const };
  };

  const getRegentsScoreColor = (score: number) => {
    if (score >= 4) return 'bg-green-500 text-white';
    if (score >= 3) return 'bg-blue-500 text-white';
    if (score >= 2) return 'bg-yellow-500 text-white';
    if (score >= 1) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getRegentsScoreLabel = (score: number) => {
    if (score >= 4) return 'Thorough Understanding';
    if (score >= 3) return 'Adequate Understanding';
    if (score >= 2) return 'Partial Understanding';
    if (score >= 1) return 'Limited Understanding';
    return 'No Understanding';
  };

  const handleGradeOverride = (newGrade: number, newJustification: string) => {
    setOverriddenGrade({ grade: newGrade, justification: newJustification });
    onGradeOverride?.(newGrade, newJustification);
  };

  // Calculate grade using teacher's grade floor settings
  // VERY lenient check - if there's ANY content, consider it "work"
  const hasAnyPoints = result.totalScore.earned > 0;
  const hasOcrContent = result.ocrText?.trim().length > 5;
  const hasRegentsScore = (result.regentsScore ?? 0) >= 1;
  const hasAnyWork = hasAnyPoints || hasOcrContent || hasRegentsScore;
  
  // Use teacher-configured grade floors - enforce strictly
  const minGrade = hasAnyWork ? gradeFloorWithEffort : gradeFloor;
  const calculatedGrade = calculateGrade(
    result.totalScore.percentage, 
    hasAnyWork, 
    result.regentsScore
  );
  
  // Get AI grade, ensuring it respects the floor
  const aiGrade = result.grade ?? calculatedGrade;
  const flooredAiGrade = Math.max(minGrade, aiGrade);
  
  // Final grade: use override if present, otherwise use floored AI grade
  // CRITICAL: Never show 0 - always apply minimum floor
  const grade = overriddenGrade?.grade ?? Math.max(minGrade, flooredAiGrade);
  const gradeJustification = overriddenGrade?.justification ?? result.gradeJustification;
  const isOverridden = overriddenGrade !== null;
  const gradeBadge = getGradeBadge(grade);

  return (
    <div className="space-y-4">
      {/* Prominent Score Display */}
      <Card className={`${isOverridden ? 'border-primary' : 'border-2'}`}>
        <CardContent className="p-6">
          {/* Main Score Row */}
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Regents Score Badge */}
            {result.regentsScore !== undefined && (
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-muted-foreground mb-1">NYS Regents</span>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getRegentsScoreColor(result.regentsScore)}`}>
                  <span className="text-2xl font-bold">{result.regentsScore}</span>
                </div>
                <span className="text-xs font-medium mt-1 text-center max-w-20">
                  {getRegentsScoreLabel(result.regentsScore)}
                </span>
              </div>
            )}

            {/* Grade Display */}
            <div className={`flex-1 text-center rounded-lg p-4 ${getGradeBgColor(grade)}`}>
              <span className="text-xs font-medium text-muted-foreground block mb-1">Final Grade</span>
              <div className={`text-5xl font-bold ${getGradeColor(grade)}`}>
                {grade}
              </div>
              <Badge variant={gradeBadge.variant} className="mt-2">
                {gradeBadge.label}
              </Badge>
            </div>
          </div>

          {/* NYS Standard Badge */}
          {result.nysStandard && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 border-purple-300 text-purple-700 dark:text-purple-300">
                📐 {result.nysStandard}
              </Badge>
            </div>
          )}

          {/* Progress Bar */}
          {/* Hidden as per request to remove raw score
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-muted-foreground">Grade Scale ({gradeFloor}-100)</span>
              <span className="text-xs text-muted-foreground">{grade}/100</span>
            </div>
            <Progress value={(grade - gradeFloor) / (100 - gradeFloor) * 100} className="h-2" />
          </div>
          */}

          {/* Regents Score Justification */}
          {result.regentsScoreJustification && (
            <div className="bg-muted/50 rounded-md p-3 mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">NYS Regents Scoring Rationale</p>
              <p className="text-sm">{result.regentsScoreJustification}</p>
            </div>
          )}

          {/* Grade Justification */}
          {result.gradeJustification && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Grade Justification</p>
              <p className="text-sm">{result.gradeJustification}</p>
            </div>
          )}

          {/* Override indicator and button */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              {isOverridden && (
                <Badge variant="outline" className="text-xs bg-primary/10">Teacher Override Applied</Badge>
              )}
            </div>
            <GradeOverrideDialog
              currentGrade={grade}
              currentJustification={gradeJustification}
              onOverride={handleGradeOverride}
              disabled={isSaving}
            />
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
