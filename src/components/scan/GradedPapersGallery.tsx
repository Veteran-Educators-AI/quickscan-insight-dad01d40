import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Grid3X3, 
  LayoutGrid, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BatchItem, AnalysisResult } from '@/hooks/useBatchAnalysis';
import { useGradeFloorSettings } from '@/hooks/useGradeFloorSettings';
import { useMultipleGradeTrends, TrendDirection } from '@/hooks/useGradeTrend';
import { MisconceptionComparison } from './MisconceptionComparison';

// Extended result type that may include additional fields
interface ExtendedAnalysisResult extends AnalysisResult {
  nysStandard?: string;
  regentsScore?: number;
  grade?: number;
  gradeJustification?: string;
  regentsScoreJustification?: string;
}

interface GradedPapersGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: BatchItem[];
  onUpdateNotes?: (itemId: string, notes: string) => void;
}

export function GradedPapersGallery({ 
  open, 
  onOpenChange, 
  items,
  onUpdateNotes 
}: GradedPapersGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<BatchItem | null>(null);
  const [teacherNotes, setTeacherNotes] = useState<Record<string, string>>({});
  const [gridSize, setGridSize] = useState<'small' | 'large'>('large');
  const { gradeFloor, gradeFloorWithEffort, calculateGrade } = useGradeFloorSettings();

  const completedItems = items.filter(item => item.status === 'completed' && item.result);
  
  // Get student IDs for trend lookup
  const studentIds = completedItems
    .map(item => item.studentId)
    .filter((id): id is string => !!id);
  
  const { data: gradeTrends } = useMultipleGradeTrends(studentIds);

  const getStudentTrend = (studentId?: string, currentGrade?: number): { direction: TrendDirection; change: number } => {
    if (!studentId || !gradeTrends || currentGrade === undefined) {
      return { direction: 'new', change: 0 };
    }
    
    const previousGrades = gradeTrends[studentId];
    if (!previousGrades || previousGrades.length === 0) {
      return { direction: 'new', change: 0 };
    }
    
    const previousGrade = previousGrades[0];
    const change = currentGrade - previousGrade;
    
    if (change > 5) return { direction: 'improving', change };
    if (change < -5) return { direction: 'declining', change };
    return { direction: 'stable', change };
  };

  const TrendIndicator = ({ studentId, grade }: { studentId?: string; grade: number }) => {
    const { direction, change } = getStudentTrend(studentId, grade);
    
    const trendConfig = {
      improving: {
        icon: TrendingUp,
        color: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        label: `Improving (+${change} pts)`,
      },
      declining: {
        icon: TrendingDown,
        color: 'text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        label: `Declining (${change} pts)`,
      },
      stable: {
        icon: Minus,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        label: 'Stable performance',
      },
      new: {
        icon: Sparkles,
        color: 'text-purple-500',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        label: 'First recorded grade',
      },
    };
    
    const config = trendConfig[direction];
    const Icon = config.icon;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className={`text-xs font-medium ${config.color}`}>
                {direction === 'improving' && `+${change}`}
                {direction === 'declining' && change}
                {direction === 'stable' && '~'}
                {direction === 'new' && 'New'}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (percentage: number) => {
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

  const getLetterGrade = (grade: number): string => {
    if (grade >= 97) return 'A+';
    if (grade >= 93) return 'A';
    if (grade >= 90) return 'A-';
    if (grade >= 87) return 'B+';
    if (grade >= 83) return 'B';
    if (grade >= 80) return 'B-';
    if (grade >= 77) return 'C+';
    if (grade >= 73) return 'C';
    if (grade >= 70) return 'C-';
    if (grade >= 67) return 'D+';
    if (grade >= 65) return 'D';
    return 'F';
  };

  const getLetterGradeBadgeColor = (grade: number): string => {
    if (grade >= 90) return 'bg-green-500 text-white';
    if (grade >= 80) return 'bg-blue-500 text-white';
    if (grade >= 70) return 'bg-yellow-500 text-white';
    if (grade >= 65) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getGradeBgColor = (grade: number) => {
    if (grade >= 90) return 'bg-green-100 dark:bg-green-900/30';
    if (grade >= 80) return 'bg-blue-100 dark:bg-blue-900/30';
    if (grade >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-orange-100 dark:bg-orange-900/30';
  };

  const calculateItemGrade = (item: BatchItem) => {
    if (!item.result) return 0;
    const result = item.result as ExtendedAnalysisResult;
    const totalScore = result?.totalScore ?? { earned: 0, possible: 1, percentage: 0 };
    const hasAnyPoints = totalScore.earned > 0;
    const hasAnyWork = (result?.ocrText?.trim().length ?? 0) > 10 || hasAnyPoints;
    return calculateGrade(
      totalScore.percentage, 
      hasAnyWork, 
      result?.regentsScore
    );
  };

  const handleSaveNotes = (itemId: string) => {
    const notes = teacherNotes[itemId] || '';
    onUpdateNotes?.(itemId, notes);
  };

  const navigatePaper = (direction: 'prev' | 'next') => {
    if (!selectedItem) return;
    const currentIndex = completedItems.findIndex(item => item.id === selectedItem.id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'prev' 
      ? (currentIndex - 1 + completedItems.length) % completedItems.length
      : (currentIndex + 1) % completedItems.length;
    
    setSelectedItem(completedItems[newIndex]);
  };

  const currentIndex = selectedItem 
    ? completedItems.findIndex(item => item.id === selectedItem.id) + 1
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Graded Papers Gallery
            <Badge variant="secondary" className="ml-2">
              {completedItems.length} papers
            </Badge>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={gridSize === 'large' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGridSize('large')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={gridSize === 'small' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGridSize('small')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex h-[calc(95vh-80px)]">
          {/* Left side - Papers Grid */}
          <ScrollArea className={`${selectedItem ? 'w-1/2' : 'w-full'} border-r transition-all duration-300`}>
            <div className={`p-4 grid gap-4 ${
              gridSize === 'large' 
                ? selectedItem ? 'grid-cols-2' : 'grid-cols-3 md:grid-cols-4'
                : selectedItem ? 'grid-cols-3' : 'grid-cols-4 md:grid-cols-6'
            }`}>
              {completedItems.map((item) => {
                const grade = calculateItemGrade(item);
                const isSelected = selectedItem?.id === item.id;
                const hasNotes = !!(teacherNotes[item.id] || item.rawAnalysis?.includes('[TEACHER_NOTE]'));
                
                return (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                      isSelected 
                        ? 'ring-2 ring-primary shadow-lg scale-[1.02]' 
                        : 'hover:scale-[1.01]'
                    }`}
                    onClick={() => setSelectedItem(isSelected ? null : item)}
                  >
                    <div className="relative aspect-[3/4] bg-muted">
                      <img
                        src={item.imageDataUrl}
                        alt={`${item.studentName}'s work`}
                        className="w-full h-full object-cover"
                      />
                      {/* Score overlay */}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-white text-sm font-bold ${getScoreColor(item.result?.totalScore?.percentage ?? 0)}`}>
                        {item.result?.totalScore?.percentage ?? 0}%
                      </div>
                      {/* Notes indicator */}
                      {hasNotes && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <StickyNote className="h-3 w-3" />
                          </Badge>
                        </div>
                      )}
                      {/* Grade badge */}
                      <div className={`absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent`}>
                        <div className="flex items-center justify-between text-white">
                          <span className="text-sm font-medium truncate">{item.studentName}</span>
                          <span className="text-lg font-bold">{grade}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          {/* Right side - Detail Panel */}
          {selectedItem && selectedItem.result && (() => {
            const extendedResult = selectedItem.result as ExtendedAnalysisResult;
            return (
            <div className="w-1/2 flex flex-col bg-background">
              {/* Navigation Header */}
              <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigatePaper('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {currentIndex} of {completedItems.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigatePaper('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedItem(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Student Info */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedItem.studentName}</p>
                      {extendedResult.nysStandard && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {extendedResult.nysStandard}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Score Card */}
                  <Card className={`${getGradeBgColor(calculateItemGrade(selectedItem))}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-center gap-8">
                        <div className="text-center">
                          <span className="text-xs text-muted-foreground block">Grade</span>
                          <div className="flex items-baseline justify-center gap-2">
                            <span className={`text-4xl font-bold ${getGradeColor(calculateItemGrade(selectedItem))}`}>
                              {calculateItemGrade(selectedItem)}
                            </span>
                            <Badge className={`text-lg px-2 py-0.5 ${getLetterGradeBadgeColor(calculateItemGrade(selectedItem))}`}>
                              {getLetterGrade(calculateItemGrade(selectedItem))}
                            </Badge>
                            <span className="text-lg text-muted-foreground">
                              ({selectedItem.result?.totalScore?.percentage ?? 0}%)
                            </span>
                          </div>
                          <div className="mt-2">
                            <TrendIndicator 
                              studentId={selectedItem.studentId} 
                              grade={calculateItemGrade(selectedItem)} 
                            />
                          </div>
                        </div>
                        {extendedResult.regentsScore !== undefined && (
                          <>
                            <Separator orientation="vertical" className="h-12" />
                            <div className="text-center">
                              <span className="text-xs text-muted-foreground block">Regents</span>
                              <span className="text-2xl font-bold text-purple-600">
                                {extendedResult.regentsScore}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Teacher Notes Section */}
                  <Card className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span className="font-medium">Teacher Notes</span>
                      </div>
                      <Textarea
                        placeholder="Add your notes about this student's work..."
                        value={teacherNotes[selectedItem.id] || ''}
                        onChange={(e) => setTeacherNotes(prev => ({
                          ...prev,
                          [selectedItem.id]: e.target.value
                        }))}
                        className="min-h-[80px] resize-none"
                      />
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => handleSaveNotes(selectedItem.id)}
                        disabled={!onUpdateNotes}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Notes
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Rubric Breakdown */}
                  {(selectedItem.result?.rubricScores?.length ?? 0) > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="font-medium mb-3">Rubric Breakdown</p>
                        <div className="space-y-2">
                          {(selectedItem.result?.rubricScores ?? []).map((score, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              {score.score >= score.maxScore ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                              ) : score.score > 0 ? (
                                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <span>{score.criterion}</span>
                                  <span className="font-medium">{score.score}/{score.maxScore}</span>
                                </div>
                                {score.feedback && (
                                  <p className="text-xs text-muted-foreground">{score.feedback}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Misconceptions - Side-by-side comparison */}
                  {(selectedItem.result?.misconceptions?.length ?? 0) > 0 && (
                    <MisconceptionComparison misconceptions={selectedItem.result?.misconceptions ?? []} />
                  )}

                  {/* Feedback */}
                  {selectedItem.result.feedback && (
                    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">AI Feedback</span>
                        </div>
                        <p className="text-sm">{selectedItem.result.feedback}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Additional Details Accordion */}
                  <Accordion type="single" collapsible>
                    <AccordionItem value="problem">
                      <AccordionTrigger className="text-sm">Problem Identified</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">
                          {selectedItem.result.problemIdentified || 'Not identified'}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="approach">
                      <AccordionTrigger className="text-sm">Approach Analysis</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">
                          {selectedItem.result.approachAnalysis || 'No analysis available'}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="ocr">
                      <AccordionTrigger className="text-sm">Extracted Text</AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {selectedItem.result.ocrText || 'No text extracted'}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </ScrollArea>
            </div>
          );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
