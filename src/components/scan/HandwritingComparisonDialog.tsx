import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Fingerprint, Link, Unlink, ChevronLeft, ChevronRight, Check, X, FileStack } from 'lucide-react';
import { BatchItem } from '@/hooks/useBatchAnalysis';

interface LinkedGroup {
  primary: BatchItem;
  continuations: BatchItem[];
}

interface HandwritingComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: BatchItem[];
  onConfirmGroup: (primaryId: string, continuationIds: string[]) => void;
  onUnlinkPage: (continuationId: string) => void;
}

export function HandwritingComparisonDialog({
  open,
  onOpenChange,
  items,
  onConfirmGroup,
  onUnlinkPage,
}: HandwritingComparisonDialogProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  // Build linked groups from items
  const linkedGroups: LinkedGroup[] = items
    .filter(item => item.pageType === 'new' || (!item.pageType && item.continuationPages?.length))
    .filter(item => item.continuationPages && item.continuationPages.length > 0)
    .map(primary => ({
      primary,
      continuations: items.filter(i => primary.continuationPages?.includes(i.id)),
    }));

  const currentGroup = linkedGroups[currentGroupIndex];
  const hasGroups = linkedGroups.length > 0;

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-600 hover:bg-green-700">High Confidence</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Medium Confidence</Badge>;
      case 'low':
        return <Badge variant="destructive">Low Confidence</Badge>;
    }
  };

  const handleConfirmCurrentGroup = () => {
    if (currentGroup) {
      onConfirmGroup(
        currentGroup.primary.id,
        currentGroup.continuations.map(c => c.id)
      );
    }
  };

  const handleUnlinkContinuation = (continuationId: string) => {
    onUnlinkPage(continuationId);
  };

  if (!hasGroups) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileStack className="h-5 w-5" />
              No Linked Pages Found
            </DialogTitle>
            <DialogDescription>
              No multi-page papers have been detected. Use the "Group Two-Sided Papers" button to automatically detect and link pages with similar handwriting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Verify Handwriting Grouping
          </DialogTitle>
          <DialogDescription>
            Review the linked pages to ensure they belong to the same student. 
            Pages are grouped based on handwriting similarity analysis.
          </DialogDescription>
        </DialogHeader>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentGroupIndex(i => Math.max(0, i - 1))}
            disabled={currentGroupIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Group {currentGroupIndex + 1} of {linkedGroups.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentGroupIndex(i => Math.min(linkedGroups.length - 1, i + 1))}
            disabled={currentGroupIndex === linkedGroups.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {currentGroup && (
          <>
            {/* Student info */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">
                {currentGroup.primary.studentName || 'Unassigned Student'}
              </span>
              <Badge variant="outline">
                {currentGroup.continuations.length + 1} pages
              </Badge>
            </div>

            {/* Side-by-side comparison */}
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Primary page */}
                <Card className="border-2 border-primary">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default">Page 1 (Primary)</Badge>
                    </div>
                    <div className="aspect-[3/4] bg-muted rounded-md overflow-hidden">
                      <img
                        src={currentGroup.primary.imageDataUrl}
                        alt="Primary page"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Continuation pages */}
                {currentGroup.continuations.map((continuation, idx) => (
                  <Card key={continuation.id} className="border-2 border-blue-400">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            Page {idx + 2}
                          </Badge>
                          <Link className="h-4 w-4 text-blue-600" />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:text-destructive"
                          onClick={() => handleUnlinkContinuation(continuation.id)}
                        >
                          <Unlink className="h-3 w-3 mr-1" />
                          Unlink
                        </Button>
                      </div>
                      
                      <div className="aspect-[3/4] bg-muted rounded-md overflow-hidden mb-2">
                        <img
                          src={continuation.imageDataUrl}
                          alt={`Page ${idx + 2}`}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Similarity info */}
                      {continuation.handwritingSimilarity && (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Match Score:</span>
                            <span className="font-medium">
                              {continuation.handwritingSimilarity.similarityScore}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Confidence:</span>
                            {getConfidenceBadge(continuation.handwritingSimilarity.confidence)}
                          </div>
                          {continuation.handwritingSimilarity.reasoning && (
                            <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                              {continuation.handwritingSimilarity.reasoning}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleConfirmCurrentGroup} className="gap-2">
            <Check className="h-4 w-4" />
            Confirm This Grouping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
