import { useState } from 'react';
import { Link, FileStack, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { BatchItem } from '@/hooks/useBatchAnalysis';

interface ManualLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  continuationItem: BatchItem | null;
  items: BatchItem[];
  onLink: (continuationId: string, primaryId: string) => void;
}

export function ManualLinkDialog({
  open,
  onOpenChange,
  continuationItem,
  items,
  onLink,
}: ManualLinkDialogProps) {
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>('');

  // Get available primary pages (not continuations, not this item)
  const availablePrimaries = items.filter(
    item => 
      item.id !== continuationItem?.id && 
      item.pageType !== 'continuation'
  );

  const handleLink = () => {
    if (continuationItem && selectedPrimaryId) {
      onLink(continuationItem.id, selectedPrimaryId);
      setSelectedPrimaryId('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedPrimaryId('');
    }
    onOpenChange(newOpen);
  };

  if (!continuationItem) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-blue-600" />
            Link Page to Primary Paper
          </DialogTitle>
          <DialogDescription>
            Select the primary paper that this page belongs to. They will be graded together as one submission.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Current page preview */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="h-16 w-16 rounded-md overflow-hidden bg-background shrink-0">
              <img
                src={continuationItem.imageDataUrl}
                alt="Page to link"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-medium">Page to link</p>
              <p className="text-xs text-muted-foreground">
                {continuationItem.studentName || 'Unassigned student'}
              </p>
            </div>
          </div>

          {/* Primary paper selection */}
          <div className="space-y-2">
            <Label>Select primary paper</Label>
            {availablePrimaries.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                No available primary papers to link to.
              </p>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg">
                <RadioGroup
                  value={selectedPrimaryId}
                  onValueChange={setSelectedPrimaryId}
                  className="p-2 space-y-2"
                >
                  {availablePrimaries.map((item) => {
                    const continuationCount = item.continuationPages?.length || 0;
                    
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedPrimaryId === item.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-transparent hover:bg-muted'
                        }`}
                        onClick={() => setSelectedPrimaryId(item.id)}
                      >
                        <RadioGroupItem value={item.id} id={item.id} />
                        
                        <div className="h-12 w-12 rounded-md overflow-hidden bg-muted shrink-0">
                          <img
                            src={item.imageDataUrl}
                            alt="Primary paper"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.studentName || 'Unassigned'}
                          </p>
                          <div className="flex items-center gap-2">
                            {item.status === 'completed' && item.result && (
                              <Badge variant="outline" className="text-xs">
                                {item.result.grade ?? item.result.totalScore.percentage}%
                              </Badge>
                            )}
                            {continuationCount > 0 && (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <FileStack className="h-3 w-3" />
                                +{continuationCount} linked
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {selectedPrimaryId === item.id && (
                          <Check className="h-4 w-4 text-blue-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedPrimaryId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Link className="h-4 w-4 mr-2" />
            Link Pages
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
