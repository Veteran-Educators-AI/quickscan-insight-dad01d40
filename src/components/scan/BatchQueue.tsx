import { useState } from 'react';
import { X, CheckCircle2, XCircle, Loader2, Clock, UserCircle, Sparkles, QrCode, RefreshCw, FileStack, Link, Unlink, Fingerprint, Eye, Save, ShieldCheck, Pencil, BarChart3, LinkIcon } from 'lucide-react';
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
import { BatchItem } from '@/hooks/useBatchAnalysis';
import { HandwritingComparisonDialog } from './HandwritingComparisonDialog';
import { MultiAnalysisBreakdownDialog } from './MultiAnalysisBreakdownDialog';
import { ManualLinkDialog } from './ManualLinkDialog';

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
  onLinkContinuation?: (continuationId: string, primaryId: string) => void;
  onUnlinkContinuation?: (continuationId: string) => void;
  onSaveToGradebook?: () => Promise<void>;
  onOverrideGrade?: (itemId: string, newGrade: number, justification: string) => void;
  onSelectRunAsGrade?: (itemId: string, runIndex: number) => void;
  currentIndex: number;
  isProcessing: boolean;
  isIdentifying: boolean;
  isSaving?: boolean;
  allSaved?: boolean;
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
  onRemove, 
  onAssignStudent,
  onLinkContinuation,
  onUnlinkContinuation,
  onSaveToGradebook,
  onOverrideGrade,
  onSelectRunAsGrade,
  currentIndex, 
  isProcessing,
  isIdentifying,
  isSaving = false,
  allSaved = false,
}: BatchQueueProps) {
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [overrideDialogItem, setOverrideDialogItem] = useState<BatchItem | null>(null);
  const [overrideGrade, setOverrideGrade] = useState('');
  const [overrideJustification, setOverrideJustification] = useState('');
  const [breakdownDialogItem, setBreakdownDialogItem] = useState<BatchItem | null>(null);
  const [manualLinkItem, setManualLinkItem] = useState<BatchItem | null>(null);

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
        <div className="p-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{items.length} paper(s) in queue</span>
              {hasLinkedPages && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => setShowComparisonDialog(true)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview Links
                </Button>
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
        <ScrollArea className="h-[500px]">
          <div className="divide-y">
            {items.map((item, index) => {
              const isPrimary = item.pageType === 'new' || !item.pageType;
              const isContinuation = item.pageType === 'continuation';
              const continuationCount = item.continuationPages?.length || 0;
              const linkedPrimary = isContinuation && item.continuationOf 
                ? items.find(i => i.id === item.continuationOf) 
                : null;

              return (
              <div 
                key={item.id}
                className={`flex items-center gap-3 p-3 ${
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
                    {/* Unlink button for continuation pages */}
                    {isContinuation && onUnlinkContinuation && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => onUnlinkContinuation(item.id)}
                            >
                              <Unlink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Unlink from primary paper</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
              );
            })}
          </div>
        </ScrollArea>
        
        {/* Save to Gradebook button - shown immediately after all items analyzed */}
        {allAnalyzed && completedCount > 0 && onSaveToGradebook && (
          <div className="p-3 border-t bg-green-50 dark:bg-green-950/20">
            <Button
              variant={allSaved ? "outline" : "default"}
              className={allSaved 
                ? "w-full bg-green-100 text-green-700 border-green-300 hover:bg-green-200" 
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
    </>
  );
}
