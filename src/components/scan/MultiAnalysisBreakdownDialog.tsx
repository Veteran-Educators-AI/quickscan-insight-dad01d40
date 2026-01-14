import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ShieldCheck, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, MousePointerClick, RotateCcw } from 'lucide-react';
import { AnalysisResult } from '@/hooks/useBatchAnalysis';

interface MultiAnalysisBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName?: string;
  result: AnalysisResult | null;
  itemId?: string;
  onSelectRun?: (itemId: string, runIndex: number) => void;
}

export function MultiAnalysisBreakdownDialog({
  open,
  onOpenChange,
  studentName,
  result,
  itemId,
  onSelectRun,
}: MultiAnalysisBreakdownDialogProps) {
  if (!result?.multiAnalysisResults || result.multiAnalysisResults.length <= 1) {
    return null;
  }

  const { multiAnalysisResults, multiAnalysisGrades, confidenceScore, grade, selectedRunIndex } = result;
  const grades = multiAnalysisGrades || multiAnalysisResults.map(r => r.grade ?? r.totalScore.percentage);
  const averageGrade = Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
  const isUsingAverage = selectedRunIndex === undefined;
  const maxGrade = Math.max(...grades);
  const minGrade = Math.min(...grades);
  const range = maxGrade - minGrade;

  const getConfidenceColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getGradeVariant = (grade: number): 'default' | 'secondary' | 'destructive' => {
    if (grade >= 80) return 'default';
    if (grade >= 60) return 'secondary';
    return 'destructive';
  };

  const getGradeTrend = (index: number) => {
    if (index === 0) return null;
    const diff = grades[index] - grades[index - 1];
    if (diff > 2) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (diff < -2) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Multi-Analysis Breakdown
            {studentName && <span className="text-muted-foreground font-normal">— {studentName}</span>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Summary Section */}
          <Card className={`mb-4 border-2 ${getConfidenceColor(confidenceScore || 0)}`}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Final Grade</p>
                  <p className="text-3xl font-bold">{grade}%</p>
                  {selectedRunIndex !== undefined && (
                    <Badge variant="outline" className="mt-1 text-xs">Run #{selectedRunIndex + 1}</Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Confidence</p>
                  <p className="text-3xl font-bold">{confidenceScore}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Grade Range</p>
                  <p className="text-3xl font-bold">{range}pt</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Analyses Run</p>
                  <p className="text-3xl font-bold">{multiAnalysisResults.length}x</p>
                </div>
              </div>

              {/* High variance warning with selection hint */}
              {range > 10 && (
                <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p className="text-sm">
                    High grade variance detected. Click "Use This Grade" on any run below to select it as the final grade.
                  </p>
                </div>
              )}

              {/* Reset to average button if a specific run is selected */}
              {selectedRunIndex !== undefined && itemId && onSelectRun && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Reset by using a special "average" selection - we'll handle this via override
                    }}
                    className="gap-2"
                    disabled
                  >
                    <RotateCcw className="h-4 w-4" />
                    Currently using Run #{selectedRunIndex + 1} (Avg: {averageGrade}%)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {multiAnalysisResults.map((analysis, index) => {
              const analysisGrade = analysis.grade ?? analysis.totalScore.percentage;
              const isHighest = analysisGrade === maxGrade;
              const isLowest = analysisGrade === minGrade && range > 5;
              const isSelected = selectedRunIndex === index;

              return (
                <Card 
                  key={index} 
                  className={`
                    ${isHighest ? 'ring-2 ring-green-400' : ''} 
                    ${isLowest ? 'ring-2 ring-red-400' : ''} 
                    ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}
                  `}
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        Analysis Run #{index + 1}
                        {getGradeTrend(index)}
                        {isHighest && <Badge variant="outline" className="text-green-600 border-green-300">Highest</Badge>}
                        {isLowest && <Badge variant="outline" className="text-red-600 border-red-300">Lowest</Badge>}
                        {isSelected && <Badge className="bg-primary">Selected</Badge>}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={getGradeVariant(analysisGrade)} className="text-lg px-3">
                          {analysisGrade}%
                        </Badge>
                        {itemId && onSelectRun && range > 5 && (
                          <Button
                            size="sm"
                            variant={isSelected ? "secondary" : "outline"}
                            className="gap-1.5"
                            onClick={() => onSelectRun(itemId, index)}
                            disabled={isSelected}
                          >
                            {isSelected ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Using
                              </>
                            ) : (
                              <>
                                <MousePointerClick className="h-3.5 w-3.5" />
                                Use This
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-4">
                    <Accordion type="single" collapsible className="w-full">
                      {/* Rubric Scores */}
                      <AccordionItem value="rubric" className="border-b-0">
                        <AccordionTrigger className="text-sm py-2 hover:no-underline">
                          <span className="flex items-center gap-2">
                            Rubric Scores
                            <Badge variant="outline" className="ml-2 font-normal">
                              {analysis.totalScore.earned}/{analysis.totalScore.possible}
                            </Badge>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-2">
                            {analysis.rubricScores.map((score, scoreIdx) => (
                              <div key={scoreIdx} className="flex items-start gap-2 text-sm">
                                <Badge 
                                  variant={score.score === score.maxScore ? 'default' : score.score > 0 ? 'secondary' : 'destructive'}
                                  className="shrink-0 mt-0.5"
                                >
                                  {score.score}/{score.maxScore}
                                </Badge>
                                <div>
                                  <p className="font-medium">{score.criterion}</p>
                                  <p className="text-muted-foreground text-xs">{score.feedback}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Misconceptions */}
                      {analysis.misconceptions.length > 0 && (
                        <AccordionItem value="misconceptions" className="border-b-0">
                          <AccordionTrigger className="text-sm py-2 hover:no-underline">
                            <span className="flex items-center gap-2">
                              Misconceptions Identified
                              <Badge variant="outline" className="ml-2 font-normal">
                                {analysis.misconceptions.length}
                              </Badge>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-2">
                              {analysis.misconceptions.map((m, mIdx) => (
                                <li key={mIdx}>{m}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Feedback */}
                      <AccordionItem value="feedback" className="border-b-0">
                        <AccordionTrigger className="text-sm py-2 hover:no-underline">
                          Feedback & Analysis
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 text-sm pl-2">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Feedback</p>
                              <p>{analysis.feedback}</p>
                            </div>
                            {analysis.approachAnalysis && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Approach Analysis</p>
                                <p>{analysis.approachAnalysis}</p>
                              </div>
                            )}
                            {analysis.gradeJustification && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Grade Justification</p>
                                <p>{analysis.gradeJustification}</p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Comparison Summary */}
          <Card className="mt-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Analysis Comparison</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Common Misconceptions */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Misconceptions Across All Runs</p>
                  {(() => {
                    const allMisconceptions = multiAnalysisResults.flatMap(r => r.misconceptions);
                    const misconceptionCounts = allMisconceptions.reduce((acc, m) => {
                      acc[m] = (acc[m] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const sortedMisconceptions = Object.entries(misconceptionCounts)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 5);

                    if (sortedMisconceptions.length === 0) {
                      return <p className="text-muted-foreground">No misconceptions identified</p>;
                    }

                    return (
                      <ul className="space-y-1">
                        {sortedMisconceptions.map(([misconception, count]) => (
                          <li key={misconception} className="flex items-center gap-2">
                            <Badge variant="outline" className="shrink-0">
                              {count}/{multiAnalysisResults.length}
                            </Badge>
                            <span className="text-muted-foreground truncate">{misconception}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>

                {/* Score Consistency */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Rubric Consistency</p>
                  {(() => {
                    if (multiAnalysisResults.length < 2) return null;
                    
                    const rubricNames = multiAnalysisResults[0].rubricScores.map(r => r.criterion);
                    return (
                      <ul className="space-y-1">
                        {rubricNames.slice(0, 5).map((criterion, idx) => {
                          const scores = multiAnalysisResults.map(r => r.rubricScores[idx]?.score || 0);
                          const allSame = scores.every(s => s === scores[0]);
                          const maxScore = multiAnalysisResults[0].rubricScores[idx]?.maxScore || 0;
                          
                          return (
                            <li key={criterion} className="flex items-center gap-2">
                              {allSame ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                              )}
                              <span className="truncate">{criterion}</span>
                              <span className="text-muted-foreground ml-auto shrink-0">
                                {allSame ? `${scores[0]}/${maxScore}` : `${Math.min(...scores)}-${Math.max(...scores)}/${maxScore}`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
