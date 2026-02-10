import React, { useState, useRef, useCallback, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Lightbulb,
  FileText,
  X,
  Move,
  RefreshCw,
  Loader2,
  ThumbsUp,
  Target,
  BookOpen
} from 'lucide-react';
import { useGradeFloorSettings } from '@/hooks/useGradeFloorSettings';
import { ImageErrorOverlay } from './ImageErrorOverlay';

// Lazy-load to prevent TDZ errors in production bundles
const MisconceptionComparison = React.lazy(() => import('./MisconceptionComparison').then(m => ({ default: m.MisconceptionComparison })));
const AIAnalysisCritiqueDialog = React.lazy(() => import('./AIAnalysisCritiqueDialog').then(m => ({ default: m.AIAnalysisCritiqueDialog })));

// We still need extractErrorRegions at module level - import it separately
import { extractErrorRegions } from './MisconceptionComparison';
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
}

interface StudentWorkDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  imageUrl?: string;
  result: AnalysisResult;
  onReanalyze?: () => Promise<void>;
  isReanalyzing?: boolean;
}

// Check if analysis is incomplete (missing key details)
function isAnalysisIncomplete(result: AnalysisResult): boolean {
  const hasNoOcr = !result.ocrText || result.ocrText.trim().length < 10;
  const hasNoProblem = !result.problemIdentified || result.problemIdentified.trim().length < 5;
  const hasNoApproach = !result.approachAnalysis || result.approachAnalysis.trim().length < 10;
  const hasNoFeedback = !result.feedback || result.feedback.trim().length < 10;
  
  // If most fields are empty but we have a grade, analysis was likely incomplete
  const emptyFields = [hasNoOcr, hasNoProblem, hasNoApproach, hasNoFeedback].filter(Boolean).length;
  return emptyFields >= 3;
}

export function StudentWorkDetailDialog({
  open,
  onOpenChange,
  studentName,
  imageUrl,
  result,
  onReanalyze,
  isReanalyzing = false,
}: StudentWorkDetailDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showImageFullscreen, setShowImageFullscreen] = useState(false);
  const [highlightedError, setHighlightedError] = useState<number | null>(null);
  const { gradeFloor, gradeFloorWithEffort, calculateGrade } = useGradeFloorSettings();
  
  // Extract error regions from misconceptions for overlay
  const errorRegions = result?.misconceptions ? extractErrorRegions(result.misconceptions) : [];
  
  // Pan state for when zoomed
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.02, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.02, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };
  
  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    setStartPan({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  }, [zoom, panPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || zoom <= 1) return;
    e.preventDefault();
    setPanPosition({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  }, [isPanning, zoom, startPan]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsPanning(true);
    setStartPan({ x: touch.clientX - panPosition.x, y: touch.clientY - panPosition.y });
  }, [zoom, panPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPanning || zoom <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPanPosition({
      x: touch.clientX - startPan.x,
      y: touch.clientY - startPan.y,
    });
  }, [isPanning, zoom, startPan]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

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

  const getRegentsScoreColor = (score: number) => {
    if (score >= 4) return 'bg-green-500 text-white';
    if (score >= 3) return 'bg-blue-500 text-white';
    if (score >= 2) return 'bg-yellow-500 text-white';
    if (score >= 1) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getRegentsScoreLabel = (score: number) => {
    if (score >= 4) return 'Thorough';
    if (score >= 3) return 'Adequate';
    if (score >= 2) return 'Partial';
    if (score >= 1) return 'Limited';
    return 'None';
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
  const feedbackText = result?.feedback ?? '';

  // Calculate grade using teacher's grade floor settings
  const hasAnyPoints = totalScore.earned > 0;
  const hasAnyWork = ocrText.trim().length > 10 || hasAnyPoints;
  const minGrade = hasAnyWork ? gradeFloorWithEffort : gradeFloor;
  const calculatedGrade = calculateGrade(
    totalScore.percentage, 
    hasAnyWork, 
    result?.regentsScore
  );
  const grade = result?.grade ? Math.max(minGrade, result.grade) : calculatedGrade;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[95vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {studentName} - Work Detail
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 h-[calc(95vh-80px)]">
            {/* Left Panel - Image with zoom controls */}
            <div className="border-r flex flex-col bg-muted/30">
              {/* Image Controls */}
              <div className="flex items-center justify-between p-2 border-b bg-background">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-16 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoom >= 3}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleRotate}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  {zoom > 1 && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Move className="h-3 w-3" /> Drag to pan
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={resetView}>
                    Reset
                  </Button>
                  {imageUrl && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowImageFullscreen(true)}
                    >
                      Full Screen
                    </Button>
                  )}
                </div>
              </div>

              {/* Zoomable Image with Pan */}
              <div 
                ref={containerRef}
                className={`flex-1 overflow-hidden p-4 ${
                  zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'
                } ${isPanning ? 'cursor-grabbing' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {imageUrl ? (
                  <div 
                    className="flex items-center justify-center min-h-full select-none relative"
                    style={{
                      transform: zoom > 1 ? `translate(${panPosition.x}px, ${panPosition.y}px)` : undefined,
                    }}
                  >
                    {/* Image container with relative positioning for overlay */}
                    <div className="relative inline-block">
                      <img
                        src={imageUrl}
                        alt={`${studentName}'s work`}
                        className="transition-transform duration-200 rounded-lg shadow-lg pointer-events-none"
                        style={{
                          transform: `scale(${zoom}) rotate(${rotation}deg)`,
                          transformOrigin: 'center center',
                          maxWidth: zoom === 1 ? '100%' : 'none',
                        }}
                        draggable={false}
                      />
                      {/* Error region overlay */}
                      {errorRegions.length > 0 && (
                        <ImageErrorOverlay
                          errorRegions={errorRegions}
                          highlightedError={highlightedError}
                          onErrorHover={setHighlightedError}
                          onErrorClick={(id) => setHighlightedError(id === highlightedError ? null : id)}
                          zoom={zoom}
                          rotation={rotation}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p>No image available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Grading Details */}
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Score Summary */}
                <Card className="border-2">
                  <CardContent className="p-4">
                    {/* Grade Only */}
                    <div className={`w-full text-center rounded-lg p-4 ${getGradeBgColor(grade)}`}>
                      <span className="text-xs font-medium text-muted-foreground block">Final Grade</span>
                      <div className={`text-5xl font-bold ${getGradeColor(grade)}`}>
                        {grade}
                      </div>
                    </div>

                    {/* NYS Standard */}
                    {result.nysStandard && (
                      <div className="mt-3 pt-3 border-t">
                        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 border-purple-300 text-purple-700 dark:text-purple-300">
                          📐 {result.nysStandard}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Incomplete Analysis Warning + Reanalyze Button */}
                {isAnalysisIncomplete(result) && (
                  <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Incomplete Analysis Detected
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            The AI analysis may not have captured all details from this student's work. 
                            You can reanalyze to get more comprehensive feedback.
                          </p>
                          {onReanalyze && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={onReanalyze}
                              disabled={isReanalyzing}
                              className="mt-3 border-amber-400 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                            >
                              {isReanalyzing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Reanalyzing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Reanalyze This Paper
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detailed Analysis: What Student Did Right */}
                {strengthsAnalysis.length > 0 && (
                  <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        What the Student Did Right
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {strengthsAnalysis.map((strength, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          <p className="text-xs">{strength}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Detailed Analysis: Areas for Improvement */}
                {areasForImprovement.length > 0 && (
                  <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4 text-orange-600" />
                        Areas for Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {areasForImprovement.map((area, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                          <p className="text-xs">{area}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Approach Analysis - Now shown prominently */}
                {approachAnalysis && approachAnalysis !== 'No student work to analyze' && (
                  <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-purple-600" />
                        Approach Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs">{approachAnalysis}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Rubric Breakdown */}
                {rubricScores.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Rubric Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {rubricScores.map((score, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          {score.score >= score.maxScore ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          ) : score.score > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
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

                {/* Misconceptions - Side-by-side comparison with image highlighting */}
                {misconceptions.length > 0 && (
                  <MisconceptionComparison 
                    misconceptions={misconceptions}
                    highlightedError={highlightedError}
                    onErrorHover={setHighlightedError}
                    onErrorClick={(id) => setHighlightedError(id === highlightedError ? null : id)}
                  />
                )}

                {/* Feedback */}
                {feedbackText && (
                  <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{feedbackText}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Justifications */}
                <Accordion type="single" collapsible className="w-full">
                  {result?.regentsScoreJustification && (
                    <AccordionItem value="regents">
                      <AccordionTrigger className="text-sm">Regents Score Rationale</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">{result.regentsScoreJustification}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {result?.gradeJustification && (
                    <AccordionItem value="grade">
                      <AccordionTrigger className="text-sm">Grade Justification</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">{result.gradeJustification}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  <AccordionItem value="problem">
                    <AccordionTrigger className="text-sm">Problem Identified</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground">{result?.problemIdentified || 'Not identified'}</p>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Approach Analysis moved to prominent card above - only in accordion if card didn't render */}
                  {(!approachAnalysis || approachAnalysis === 'No student work to analyze') && (
                    <AccordionItem value="approach">
                      <AccordionTrigger className="text-sm">Approach Analysis</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">{approachAnalysis || 'No analysis available'}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  <AccordionItem value="ocr">
                    <AccordionTrigger className="text-sm">Extracted Text (OCR)</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {ocrText || 'No text extracted'}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Train AI Button */}
                <div className="mt-4 pt-4 border-t">
                  <AIAnalysisCritiqueDialog
                    aiGrade={grade}
                    aiJustification={result?.gradeJustification}
                    aiMisconceptions={misconceptions}
                    aiFeedback={feedbackText}
                    topicName={result?.problemIdentified || 'Unknown Topic'}
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Modal */}
      {showImageFullscreen && imageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setShowImageFullscreen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setShowImageFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="p-4 max-w-[95vw] max-h-[95vh]">
            <img
              src={imageUrl}
              alt={`${studentName}'s work - full screen`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-lg p-2">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRotate(); }} className="text-white hover:bg-white/20">
              <RotateCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
