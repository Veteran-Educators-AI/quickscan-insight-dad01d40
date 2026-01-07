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
  feedback: string;
}

interface AnalysisResultsProps {
  result: AnalysisResult;
  rawAnalysis?: string | null;
  onSaveAnalytics?: () => void;
  onAssociateStudent?: () => void;
  isSaving?: boolean;
  studentName?: string | null;
  studentId?: string | null;
}

export function AnalysisResults({ 
  result, 
  rawAnalysis, 
  onSaveAnalytics, 
  onAssociateStudent,
  isSaving = false,
  studentName = null,
  studentId = null
}: AnalysisResultsProps) {
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
    return { label: 'Needs Improvement', variant: 'destructive' as const };
  };

  const scoreBadge = getScoreBadge(result.totalScore.percentage);

  return (
    <div className="space-y-4">
      {/* Score Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Analysis Results</span>
            <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-muted-foreground">Total Score</span>
                <span className={`font-bold ${getScoreColor(result.totalScore.percentage)}`}>
                  {result.totalScore.earned} / {result.totalScore.possible}
                </span>
              </div>
              <Progress value={result.totalScore.percentage} className="h-3" />
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(result.totalScore.percentage)}`}>
              {result.totalScore.percentage}%
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
