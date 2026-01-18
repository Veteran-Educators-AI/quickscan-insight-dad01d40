import { useState } from 'react';
import { Check, X, Trash2, RefreshCw, Eye, Search, ImageIcon, Clock, CheckCircle, XCircle, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAIImageLibrary, AIGeneratedImage } from '@/hooks/useAIImageLibrary';
import { formatDistanceToNow } from 'date-fns';

interface AIImageReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage?: (imageUrl: string, imageId: string) => void;
  selectionMode?: boolean;
  topicFilter?: string;
}

export function AIImageReviewDialog({
  open,
  onOpenChange,
  onSelectImage,
  selectionMode = false,
  topicFilter,
}: AIImageReviewDialogProps) {
  const {
    pendingImages,
    approvedImages,
    isLoading,
    approveImage,
    rejectImage,
    deleteImage,
    fetchImages,
    searchApprovedImages,
    incrementUsage,
  } = useAIImageLibrary();

  const [activeTab, setActiveTab] = useState<string>(selectionMode ? 'approved' : 'pending');
  const [selectedImage, setSelectedImage] = useState<AIGeneratedImage | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState(topicFilter || '');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const filteredApprovedImages = searchQuery
    ? searchApprovedImages(searchQuery)
    : approvedImages;

  const handleApprove = async (image: AIGeneratedImage) => {
    setIsProcessing(image.id);
    await approveImage(image.id);
    setIsProcessing(null);
  };

  const handleReject = async () => {
    if (!selectedImage) return;
    setIsProcessing(selectedImage.id);
    await rejectImage(selectedImage.id, rejectionReason);
    setShowRejectDialog(false);
    setRejectionReason('');
    setSelectedImage(null);
    setIsProcessing(null);
  };

  const handleDelete = async (image: AIGeneratedImage) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    setIsProcessing(image.id);
    await deleteImage(image.id);
    setIsProcessing(null);
  };

  const handleSelectForUse = async (image: AIGeneratedImage) => {
    if (onSelectImage) {
      await incrementUsage(image.id);
      onSelectImage(image.image_url, image.id);
      onOpenChange(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return null;
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      worksheet: 'bg-blue-50 text-blue-700 border-blue-300',
      presentation: 'bg-purple-50 text-purple-700 border-purple-300',
      clipart: 'bg-orange-50 text-orange-700 border-orange-300',
      manual: 'bg-gray-50 text-gray-700 border-gray-300',
    };
    return <Badge variant="outline" className={colors[source] || colors.manual}>{source}</Badge>;
  };

  const ImageCard = ({ image, showActions = true }: { image: AIGeneratedImage; showActions?: boolean }) => (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
      <div className="relative aspect-square bg-muted">
        <img
          src={image.image_url}
          alt={image.prompt}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        {isProcessing === image.id && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        {selectionMode && image.status === 'approved' && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button onClick={() => handleSelectForUse(image)} className="gap-2">
              <Check className="w-4 h-4" /> Use This Image
            </Button>
          </div>
        )}
      </div>
      <CardContent className="p-3 space-y-2">
        <p className="text-xs text-muted-foreground line-clamp-2">{image.prompt}</p>
        <div className="flex flex-wrap gap-1">
          {getStatusBadge(image.status)}
          {getSourceBadge(image.source)}
        </div>
        {image.topic && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="w-3 h-3" />
            {image.topic}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(image.created_at), { addSuffix: true })}
        </p>
        {image.usage_count > 0 && (
          <p className="text-xs text-muted-foreground">Used {image.usage_count} time{image.usage_count > 1 ? 's' : ''}</p>
        )}
        
        {showActions && image.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => handleApprove(image)}
              disabled={isProcessing === image.id}
              className="flex-1 gap-1"
            >
              <Check className="w-3 h-3" /> Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setSelectedImage(image);
                setShowRejectDialog(true);
              }}
              disabled={isProcessing === image.id}
              className="flex-1 gap-1"
            >
              <X className="w-3 h-3" /> Reject
            </Button>
          </div>
        )}
        
        {showActions && image.status !== 'pending' && (
          <div className="flex gap-2 pt-2">
            {selectionMode && image.status === 'approved' && (
              <Button
                size="sm"
                onClick={() => handleSelectForUse(image)}
                className="flex-1 gap-1"
              >
                <Check className="w-3 h-3" /> Select
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(image)}
              disabled={isProcessing === image.id}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              {selectionMode ? 'Select Image from Library' : 'AI Image Review'}
            </DialogTitle>
            <DialogDescription>
              {selectionMode
                ? 'Choose an approved image from your library to use in your worksheet or presentation.'
                : 'Review and approve AI-generated images before they can be used in worksheets.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="pending" className="gap-1">
                  <Clock className="w-4 h-4" />
                  Pending
                  {pendingImages.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {pendingImages.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Approved
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by topic, prompt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchImages} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <TabsContent value="pending" className="mt-0">
              <ScrollArea className="h-[500px]">
                {pendingImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mb-4 text-green-500" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-sm">No images pending review.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
                    {pendingImages.map((image) => (
                      <ImageCard key={image.id} image={image} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="approved" className="mt-0">
              <ScrollArea className="h-[500px]">
                {filteredApprovedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mb-4" />
                    <p className="text-lg font-medium">No approved images</p>
                    <p className="text-sm">Approved images will appear here for reuse.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
                    {filteredApprovedImages.map((image) => (
                      <ImageCard key={image.id} image={image} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Image</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedImage && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={selectedImage.image_url}
                  alt="Image to reject"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason (optional)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., Image is not appropriate, poor quality, wrong subject..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing !== null}
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Reject Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
