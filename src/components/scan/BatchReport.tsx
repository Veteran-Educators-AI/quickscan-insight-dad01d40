import { useState } from 'react';
import { Download, Users, TrendingUp, AlertTriangle, BarChart3, Eye, GitCompare, LayoutGrid, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BatchItem, BatchSummary } from '@/hooks/useBatchAnalysis';
import { StudentWorkDetailDialog } from './StudentWorkDetailDialog';
import { StudentComparisonView } from './StudentComparisonView';
import { GradedPapersGallery } from './GradedPapersGallery';
import { Checkbox } from '@/components/ui/checkbox';
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BatchReportProps {
  items: BatchItem[];
  summary: BatchSummary;
  classId?: string;
  onExport: () => void;
  onUpdateNotes?: (itemId: string, notes: string) => void;
}

export function BatchReport({ items, summary, classId, onExport, onUpdateNotes }: BatchReportProps) {
  const [selectedStudent, setSelectedStudent] = useState<BatchItem | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [pushedStudents, setPushedStudents] = useState<Set<string>>(new Set());
  const { pushToSisterApp } = usePushToSisterApp();
  const completedItems = items.filter(item => item.status === 'completed' && item.result);

  const handlePushAllToScholar = async () => {
    if (!classId) {
      toast.error('Class ID required to push to NYClogic Scholar AI');
      return;
    }

    setIsPushingAll(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const item of completedItems) {
        if (!item.studentId || pushedStudents.has(item.studentId)) continue;
        
        const effectiveGrade = getEffectiveGrade(item.result);
        const misconceptions = item.result?.misconceptions || [];
        const topicName = item.result?.problemIdentified || 'General Practice';
        const nysStandard = item.result?.nysStandard || 'N/A';
        
        // Determine difficulty based on grade
        const difficulty = effectiveGrade < 60 ? 'scaffolded' : effectiveGrade < 80 ? 'practice' : 'challenge';
        const xpReward = difficulty === 'challenge' ? 50 : difficulty === 'practice' ? 30 : 20;
        const coinReward = difficulty === 'challenge' ? 25 : difficulty === 'practice' ? 15 : 10;

        const result = await pushToSisterApp({
          class_id: classId,
          title: `Remediation: ${topicName}`,
          description: `Based on scan analysis. Misconceptions: ${misconceptions.slice(0, 2).join(', ') || 'General review needed'}`,
          student_id: item.studentId,
          student_name: item.studentName,
          topic_name: topicName,
          standard_code: nysStandard,
          xp_reward: xpReward,
          coin_reward: coinReward,
          grade: effectiveGrade,
        });

        if (result.success) {
          successCount++;
          setPushedStudents(prev => new Set([...prev, item.studentId!]));
        } else {
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`Pushed ${successCount} student remediation(s) to NYClogic Scholar AI!`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} pushed, ${failCount} failed`);
      } else {
        toast.error('Failed to push to NYClogic Scholar AI');
      }
    } catch (err) {
      console.error('Push to Scholar error:', err);
      toast.error('Failed to push to NYClogic Scholar AI');
    } finally {
      setIsPushingAll(false);
    }
  };

  const allPushed = completedItems.length > 0 && 
    completedItems.filter(i => i.studentId).every(i => pushedStudents.has(i.studentId!));

  const toggleCompareSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      } else {
        // Replace the first selected with new selection
        const arr = Array.from(next);
        next.delete(arr[0]);
        next.add(id);
      }
      return next;
    });
  };

  const canCompare = selectedForCompare.size === 2;

  const comparisonStudents = completedItems
    .filter(item => item.result)
    .map(item => ({
      id: item.id,
      studentName: item.studentName,
      imageUrl: item.imageDataUrl,
      result: item.result!,
    }));

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    if (grade >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLetterGrade = (grade: number) => {
    if (grade >= 90) return 'A';
    if (grade >= 80) return 'B';
    if (grade >= 70) return 'C';
    if (grade >= 60) return 'D';
    return 'F';
  };

  // Get the effective grade for a result - prefer grade field, fallback to totalScore percentage
  const getEffectiveGrade = (result: BatchItem['result']) => {
    if (!result) return 55;
    // If grade field is available and reasonable, use it
    if (result.grade && result.grade >= 55) {
      return result.grade;
    }
    // Fallback to totalScore percentage if no grade field
    if (result.totalScore.possible > 0) {
      return result.totalScore.percentage;
    }
    // Last fallback - if there's any work shown but no scores, default to 65
    return 65;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Class Grading Report</h2>
          <p className="text-sm text-muted-foreground">
            {summary.totalStudents} papers analyzed • Click any row to view details
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {classId && (
            <Button 
              onClick={handlePushAllToScholar} 
              variant={allPushed ? 'outline' : 'hero'}
              disabled={isPushingAll || allPushed || completedItems.filter(i => i.studentId).length === 0}
            >
              {allPushed ? (
                <>✓ All Sent to Scholar</>
              ) : isPushingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Pushing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Push All to NYClogic Scholar AI
                </>
              )}
            </Button>
          )}
          <Button onClick={() => setShowGallery(true)} variant="default">
            <LayoutGrid className="h-4 w-4 mr-2" />
            View All Papers
          </Button>
          {canCompare && (
            <Button onClick={() => setShowComparison(true)} variant="secondary">
              <GitCompare className="h-4 w-4 mr-2" />
              Compare Selected ({selectedForCompare.size})
            </Button>
          )}
          {selectedForCompare.size > 0 && !canCompare && (
            <Badge variant="outline" className="text-xs">
              Select {2 - selectedForCompare.size} more to compare
            </Badge>
          )}
          <Button onClick={onExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${getScoreColor(summary.averageScore)}`}>
                  {summary.averageScore}%
                </p>
                <p className="text-xs text-muted-foreground">Class Average</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.passRate}%</p>
                <p className="text-xs text-muted-foreground">Pass Rate (≥60%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Score Range</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-semibold text-red-600">{summary.lowestScore}%</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-lg font-semibold text-green-600">{summary.highestScore}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.scoreDistribution.map((dist) => (
              <div key={dist.range} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium">{dist.range}</span>
                <div className="flex-1">
                  <Progress 
                    value={(dist.count / summary.totalStudents) * 100} 
                    className="h-6"
                  />
                </div>
                <span className="w-12 text-sm text-right">
                  {dist.count} ({Math.round((dist.count / summary.totalStudents) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Misconceptions */}
      {summary.commonMisconceptions.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Common Misconceptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.commonMisconceptions.map((item, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span>{item.misconception}</span>
                  <Badge variant="secondary">{item.count} student(s)</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Individual Results Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Individual Results
              <Badge variant="outline" className="ml-2 text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Click to view details
              </Badge>
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              <GitCompare className="h-3 w-3 mr-1" />
              Check 2 students to compare
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <span className="sr-only">Compare</span>
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="hidden md:table-cell">Feedback</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedForCompare.has(item.id) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => setSelectedStudent(item)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedForCompare.has(item.id)}
                      onCheckedChange={() => {
                        setSelectedForCompare(prev => {
                          const next = new Set(prev);
                          if (next.has(item.id)) {
                            next.delete(item.id);
                          } else if (next.size < 2) {
                            next.add(item.id);
                          } else {
                            const arr = Array.from(next);
                            next.delete(arr[0]);
                            next.add(item.id);
                          }
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.studentName}</TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const effectiveGrade = getEffectiveGrade(item.result);
                      return (
                        <span className={`font-semibold ${getGradeColor(effectiveGrade)}`}>
                          {effectiveGrade}%
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const effectiveGrade = getEffectiveGrade(item.result);
                      return (
                        <Badge variant={effectiveGrade >= 60 ? 'default' : 'destructive'}>
                          {getLetterGrade(effectiveGrade)}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                    {item.result!.feedback || 'No feedback'}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudent(item);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student Work Detail Dialog */}
      {selectedStudent && selectedStudent.result && (
        <StudentWorkDetailDialog
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          studentName={selectedStudent.studentName}
          imageUrl={selectedStudent.imageDataUrl}
          result={selectedStudent.result}
        />
      )}

      {/* Graded Papers Gallery */}
      <GradedPapersGallery
        open={showGallery}
        onOpenChange={setShowGallery}
        items={items}
        onUpdateNotes={onUpdateNotes}
      />

      {/* Student Comparison View */}
      {showComparison && comparisonStudents.length >= 2 && (
        <StudentComparisonView
          open={showComparison}
          onOpenChange={setShowComparison}
          students={comparisonStudents}
          initialStudentIds={Array.from(selectedForCompare) as [string, string]}
        />
      )}
    </div>
  );
}
