import { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle2, XCircle, Loader2, Clock, UserCircle, Sparkles, QrCode, RefreshCw, FileStack, Link, Unlink, Fingerprint, Eye, Save, ShieldCheck, Pencil, BarChart3, LinkIcon, GripVertical, ZoomIn, UserPlus, FilePlus2, RotateCcw, Play, Cloud } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BatchItem } from '@/hooks/useBatchAnalysis';
import { HandwritingComparisonDialog } from './HandwritingComparisonDialog';
import { MultiAnalysisBreakdownDialog } from './MultiAnalysisBreakdownDialog';
import { ManualLinkDialog } from './ManualLinkDialog';
import { BatchImageZoomDialog } from './BatchImageZoomDialog';
import { AddUnknownStudentDialog } from './AddUnknownStudentDialog';
import { SaveToDriveDialog } from './SaveToDriveDialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
}

interface BatchQueueProps {
  items: BatchItem[];
  students: Student[];
  classId?: string | null;
  onRemove: (id: string) => void;
  onAssignStudent: (itemId: string, studentId: string, studentName: string) => void;
  onStudentCreated?: (studentId: string, studentName: string) => void;
  onLinkContinuation?: (continuationId: string, primaryId: string) => void;
  onUnlinkContinuation?: (continuationId: string) => void;
  onUnlinkAllPages?: () => void;
  onConvertToSeparate?: (itemId: string) => void;
  onReorder?: (activeId: string, overId: string) => void;
  onSaveToGradebook?: () => Promise<void>;
  onSaveToDrive?: () => void;
  onOverrideGrade?: (itemId: string, newGrade: number, justification: string) => void;
  onSelectRunAsGrade?: (itemId: string, runIndex: number) => void;
  currentIndex: number;
  isProcessing: boolean;
  isIdentifying: boolean;
  isRestoredFromStorage?: boolean;
  isSaving?: boolean;
  allSaved?: boolean;
  driveSaved?: boolean;
}

// Sortable item wrapper component
function SortableItem({ 
  id, 
  disabled, 
  children 
}: { 
  id: string; 
  disabled: boolean; 
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted/50 rounded-l touch-none shrink-0"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low' | 'none') => {
  switch (confidence) {
    case 'high':
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
          High
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
          Medium
        </Badge>
      );
    case 'low':
      return (
        <Badge variant="destructive" className="text-xs">
          Low
        </Badge>
      );
    default:
      return null;
  }
};

export function BatchQueue({ 
  items, 
  students,
  classId,
  onRemove, 
  onAssignStudent,
  onStudentCreated,
  onLinkContinuation,
  onUnlinkContinuation,
  onUnlinkAllPages,
  onConvertToSeparate,
  onReorder,
  onSaveToGradebook,
  onSaveToDrive,
  onOverrideGrade,
  onSelectRunAsGrade,
  currentIndex, 
  isProcessing,
  isIdentifying,
  isRestoredFromStorage = false,
  isSaving = false,
  allSaved = false,
  driveSaved = false,
}: BatchQueueProps) {
  const [addStudentForItem, setAddStudentForItem] = useState<string | null>(null);
  const [showRestoredBanner, setShowRestoredBanner] = useState(isRestoredFromStorage);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Find first unanalyzed paper index
  const firstUnanalyzedIndex = items.findIndex(item => item.status === 'pending' || item.status === 'identifying');
  const hasUnanalyzedPapers = firstUnanalyzedIndex !== -1;
  const analyzedCount = items.filter(item => item.status === 'completed' || item.status === 'failed').length;
  
  // Scroll to first unanalyzed paper
  const scrollToFirstUnanalyzed = useCallback(() => {
    if (firstUnanalyzedIndex === -1) return;
    
    // Find the element with the data-index attribute
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    
    const targetElement = scrollArea.querySelector(`[data-item-index="${firstUnanalyzedIndex}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      targetElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        targetElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 2000);
    }
  }, [firstUnanalyzedIndex]);
  
  // Auto-dismiss the restored banner after 8 seconds (extended to give time for continue button)
  useEffect(() => {
    if (showRestoredBanner) {
      const timer = setTimeout(() => setShowRestoredBanner(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showRestoredBanner]);
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && onReorder) {
      onReorder(active.id as string, over.id as string);
    }
  };
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [overrideDialogItem, setOverrideDialogItem] = useState<BatchItem | null>(null);
  const [overrideGrade, setOverrideGrade] = useState('');
  const [overrideJustification, setOverrideJustification] = useState('');
  const [breakdownDialogItem, setBreakdownDialogItem] = useState<BatchItem | null>(null);
  const [manualLinkItem, setManualLinkItem] = useState<BatchItem | null>(null);
  const [zoomPreviewIndex, setZoomPreviewIndex] = useState<number | null>(null);

  // Get primary pages (not continuations)
  const primaryPages = items.filter(i => i.pageType !== 'continuation');
  
  // Check if there are any linked pages
  const hasLinkedPages = items.some(i => i.continuationPages && i.continuationPages.length > 0);
  
  // Check if all items are analyzed (completed or failed)
  const allAnalyzed = items.length > 0 && items.every(item => item.status === 'completed' || item.status === 'failed');
  const completedCount = items.filter(item => item.status === 'completed').length;

  const getStatusIcon = (status: BatchItem['status']) => {
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
    if (status === 'analyzing') return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    if (status === 'identifying') return <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusBadge = (item: BatchItem) => {
    if (item.status === 'completed' && item.result) {
      const pct = item.result.overriddenGrade ?? item.result.grade ?? item.result.totalScore.percentage;
      const variant = pct >= 80 ? 'default' : pct >= 60 ? 'secondary' : 'destructive';
      const hasMultiAnalysis = item.result.multiAnalysisGrades && item.result.multiAnalysisGrades.length > 1;
      const isOverridden = item.result.isOverridden;
      
      return (
        <div className="flex items-center gap-1">
          <Badge variant={variant} className={isOverridden ? 'ring-2 ring-amber-400' : ''}>
            {pct}%
            {isOverridden && <Pencil className="h-3 w-3 ml-1" />}
          </Badge>
          {hasMultiAnalysis && !isOverridden && item.result.confidenceScore && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      item.result.confidenceScore >= 85 ? 'border-green-500 text-green-600' :
                      item.result.confidenceScore >= 70 ? 'border-amber-500 text-amber-600' :
                      'border-red-500 text-red-600'
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3 mr-0.5" />
                    {item.result.confidenceScore}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Confidence based on {item.result.multiAnalysisGrades.length} analyses
                    <br />
                    Grades: {item.result.multiAnalysisGrades.join('%, ')}%
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
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
    <>
    <Card>
      <CardContent className="p-0">
        {/* Restored from session banner */}
        {showRestoredBanner && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <RotateCcw className="h-4 w-4" />
              <span className="text-sm font-medium">Session restored</span>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {analyzedCount} of {items.length} paper(s) already analyzed
              </span>
            </div>
            <div className="flex items-center gap-1">
              {hasUnanalyzedPapers && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    scrollToFirstUnanalyzed();
                    setShowRestoredBanner(false);
                  }}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Continue where you left off
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={() => setShowRestoredBanner(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        <div className="p-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{items.length} paper(s) in queue</span>
              {hasLinkedPages && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => setShowComparisonDialog(true)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview Links
                  </Button>
                  {onUnlinkAllPages && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              onUnlinkAllPages();
                              toast.success('All page links removed', { description: 'Each page can now be graded separately' });
                            }}
                          >
                            <Unlink className="h-3 w-3 mr-1" />
                            Unlink All
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Remove all page links and grade each page separately</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              )}
            </div>
            {isIdentifying && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Auto-identifying {currentIndex + 1} of {items.length}
              </span>
            )}
            {isProcessing && (
              <span className="text-xs text-muted-foreground">
                Analyzing {Math.max(1, currentIndex + 1)} of {items.length}
              </span>
            )}
          </div>
        </div>
        <ScrollArea className="h-[500px]" ref={scrollAreaRef}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y">
                {items.map((item, index) => {
                  const isPrimary = item.pageType === 'new' || !item.pageType;
                  const isContinuation = item.pageType === 'continuation';
                  const continuationCount = item.continuationPages?.length || 0;
                  const linkedPrimary = isContinuation && item.continuationOf 
                    ? items.find(i => i.id === item.continuationOf) 
                    : null;
                  const canDrag = !isBusy && onReorder;

                  return (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    disabled={!canDrag}
                  >
                    <div 
                      data-item-index={index}
                      className={`flex items-center gap-3 p-3 transition-all ${
                        item.status === 'analyzing' ? 'bg-primary/5' : 
                        item.status === 'identifying' ? 'bg-amber-50 dark:bg-amber-950/20' :
                        isContinuation ? 'bg-muted/30 border-l-4 border-l-blue-400 ml-2' : ''
                      }`}
                    >
                {/* Page type indicator */}
                {isContinuation && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-blue-600">
                          <Link className="h-4 w-4" />
                          {item.handwritingSimilarity && (
                            <Fingerprint className="h-3 w-3 text-blue-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Continuation of: {linkedPrimary?.studentName || 'previous paper'}
                          <br />
                          Will be graded together as one paper
                          {item.handwritingSimilarity && (
                            <>
                              <br />
                              <span className="text-muted-foreground">
                                Handwriting match: {item.handwritingSimilarity.similarityScore}% ({item.handwritingSimilarity.confidence})
                              </span>
                            </>
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Multi-page indicator for primary pages */}
                {isPrimary && continuationCount > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <FileStack className="h-4 w-4 text-blue-600" />
                          <span className="text-xs text-blue-600 font-medium">+{continuationCount}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Multi-page paper: {continuationCount + 1} pages total
                          <br />
                          Will be graded as one combined paper
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Position number */}
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                  {index + 1}
                </div>

                {/* Thumbnail - Clickable for zoom */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="relative h-12 w-12 rounded-md overflow-hidden bg-muted shrink-0 group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomPreviewIndex(index);
                        }}
                      >
                        <img 
                          src={item.imageDataUrl} 
                          alt={`Paper ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60 group-hover:bg-background/40 transition-colors">
                          {getStatusIcon(item.status)}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/0 group-hover:bg-primary/20 transition-colors">
                          <ZoomIn className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-xs">Click to zoom & match paper</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Student Selector with auto-assign indicator */}
                <div className="flex-1 min-w-0">
                  {!isBusy && (item.status === 'pending' || !item.result) ? (
                    <div className="flex flex-col gap-1">
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
                          <SelectContent className="max-h-[300px]">
                            <ScrollArea className="h-[280px]">
                              {/* Show ALL students, marking assigned ones */}
                              {students.length > 0 ? (
                                students.map((student) => {
                                  const isCurrentItem = item.studentId === student.id;
                                  const isAssignedElsewhere = !isCurrentItem && assignedStudentIds.includes(student.id);
                                  
                                  return (
                                    <SelectItem 
                                      key={student.id} 
                                      value={student.id}
                                      className={isAssignedElsewhere ? 'opacity-50' : ''}
                                    >
                                      {student.last_name}, {student.first_name}
                                      {student.student_id && ` (${student.student_id})`}
                                      {isCurrentItem && ' ✓'}
                                      {isAssignedElsewhere && ' (assigned)'}
                                    </SelectItem>
                                  );
                                })
                              ) : (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                  No students in class
                                </div>
                              )}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                        
                        {/* Add new student button when student not found */}
                        {classId && onStudentCreated && !item.studentId && (
                          <AddUnknownStudentDialog
                            classId={classId}
                            detectedName={item.identification?.handwrittenName}
                            onStudentCreated={(studentId, studentName) => {
                              onStudentCreated(studentId, studentName);
                              onAssignStudent(item.id, studentId, studentName);
                            }}
                            trigger={
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-9 w-9 shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-dashed"
                                    >
                                      <UserPlus className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Add new student to class</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            }
                          />
                        )}
                        
                        {/* Auto-assign indicator with confidence badge */}
                        {item.autoAssigned && item.identification && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="shrink-0 flex items-center gap-1">
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
                                    Click dropdown to correct if wrong
                                  </span>
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      
                      {/* Confidence badge row for auto-assigned items */}
                      {item.autoAssigned && item.identification && item.identification.confidence !== 'none' && (
                        <div className="flex items-center gap-2 ml-1">
                          {getConfidenceBadge(item.identification.confidence)}
                          <span className="text-xs text-muted-foreground">
                            {item.identification.qrCodeDetected ? 'QR match' : 'Name match'}
                          </span>
                          {item.identification.confidence !== 'high' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      // Clear the current assignment to allow correction
                                      onAssignStudent(item.id, '', '');
                                    }}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Fix
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Clear auto-match to manually select student</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
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
                      {/* Show confidence badge even after processing */}
                      {item.autoAssigned && item.identification && item.identification.confidence !== 'none' && (
                        <div className="flex items-center gap-2 ml-6">
                          {getConfidenceBadge(item.identification.confidence)}
                        </div>
                      )}
                    </div>
                  )}
                  {item.error && (
                    <p className="text-xs text-destructive truncate mt-1">{item.error}</p>
                  )}
                </div>

                {/* Status badge */}
                {getStatusBadge(item)}

                {/* Multi-analysis breakdown button - only for items with multiple analyses */}
                {!isBusy && item.status === 'completed' && item.result?.multiAnalysisResults && item.result.multiAnalysisResults.length > 1 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setBreakdownDialogItem(item)}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">View analysis breakdown ({item.result.multiAnalysisResults.length} runs)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Override button - only for completed items with results */}
                {!isBusy && item.status === 'completed' && item.result && onOverrideGrade && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => {
                            setOverrideDialogItem(item);
                            setOverrideGrade(String(item.result?.overriddenGrade ?? item.result?.grade ?? item.result?.totalScore.percentage ?? ''));
                            setOverrideJustification(item.result?.overrideJustification || '');
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Override grade</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Manual Link/Unlink buttons */}
                {!isBusy && (
                  <>
                    {/* Unlink and Convert buttons for continuation pages */}
                    {isContinuation && (
                      <div className="flex items-center gap-1">
                        {onUnlinkContinuation && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => {
                                    onUnlinkContinuation(item.id);
                                    toast.success('Page unlinked', { description: 'Now a separate paper' });
                                  }}
                                >
                                  <Unlink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Unlink - make separate paper</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {/* Convert to separate for grading */}
                        {onConvertToSeparate && item.status === 'completed' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-green-600 border-green-300 hover:bg-green-50"
                                  onClick={() => {
                                    onConvertToSeparate(item.id);
                                    toast.success('Converted to separate paper', { description: 'Can now be saved to gradebook individually' });
                                  }}
                                >
                                  <FilePlus2 className="h-3 w-3 mr-1" />
                                  Save Separately
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Convert to separate gradebook entry</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                    
                    {/* Link button for unlinked pages (non-continuation) */}
                    {!isContinuation && onLinkContinuation && items.length > 1 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setManualLinkItem(item)}
                            >
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Link as continuation of another paper</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                )}

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
                  </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>
        
        {/* Save options - shown immediately after all items analyzed */}
        {allAnalyzed && completedCount > 0 && (
          <div className="p-3 border-t bg-muted/30 space-y-2">
            {/* Save to Gradebook */}
            {onSaveToGradebook && (
              <Button
                variant={allSaved ? "outline" : "default"}
                className={allSaved 
                  ? "w-full bg-green-100 text-green-700 border-green-300 hover:bg-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" 
                  : "w-full bg-green-600 hover:bg-green-700"
                }
                onClick={onSaveToGradebook}
                disabled={isSaving || allSaved}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving to Gradebook...
                  </>
                ) : allSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Saved to Gradebook
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save All to Gradebook ({completedCount})
                  </>
                )}
              </Button>
            )}
            
            {/* Save to Google Drive */}
            {onSaveToDrive && (
              <Button
                variant={driveSaved ? "outline" : "secondary"}
                className={driveSaved 
                  ? "w-full bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" 
                  : "w-full"
                }
                onClick={onSaveToDrive}
                disabled={driveSaved}
              >
                {driveSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Saved to Drive
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4 mr-2" />
                    Save to Google Drive (for later)
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Handwriting Comparison Dialog */}
    <HandwritingComparisonDialog
      open={showComparisonDialog}
      onOpenChange={setShowComparisonDialog}
      items={items}
      onConfirmGroup={(primaryId, continuationIds) => {
        // Group is already confirmed, just close
        setShowComparisonDialog(false);
      }}
      onUnlinkPage={(continuationId) => {
        onUnlinkContinuation?.(continuationId);
      }}
    />

    {/* Grade Override Dialog */}
    <Dialog open={!!overrideDialogItem} onOpenChange={(open) => !open && setOverrideDialogItem(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-amber-600" />
            Override Grade
          </DialogTitle>
        </DialogHeader>
        {overrideDialogItem && (
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium">{overrideDialogItem.studentName || 'Student'}</p>
              {overrideDialogItem.result?.multiAnalysisGrades && overrideDialogItem.result.multiAnalysisGrades.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Original analysis grades: {overrideDialogItem.result.multiAnalysisGrades.join('%, ')}%
                  <br />
                  Averaged grade: {Math.round(overrideDialogItem.result.multiAnalysisGrades.reduce((a, b) => a + b, 0) / overrideDialogItem.result.multiAnalysisGrades.length)}%
                  <span className="ml-2">
                    (Confidence: {overrideDialogItem.result.confidenceScore}%)
                  </span>
                </p>
              )}
              {!overrideDialogItem.result?.multiAnalysisGrades && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current grade: {overrideDialogItem.result?.grade ?? overrideDialogItem.result?.totalScore.percentage}%
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="override-grade">New Grade (%)</Label>
              <Input
                id="override-grade"
                type="number"
                min="0"
                max="100"
                value={overrideGrade}
                onChange={(e) => setOverrideGrade(e.target.value)}
                placeholder="Enter new grade (0-100)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="override-justification">Justification (required)</Label>
              <Textarea
                id="override-justification"
                value={overrideJustification}
                onChange={(e) => setOverrideJustification(e.target.value)}
                placeholder="Explain why you're overriding this grade..."
                rows={3}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOverrideDialogItem(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (overrideDialogItem && overrideGrade && overrideJustification) {
                const grade = parseInt(overrideGrade, 10);
                if (!isNaN(grade) && grade >= 0 && grade <= 100) {
                  onOverrideGrade?.(overrideDialogItem.id, grade, overrideJustification);
                  setOverrideDialogItem(null);
                }
              }
            }}
            disabled={!overrideGrade || !overrideJustification}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Save Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Multi-Analysis Breakdown Dialog */}
    <MultiAnalysisBreakdownDialog
      open={!!breakdownDialogItem}
      onOpenChange={(open) => !open && setBreakdownDialogItem(null)}
      studentName={breakdownDialogItem?.studentName}
      result={breakdownDialogItem?.result || null}
      itemId={breakdownDialogItem?.id}
      onSelectRun={onSelectRunAsGrade}
    />

    {/* Manual Link Dialog */}
    <ManualLinkDialog
      open={!!manualLinkItem}
      onOpenChange={(open) => !open && setManualLinkItem(null)}
      continuationItem={manualLinkItem}
      items={items}
      onLink={(continuationId, primaryId) => {
        onLinkContinuation?.(continuationId, primaryId);
        setManualLinkItem(null);
      }}
    />

    {/* Zoom Preview Dialog */}
    {zoomPreviewIndex !== null && items[zoomPreviewIndex] && (
      <BatchImageZoomDialog
        open={zoomPreviewIndex !== null}
        onOpenChange={(open) => !open && setZoomPreviewIndex(null)}
        imageUrl={items[zoomPreviewIndex].imageDataUrl}
        studentName={items[zoomPreviewIndex].studentName || 'Unassigned'}
        paperIndex={zoomPreviewIndex}
        totalPapers={items.length}
        misconceptions={items[zoomPreviewIndex].result?.misconceptions}
        grade={items[zoomPreviewIndex].result?.grade}
        studentId={items[zoomPreviewIndex].studentId}
        topicName={items[zoomPreviewIndex].worksheetTopic || items[zoomPreviewIndex].result?.problemIdentified || 'Unknown Topic'}
        onNavigate={(direction) => {
          if (direction === 'prev' && zoomPreviewIndex > 0) {
            setZoomPreviewIndex(zoomPreviewIndex - 1);
          } else if (direction === 'next' && zoomPreviewIndex < items.length - 1) {
            setZoomPreviewIndex(zoomPreviewIndex + 1);
          }
        }}
      />
    )}
    </>
  );
}
