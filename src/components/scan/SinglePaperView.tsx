import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  X,
  Edit2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Target,
  Lightbulb,
} from 'lucide-react';

interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface AnalysisResult {
  extractedText?: string;
  problemIdentification?: string;
  approachAnalysis?: string;
  strengthsAnalysis?: string[];
  areasForImprovement?: string[];
  rubricScores?: RubricScore[];
  totalScore?: {
    earned: number;
    possible: number;
    percentage: number;
  };
  feedback?: string;
  misconceptions?: string[];
  regentsScore?: number;
  regentsJustification?: string;
  grade?: number;
  gradeJustification?: string;
}

interface ReassessmentCriteria {
  id: string;
  label: string;
  description: string;
  gradeAdjustment: number;
}

const REASSESSMENT_CRITERIA: ReassessmentCriteria[] = [
  {
    id: 'showed_work',
    label: 'Showed Work',
    description: 'Student showed their problem-solving process',
    gradeAdjustment: 5,
  },
  {
    id: 'partial_understanding',
    label: 'Partial Understanding',
    description: 'Demonstrated partial understanding of concepts',
    gradeAdjustment: 8,
  },
  {
    id: 'computational_error',
    label: 'Computational Error Only',
    description: 'Correct approach but arithmetic/calculation error',
    gradeAdjustment: 10,
  },
  {
    id: 'misread_problem',
    label: 'Misread Problem',
    description: 'Would have been correct if problem was read correctly',
    gradeAdjustment: 12,
  },
  {
    id: 'effort_evident',
    label: 'Effort Evident',
    description: 'Clear effort was made despite incorrect answer',
    gradeAdjustment: 5,
  },
  {
    id: 'close_answer',
    label: 'Close Answer',
    description: 'Answer was very close to correct',
    gradeAdjustment: 7,
  },
];

interface SinglePaperViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  imageUrl?: string;
  result: AnalysisResult;
  onGradeOverride: (newGrade: number, justification: string) => void;
}

export function SinglePaperView({
  open,
  onOpenChange,
  studentName,
  imageUrl,
  result,
  onGradeOverride,
}: SinglePaperViewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverridePanel, setShowOverridePanel] = useState(false);

  // Safely default all result fields that may be missing from edge function
  const totalScore = result?.totalScore ?? { earned: 0, possible: 1, percentage: 0 };
  const misconceptions = result?.misconceptions ?? [];
  const rubricScores = result?.rubricScores ?? [];
  const approachAnalysis = result?.approachAnalysis ?? '';
  const strengthsAnalysis = result?.strengthsAnalysis ?? [];
  const areasForImprovement = result?.areasForImprovement ?? [];
  const feedbackText = result?.feedback ?? '';
  const gradeJustificationText = result?.gradeJustification ?? '';

  const currentGrade = result?.grade ?? totalScore.percentage ?? 0;

  const [overrideGrade, setOverrideGrade] = useState(currentGrade);
  const [justification, setJustification] = useState('');
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);

  const getGradeColor = (grade: number) => {
    if (grade >= 80) return 'text-green-600 dark:text-green-400';
    if (grade >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeBgColor = (grade: number) => {
    if (grade >= 80) return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    if (grade >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
  };

  const getGradeBadge = (grade: number) => {
    if (grade >= 90) return { label: 'Exceeds', variant: 'default' as const };
    if (grade >= 80) return { label: 'Meets', variant: 'secondary' as const };
    if (grade >= 70) return { label: 'Approaching', variant: 'outline' as const };
    return { label: 'Below', variant: 'destructive' as const };
  };

  const handleCriteriaToggle = (criteriaId: string) => {
    setSelectedCriteria(prev => {
      const newCriteria = prev.includes(criteriaId)
        ? prev.filter(id => id !== criteriaId)
        : [...prev, criteriaId];
      
      // Calculate new grade based on selected criteria
      const totalAdjustment = newCriteria.reduce((sum, id) => {
        const criteria = REASSESSMENT_CRITERIA.find(c => c.id === id);
        return sum + (criteria?.gradeAdjustment || 0);
      }, 0);
      
      const newGrade = Math.min(100, currentGrade + totalAdjustment);
      setOverrideGrade(newGrade);
      
      // Auto-generate justification based on selected criteria
      const selectedLabels = newCriteria.map(id => 
        REASSESSMENT_CRITERIA.find(c => c.id === id)?.label
      ).filter(Boolean);
      
      if (selectedLabels.length > 0) {
        setJustification(`Grade adjusted based on: ${selectedLabels.join(', ')}`);
      }
      
      return newCriteria;
    });
  };

  const handleSaveOverride = () => {
    if (justification.trim()) {
      onGradeOverride(overrideGrade, justification.trim());
      setShowOverridePanel(false);
    }
  };

  const handleResetOverride = () => {
    setOverrideGrade(currentGrade);
    setSelectedCriteria([]);
    setJustification('');
  };

  const badge = getGradeBadge(overrideGrade);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Student Work: {studentName}</span>
              <div className="flex items-center gap-2">
                <Badge variant={badge.variant}>{badge.label}</Badge>
                <span className={`text-2xl font-bold ${getGradeColor(overrideGrade)}`}>
                  {Math.round(overrideGrade)}%
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(90vh-120px)]">
            {/* Left Panel - Image View */}
            <div className="flex flex-col border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.02))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom(z => Math.min(3, z + 0.02))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRotation(r => (r + 90) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(true)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-auto bg-muted/20 p-4">
                {imageUrl ? (
                  <div className="flex items-center justify-center min-h-full">
                    <img
                      src={imageUrl}
                      alt="Student work"
                      className="max-w-full transition-transform duration-200"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No image available
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Analysis & Override */}
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-4">
                {/* Grade Override Section */}
                <Card className={`${getGradeBgColor(overrideGrade)} border`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Grade Summary
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOverridePanel(!showOverridePanel)}
                        className="gap-1"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        {showOverridePanel ? 'Hide' : 'Adjust Grade'}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">AI Grade</p>
                        <p className="text-xl font-semibold">{Math.round(currentGrade)}%</p>
                      </div>
                      {result?.regentsScore !== undefined && (
                        <div>
                          <p className="text-sm text-muted-foreground">Regents Score</p>
                          <p className="text-xl font-semibold">{result?.regentsScore}/6</p>
                        </div>
                      )}
                      {overrideGrade !== currentGrade && (
                        <div>
                          <p className="text-sm text-muted-foreground">Adjusted Grade</p>
                          <p className={`text-xl font-bold ${getGradeColor(overrideGrade)}`}>
                            {Math.round(overrideGrade)}%
                          </p>
                        </div>
                      )}
                    </div>

                    {showOverridePanel && (
                      <>
                        <Separator />
                        
                        {/* Quick Reassessment Criteria */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Quick Reassessment Criteria
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            {REASSESSMENT_CRITERIA.map(criteria => (
                              <div
                                key={criteria.id}
                                className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                                  selectedCriteria.includes(criteria.id)
                                    ? 'bg-primary/10 border-primary'
                                    : 'hover:bg-muted/50'
                                }`}
                                onClick={() => handleCriteriaToggle(criteria.id)}
                              >
                                <Checkbox
                                  checked={selectedCriteria.includes(criteria.id)}
                                  onCheckedChange={() => handleCriteriaToggle(criteria.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-none">
                                    {criteria.label}
                                    <span className="ml-1 text-xs text-green-600">
                                      +{criteria.gradeAdjustment}%
                                    </span>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {criteria.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Manual Grade Adjustment */}
                        <div className="space-y-2">
                          <Label>Manual Grade Override</Label>
                          <div className="flex items-center gap-3">
                            <Slider
                              value={[overrideGrade]}
                              onValueChange={([value]) => setOverrideGrade(value)}
                              min={0}
                              max={100}
                              step={1}
                              className="flex-1"
                            />
                            <span className={`text-lg font-bold min-w-[50px] text-right ${getGradeColor(overrideGrade)}`}>
                              {Math.round(overrideGrade)}%
                            </span>
                          </div>
                        </div>

                        {/* Justification */}
                        <div className="space-y-2">
                          <Label htmlFor="justification">Justification (required)</Label>
                          <Textarea
                            id="justification"
                            placeholder="Explain the grade adjustment..."
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            rows={2}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetOverride}
                            className="flex-1"
                          >
                            Reset
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveOverride}
                            disabled={!justification.trim()}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Save Override
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Rubric Breakdown */}
                {rubricScores.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Rubric Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {rubricScores.map((score, idx) => (
                        <div key={idx} className="flex items-start justify-between p-2 rounded bg-muted/30">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{score.criterion}</p>
                            <p className="text-xs text-muted-foreground">{score.feedback}</p>
                          </div>
                          <Badge variant={score.score === score.maxScore ? 'default' : 'outline'}>
                            {score.score}/{score.maxScore}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Misconceptions */}
                {misconceptions.length > 0 && (
                  <Card className="border-orange-200 dark:border-orange-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <AlertTriangle className="h-5 w-5" />
                        Identified Misconceptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {misconceptions.map((m, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-orange-500">•</span>
                            {m}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Feedback */}
                {feedbackText && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{feedbackText}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Extracted Text */}
                {result?.extractedText && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Extracted Text</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-2 rounded max-h-32 overflow-auto">
                        {result?.extractedText}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Modal */}
      {isFullscreen && imageUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={imageUrl}
            alt="Student work fullscreen"
            className="max-w-[95vw] max-h-[95vh] object-contain"
            style={{ transform: `rotate(${rotation}deg)` }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
