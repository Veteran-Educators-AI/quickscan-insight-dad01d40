import { X, CheckCircle2, XCircle, Loader2, Clock, UserCircle, Sparkles, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BatchItem } from '@/hooks/useBatchAnalysis';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
}

interface BatchQueueProps {
  items: BatchItem[];
  students: Student[];
  onRemove: (id: string) => void;
  onAssignStudent: (itemId: string, studentId: string, studentName: string) => void;
  currentIndex: number;
  isProcessing: boolean;
  isIdentifying: boolean;
}

export function BatchQueue({ 
  items, 
  students, 
  onRemove, 
  onAssignStudent, 
  currentIndex, 
  isProcessing,
  isIdentifying,
}: BatchQueueProps) {

  const getStatusIcon = (status: BatchItem['status']) => {
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
    if (status === 'analyzing') return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    if (status === 'identifying') return <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusBadge = (item: BatchItem) => {
    if (item.status === 'completed' && item.result) {
      const pct = item.result.totalScore.percentage;
      const variant = pct >= 80 ? 'default' : pct >= 60 ? 'secondary' : 'destructive';
      return <Badge variant={variant}>{pct}%</Badge>;
    }
    if (item.status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (item.status === 'analyzing') {
      return <Badge variant="outline">Analyzing...</Badge>;
    }
    if (item.status === 'identifying') {
      return <Badge variant="outline" className="text-amber-600">Identifying...</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  // Get unassigned students (not yet assigned to any item)
  const assignedStudentIds = items.map(item => item.studentId).filter(Boolean);
  const availableStudents = students.filter(s => !assignedStudentIds.includes(s.id));

  const isBusy = isProcessing || isIdentifying;

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>No papers in queue. Add images to start batch scanning.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{items.length} paper(s) in queue</span>
            {isIdentifying && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Auto-identifying {currentIndex + 1} of {items.length}
              </span>
            )}
            {isProcessing && (
              <span className="text-xs text-muted-foreground">
                Analyzing {currentIndex + 1} of {items.length}
              </span>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          <div className="divide-y">
            {items.map((item, index) => (
              <div 
                key={item.id}
                className={`flex items-center gap-3 p-3 ${
                  item.status === 'analyzing' ? 'bg-primary/5' : 
                  item.status === 'identifying' ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                }`}
              >
                {/* Thumbnail */}
                <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted shrink-0">
                  <img 
                    src={item.imageDataUrl} 
                    alt={`Paper ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    {getStatusIcon(item.status)}
                  </div>
                </div>

                {/* Student Selector with auto-assign indicator */}
                <div className="flex-1 min-w-0">
                  {!isBusy && (item.status === 'pending' || !item.result) ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={item.studentId || ''}
                        onValueChange={(value) => {
                          const student = students.find(s => s.id === value);
                          if (student) {
                            onAssignStudent(
                              item.id, 
                              student.id, 
                              `${student.first_name} ${student.last_name}`
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 flex-1">
                          <SelectValue placeholder="Assign student...">
                            {item.studentName && (
                              <span className="flex items-center gap-2">
                                <UserCircle className="h-4 w-4" />
                                {item.studentName}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {/* Current student if assigned */}
                          {item.studentId && (
                            <SelectItem value={item.studentId}>
                              {item.studentName} (current)
                            </SelectItem>
                          )}
                          {/* Available students */}
                          {availableStudents.length > 0 ? (
                            availableStudents.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.last_name}, {student.first_name}
                                {student.student_id && ` (${student.student_id})`}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              All students assigned
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      
                      {/* Auto-assign indicator */}
                      {item.autoAssigned && item.identification && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="shrink-0">
                                {item.identification.qrCodeDetected ? (
                                  <QrCode className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Sparkles className="h-4 w-4 text-amber-500" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[250px]">
                              <p className="text-xs">
                                {item.identification.qrCodeDetected 
                                  ? `Matched via QR code` 
                                  : `Matched via name: "${item.identification.handwrittenName}"`}
                                {item.identification.parsedQRCode && (
                                  <>
                                    <br />
                                    <span className="text-muted-foreground">
                                      Question ID detected
                                    </span>
                                  </>
                                )}
                                <br />
                                <span className="text-muted-foreground">
                                  Confidence: {item.identification.confidence}
                                </span>
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">
                        {item.studentName || 'Unassigned'}
                      </span>
                      {item.autoAssigned && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Sparkles className="h-3 w-3 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Auto-assigned</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  )}
                  {item.error && (
                    <p className="text-xs text-destructive truncate mt-1">{item.error}</p>
                  )}
                </div>

                {/* Status badge */}
                {getStatusBadge(item)}

                {/* Remove button */}
                {!isBusy && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => onRemove(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
