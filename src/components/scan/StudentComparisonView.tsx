import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2,
  Minimize2,
  X,
  Users,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SplitSquareVertical,
  Square
} from 'lucide-react';

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
  rubricScores: RubricScore[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  grade?: number;
  gradeJustification?: string;
  feedback: string;
  nysStandard?: string;
  regentsScore?: number;
}

interface StudentItem {
  id: string;
  studentName: string;
  imageUrl?: string;
  result: AnalysisResult;
}

interface StudentComparisonViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentItem[];
  initialStudentIds?: [string, string];
}

type ViewMode = 'split' | 'left-full' | 'right-full';

export function StudentComparisonView({
  open,
  onOpenChange,
  students,
  initialStudentIds,
}: StudentComparisonViewProps) {
  const [leftStudentId, setLeftStudentId] = useState<string>(initialStudentIds?.[0] || students[0]?.id || '');
  const [rightStudentId, setRightStudentId] = useState<string>(initialStudentIds?.[1] || students[1]?.id || '');
  const [leftZoom, setLeftZoom] = useState(1);
  const [rightZoom, setRightZoom] = useState(1);
  const [leftRotation, setLeftRotation] = useState(0);
  const [rightRotation, setRightRotation] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const leftStudent = useMemo(() => students.find(s => s.id === leftStudentId), [students, leftStudentId]);
  const rightStudent = useMemo(() => students.find(s => s.id === rightStudentId), [students, rightStudentId]);

  const swapStudents = () => {
    const temp = leftStudentId;
    setLeftStudentId(rightStudentId);
    setRightStudentId(temp);
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'bg-green-500 text-white';
    if (grade >= 80) return 'bg-blue-500 text-white';
    if (grade >= 70) return 'bg-yellow-500 text-white';
    if (grade >= 65) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  // Find common misconceptions
  const commonMisconceptions = useMemo(() => {
    if (!leftStudent?.result.misconceptions || !rightStudent?.result.misconceptions) return [];
    return leftStudent.result.misconceptions.filter(m => 
      rightStudent.result.misconceptions.some(rm => 
        rm.toLowerCase().includes(m.toLowerCase().split(' ')[0]) ||
        m.toLowerCase().includes(rm.toLowerCase().split(' ')[0])
      )
    );
  }, [leftStudent, rightStudent]);

  const renderStudentPanel = (
    student: StudentItem | undefined,
    zoom: number,
    setZoom: (z: number) => void,
    rotation: number,
    setRotation: (r: number) => void,
    side: 'left' | 'right',
    isFullScreen: boolean
  ) => {
    if (!student) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a student to compare
        </div>
      );
    }

    const result = student.result;
    const grade = result.grade || Math.round(65 + (result.totalScore.percentage / 100) * 35);

    return (
      <div className={`flex flex-col h-full ${isFullScreen ? 'w-full' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getGradeColor(grade)}>
              {grade}
            </Badge>
            <span className="font-medium">{student.studentName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.02))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(3, zoom + 0.02))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setRotation((rotation + 90) % 360)}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            {viewMode === 'split' ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewMode(side === 'left' ? 'left-full' : 'right-full')}
                title="Full screen"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewMode('split')}
                title="Split view"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 overflow-auto bg-muted/10 p-2">
          {student.imageUrl ? (
            <div className="flex items-center justify-center min-h-full">
              <img
                src={student.imageUrl}
                alt={`${student.studentName}'s work`}
                className="transition-transform duration-200 rounded-lg shadow-md max-w-full"
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

        {/* Scores & Analysis Summary */}
        <div className="p-3 border-t bg-background space-y-2 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Score:</span>
            <span className={`font-medium ${getScoreColor(result.totalScore.percentage)}`}>
              {result.totalScore.earned}/{result.totalScore.possible} ({result.totalScore.percentage}%)
            </span>
          </div>
          
          {result.regentsScore !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Regents:</span>
              <Badge variant="secondary">{result.regentsScore}/4</Badge>
            </div>
          )}

          {result.nysStandard && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Standard:</span>
              <Badge variant="outline" className="text-xs">{result.nysStandard}</Badge>
            </div>
          )}

          {result.misconceptions.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Misconceptions:</p>
              <ul className="space-y-1">
                {result.misconceptions.slice(0, 3).map((m, i) => (
                  <li key={i} className="text-xs flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 shrink-0" />
                    <span className="line-clamp-1">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rubric scores comparison */}
          {result.rubricScores.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Rubric:</p>
              <div className="space-y-1">
                {result.rubricScores.slice(0, 3).map((score, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {score.score >= score.maxScore ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : score.score > 0 ? (
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span className="truncate max-w-24">{score.criterion}</span>
                    </div>
                    <span className="font-medium">{score.score}/{score.maxScore}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Compare Student Work
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('split')}
              >
                <SplitSquareVertical className="h-4 w-4 mr-1" />
                Split
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Student Selectors */}
        <div className="flex items-center gap-2 p-3 border-b bg-muted/20">
          <div className="flex-1">
            <Select value={leftStudentId} onValueChange={setLeftStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id} disabled={s.id === rightStudentId}>
                    {s.studentName} ({s.result.totalScore.percentage}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" size="icon" onClick={swapStudents} title="Swap students">
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
          
          <div className="flex-1">
            <Select value={rightStudentId} onValueChange={setRightStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id} disabled={s.id === leftStudentId}>
                    {s.studentName} ({s.result.totalScore.percentage}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Common Insights Bar */}
        {commonMisconceptions.length > 0 && (
          <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950/30 border-b">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">Common Misconception:</span>
              <span className="text-muted-foreground">{commonMisconceptions[0]}</span>
            </div>
          </div>
        )}

        {/* Comparison Panels */}
        <div className="flex h-[calc(95vh-180px)]">
          {(viewMode === 'split' || viewMode === 'left-full') && (
            <div className={`${viewMode === 'split' ? 'w-1/2 border-r' : 'w-full'} flex flex-col`}>
              {renderStudentPanel(
                leftStudent,
                leftZoom,
                setLeftZoom,
                leftRotation,
                setLeftRotation,
                'left',
                viewMode === 'left-full'
              )}
            </div>
          )}
          
          {(viewMode === 'split' || viewMode === 'right-full') && (
            <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col`}>
              {renderStudentPanel(
                rightStudent,
                rightZoom,
                setRightZoom,
                rightRotation,
                setRightRotation,
                'right',
                viewMode === 'right-full'
              )}
            </div>
          )}
        </div>

        {/* Comparison Summary Footer */}
        {leftStudent && rightStudent && viewMode === 'split' && (
          <div className="p-3 border-t bg-muted/30">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Grade Difference</p>
                <p className="font-bold">
                  {Math.abs((leftStudent.result.grade || 0) - (rightStudent.result.grade || 0))} pts
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Same Approach</p>
                <p className="font-bold">
                  {leftStudent.result.approachAnalysis?.slice(0, 50) === rightStudent.result.approachAnalysis?.slice(0, 50) 
                    ? 'Yes' : 'Different'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Common Errors</p>
                <p className="font-bold">{commonMisconceptions.length}</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
