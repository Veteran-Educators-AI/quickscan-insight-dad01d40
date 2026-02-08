import { useState } from 'react';
import { Scale, Bot, BookOpen, Check, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface AnalysisResult {
  ocrText: string;
  problemIdentified: string;
  approachAnalysis: string;
  strengthsAnalysis?: string[];
  areasForImprovement?: string[];
  rubricScores: { criterion: string; score: number; maxScore: number; feedback: string }[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  grade?: number;
  gradeJustification?: string;
  feedback: string;
  nysStandard?: string;
  regentsScore?: number;
  regentsScoreJustification?: string;
}

interface GradingComparisonViewProps {
  aiResult: AnalysisResult;
  teacherGuidedResult: AnalysisResult;
  studentImage: string;
  answerGuideImage: string;
  onSelectResult: (result: AnalysisResult, source: 'ai' | 'teacher-guided') => void;
  onRerunWithGuide?: () => void;
}

export function GradingComparisonView({
  aiResult,
  teacherGuidedResult,
  studentImage,
  answerGuideImage,
  onSelectResult,
  onRerunWithGuide,
}: GradingComparisonViewProps) {
  const [selectedSource, setSelectedSource] = useState<'ai' | 'teacher-guided' | null>(null);

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

  const gradeDifference = Math.abs((aiResult.grade || 0) - (teacherGuidedResult.grade || 0));
  const hasMajorDifference = gradeDifference >= 10;

  const handleProceed = () => {
    if (selectedSource) {
      const result = selectedSource === 'ai' ? aiResult : teacherGuidedResult;
      onSelectResult(result, selectedSource);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Compare Grading Results</CardTitle>
            </div>
            {hasMajorDifference && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {gradeDifference} point difference
              </Badge>
            )}
          </div>
          <CardDescription>
            Review both AI and teacher-guided results, then choose which to use
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Result */}
        <Card 
          className={`cursor-pointer transition-all ${
            selectedSource === 'ai' 
              ? 'ring-2 ring-primary border-primary' 
              : 'hover:border-primary/50'
          }`}
          onClick={() => setSelectedSource('ai')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">AI Standards-Based</CardTitle>
              </div>
              {selectedSource === 'ai' && (
                <div className="p-1 bg-primary text-primary-foreground rounded-full">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`text-center rounded-lg p-4 ${getGradeBgColor(aiResult.grade || 0)}`}>
              <span className="text-xs font-medium text-muted-foreground block mb-1">Grade</span>
              <div className={`text-4xl font-bold ${getGradeColor(aiResult.grade || 0)}`}>
                {aiResult.grade || 0}
              </div>
            </div>

            {aiResult.regentsScore !== undefined && (
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Regents Score: </span>
                <span className="font-semibold">{aiResult.regentsScore}/4</span>
              </div>
            )}

            <Separator />

            <div className="space-y-2 text-sm">
              <p className="font-medium">Justification:</p>
              <p className="text-muted-foreground line-clamp-3">
                {aiResult.gradeJustification || 'No justification provided'}
              </p>
            </div>

            {aiResult.misconceptions.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Misconceptions Found:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {aiResult.misconceptions.slice(0, 2).map((m, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-600">•</span>
                      <span className="line-clamp-1">{m}</span>
                    </li>
                  ))}
                  {aiResult.misconceptions.length > 2 && (
                    <li className="text-xs text-muted-foreground">
                      +{aiResult.misconceptions.length - 2} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teacher-Guided Result */}
        <Card 
          className={`cursor-pointer transition-all ${
            selectedSource === 'teacher-guided' 
              ? 'ring-2 ring-primary border-primary' 
              : 'hover:border-primary/50'
          }`}
          onClick={() => setSelectedSource('teacher-guided')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Teacher-Guided</CardTitle>
              </div>
              {selectedSource === 'teacher-guided' && (
                <div className="p-1 bg-primary text-primary-foreground rounded-full">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`text-center rounded-lg p-4 ${getGradeBgColor(teacherGuidedResult.grade || 0)}`}>
              <span className="text-xs font-medium text-muted-foreground block mb-1">Grade</span>
              <div className={`text-4xl font-bold ${getGradeColor(teacherGuidedResult.grade || 0)}`}>
                {teacherGuidedResult.grade || 0}
              </div>
            </div>

            {teacherGuidedResult.regentsScore !== undefined && (
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Regents Score: </span>
                <span className="font-semibold">{teacherGuidedResult.regentsScore}/4</span>
              </div>
            )}

            <Separator />

            <div className="space-y-2 text-sm">
              <p className="font-medium">Justification:</p>
              <p className="text-muted-foreground line-clamp-3">
                {teacherGuidedResult.gradeJustification || 'No justification provided'}
              </p>
            </div>

            {teacherGuidedResult.misconceptions.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Misconceptions Found:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {teacherGuidedResult.misconceptions.slice(0, 2).map((m, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-600">•</span>
                      <span className="line-clamp-1">{m}</span>
                    </li>
                  ))}
                  {teacherGuidedResult.misconceptions.length > 2 && (
                    <li className="text-xs text-muted-foreground">
                      +{teacherGuidedResult.misconceptions.length - 2} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick View of Images */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reference Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Student Work</p>
              <img 
                src={studentImage} 
                alt="Student work" 
                className="w-full max-h-24 object-contain rounded border"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Your Answer Guide</p>
              <img 
                src={answerGuideImage} 
                alt="Answer guide" 
                className="w-full max-h-24 object-contain rounded border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleProceed}
          disabled={!selectedSource}
          className="flex-1"
        >
          {selectedSource ? (
            <>
              Use {selectedSource === 'ai' ? 'AI' : 'Teacher-Guided'} Result
              <Check className="h-4 w-4 ml-2" />
            </>
          ) : (
            'Select a Result to Continue'
          )}
        </Button>
        {onRerunWithGuide && (
          <Button 
            variant="outline" 
            onClick={onRerunWithGuide}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Re-run Analysis
          </Button>
        )}
      </div>
    </div>
  );
}
