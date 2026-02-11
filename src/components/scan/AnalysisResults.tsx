import React, { useState, Suspense } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Lightbulb, Save, UserPlus, Loader2, FileX, ThumbsUp, Target, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import scanGeniusLogo from '@/assets/scan-genius-logo.png';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
// Lazy-load all sub-components to prevent TDZ / circular-init crashes
// when the Scan chunk initializes in production builds.
import { MisconceptionComparison, AIAnalysisCritiqueDialog } from './lazy';
const AIWorkDetector = React.lazy(() => import('./AIWorkDetector').then(m => ({ default: m.AIWorkDetector })));
const GradeOverrideDialog = React.lazy(() => import('./GradeOverrideDialog').then(m => ({ default: m.GradeOverrideDialog })));
const RemediationActions = React.lazy(() => import('./RemediationActions').then(m => ({ default: m.RemediationActions })));
const RecommendedNextSteps = React.lazy(() => import('./RecommendedNextSteps').then(m => ({ default: m.RecommendedNextSteps })));
const TeacherVerificationPanel = React.lazy(() => import('./TeacherVerificationPanel').then(m => ({ default: m.TeacherVerificationPanel })));
const TrainingConfidenceIndicator = React.lazy(() => import('./TrainingConfidenceIndicator').then(m => ({ default: m.TrainingConfidenceIndicator })));
const OCRCorrectionPanel = React.lazy(() => import('./OCRCorrectionPanel').then(m => ({ default: m.OCRCorrectionPanel })));
const TeacherInterpretationPanel = React.lazy(() => import('./TeacherInterpretationPanel').then(m => ({ default: m.TeacherInterpretationPanel })));

// Import useGradeFloorSettings AFTER lazy declarations to avoid TDZ issues
// with the production chunk initialization order.
import { useGradeFloorSettings } from '@/hooks/useGradeFloorSettings';

const LazyFallback = null; // Render nothing while loading sub-components

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
  strengthsAnalysis?: string[];
  areasForImprovement?: string[];
  whatStudentDidCorrectly?: string;
  whatStudentGotWrong?: string;
  rubricScores: RubricScore[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  grade?: number;
  gradeJustification?: string;
  feedback: string;
  nysStandard?: string;
  regentsScore?: number;
  regentsScoreJustification?: string;
  /** Set to true if the page was auto-detected as blank / no response */
  noResponse?: boolean;
  /** The detection reason when noResponse is true */
  noResponseReason?: string;
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
  attemptId?: string | null;
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
  attemptId,
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

  // Safely default all result fields that may be missing from edge function
  const totalScore = result?.totalScore ?? { earned: 0, possible: 1, percentage: 0 };
  const misconceptions = result?.misconceptions ?? [];
  const rubricScores = result?.rubricScores ?? [];
  const ocrText = result?.ocrText ?? '';
  const approachAnalysis = result?.approachAnalysis ?? '';
  const strengthsAnalysis = result?.strengthsAnalysis ?? [];
  const areasForImprovement = result?.areasForImprovement ?? [];
  const whatStudentDidCorrectly = result?.whatStudentDidCorrectly ?? '';
  const whatStudentGotWrong = result?.whatStudentGotWrong ?? '';
  const feedback = result?.feedback ?? '';

  // Calculate grade using teacher's grade floor settings
  // VERY lenient check - if there's ANY content, consider it "work"
  const hasAnyPoints = totalScore.earned > 0;
  const hasOcrContent = ocrText.trim().length > 5;
  const hasRegentsScore = (result?.regentsScore ?? 0) >= 1;
  const hasAnyWork = hasAnyPoints || hasOcrContent || hasRegentsScore;
  
  // Use teacher-configured grade floors - enforce strictly
  const minGrade = hasAnyWork ? gradeFloorWithEffort : gradeFloor;
  const calculatedGrade = calculateGrade(
    totalScore.percentage, 
    hasAnyWork, 
    result?.regentsScore
  );
  
  // Get AI grade, ensuring it respects the floor
  const aiGrade = result?.grade ?? calculatedGrade;
  const flooredAiGrade = Math.max(minGrade, aiGrade);
  
  // Final grade: use override if present, otherwise use floored AI grade
  // CRITICAL: Never show 0 - always apply minimum floor
  const grade = overriddenGrade?.grade ?? Math.max(minGrade, flooredAiGrade);
  const gradeJustification = overriddenGrade?.justification ?? result?.gradeJustification;
  const isOverridden = overriddenGrade !== null;
  const gradeBadge = getGradeBadge(grade);

  return (
    <Suspense fallback={LazyFallback}>
    <div className="space-y-4">
      {/* Logo Header */}
      <div className="flex justify-center py-2">
        <img src={scanGeniusLogo} alt="Scan Genius" className="h-10 object-contain" />
      </div>

      {/* Training Confidence Indicator - Compact version at top */}
      <TrainingConfidenceIndicator compact className="mb-2" />

      {/* No Response / Blank Page Banner */}
      {result.noResponse && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <FileX className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-destructive text-sm">No Response Detected</p>
              <p className="text-xs text-muted-foreground">
                {result.gradeJustification || 'No work shown on this page; score assigned per no-response policy.'}
              </p>
              {result.noResponseReason && (
                <Badge variant="outline" className="mt-1 text-[10px]">
                  Detection: {result.noResponseReason}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="flex items-center gap-2">
              <AIAnalysisCritiqueDialog
                aiGrade={grade}
                aiJustification={gradeJustification}
                aiMisconceptions={misconceptions}
                aiFeedback={feedback}
                topicName={topicName || 'Unknown Topic'}
                studentId={studentId || undefined}
                attemptId={attemptId || undefined}
              />
              <GradeOverrideDialog
                currentGrade={grade}
                currentJustification={gradeJustification}
                onOverride={handleGradeOverride}
                disabled={isSaving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Analysis Breakdown (Always Visible) ═══ */}
      {!result.noResponse && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              What the Student Did Well
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {whatStudentDidCorrectly || approachAnalysis || 'No analysis available'}
            </p>
          </CardContent>
        </Card>
      )}

      {!result?.noResponse && (whatStudentGotWrong || misconceptions.length > 0) && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              What Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {whatStudentGotWrong && (
              <p className="text-sm whitespace-pre-wrap">{whatStudentGotWrong}</p>
            )}
            {!whatStudentGotWrong && misconceptions.length > 0 && (
              <ul className="text-sm space-y-1 list-disc list-inside">
                {misconceptions.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Detailed Analysis: What Student Did Right */}
      {strengthsAnalysis.length > 0 && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-600" />
              What the Student Did Right
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {strengthsAnalysis.map((strength, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-sm">{strength}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis: Areas for Improvement */}
      {areasForImprovement.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {areasForImprovement.map((area, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-sm">{area}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approach Analysis - Now visible by default (not hidden in accordion) */}
      {approachAnalysis && approachAnalysis !== 'No student work to analyze' && (
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-600" />
              Approach Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{approachAnalysis}</p>
          </CardContent>
        </Card>
      )}

      {/* Teacher Verification Panel - Shows flagged interpretations */}
      {rawAnalysis && (
        <TeacherVerificationPanel
          rawAnalysis={rawAnalysis}
          attemptId={attemptId || undefined}
          studentId={studentId || undefined}
          onVerificationComplete={(interpretations) => {
            console.log('Verification complete:', interpretations);
          }}
        />
      )}

      {/* OCR Correction Panel - Allow teachers to fix misread numbers/text */}
      {ocrText && (
        <OCRCorrectionPanel
          ocrText={ocrText}
          attemptId={attemptId || undefined}
          studentId={studentId || undefined}
          onOCRCorrected={(corrections) => {
            console.log('OCR corrections applied:', corrections);
          }}
        />
      )}

      {/* Teacher Interpretation Panel - Teach AI recognition patterns */}
      <TeacherInterpretationPanel
        topicName={topicName || undefined}
        ocrText={ocrText}
        onInterpretationSaved={() => {
          console.log('Interpretation saved for AI training');
        }}
      />

      {rubricScores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rubric Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rubricScores.map((score, i) => (
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

      {/* Misconceptions - Side-by-side comparison view */}
      {misconceptions.length > 0 && (
        <MisconceptionComparison misconceptions={misconceptions} />
      )}

      {/* Remediation Actions - Generate practice questions based on misconceptions */}
      {misconceptions.length > 0 && (
        <RemediationActions
          misconceptions={misconceptions}
          problemContext={result?.problemIdentified}
          studentName={studentName || undefined}
          studentId={studentId || undefined}
          classId={classId || undefined}
          topicName={topicName || result?.problemIdentified || undefined}
          onPushToStudentApp={onPushRemediationToApp}
          onGenerateWorksheet={onGenerateRemediationWorksheet}
        />
      )}

      {/* Recommended Next Steps - Worksheets & Topics for Sister App */}
      <RecommendedNextSteps
        misconceptions={misconceptions}
        problemContext={result?.problemIdentified}
        nysStandard={result?.nysStandard}
        topicName={topicName || result?.problemIdentified}
        studentId={studentId || undefined}
        studentName={studentName || undefined}
        classId={classId || undefined}
        grade={grade}
        regentsScore={result?.regentsScore}
      />

      {/* Feedback */}
      {feedback && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              Feedback & Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{feedback}</p>
          </CardContent>
        </Card>
      )}

      {/* AI Work Detection */}
      {ocrText && ocrText.length > 20 && (
        <AIWorkDetector 
          text={ocrText} 
          studentName={studentName || undefined}
          studentId={studentId || undefined}
          questionContext={result?.problemIdentified}
        />
      )}

      {/* Detailed Analysis Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="ocr">
          <AccordionTrigger className="text-sm">Extracted Text (OCR)</AccordionTrigger>
          <AccordionContent>
            <div className="bg-muted rounded-md p-3 text-sm font-mono whitespace-pre-wrap">
              {ocrText || 'No text extracted'}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="problem">
          <AccordionTrigger className="text-sm">Problem Identified</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm">{result?.problemIdentified || 'Not identified'}</p>
          </AccordionContent>
        </AccordionItem>

        {/* Approach Analysis moved to prominent card above - only show in accordion if card didn't render */}
        {(!approachAnalysis || approachAnalysis === 'No student work to analyze') && (
          <AccordionItem value="approach">
            <AccordionTrigger className="text-sm">Approach Analysis</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm">{approachAnalysis || 'No analysis available'}</p>
            </AccordionContent>
          </AccordionItem>
        )}

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
    </Suspense>
  );
}
