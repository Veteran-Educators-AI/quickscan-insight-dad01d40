import { useState, useEffect } from 'react';
import { 
  Cloud, Folder, ChevronRight, ArrowLeft, Home, 
  RefreshCw, Loader2, Check, Image, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useGoogleDrive, DriveFile, DriveFolder } from '@/hooks/useGoogleDrive';

interface GoogleDriveImportProps {
  onFilesSelected: (files: { blob: Blob; name: string }[]) => void;
  onClose: () => void;
}

export function GoogleDriveImport({ onFilesSelected, onClose }: GoogleDriveImportProps) {
  const {
    loading,
    connected,
    folders,
    files,
    currentPath,
    checkConnection,
    fetchFolders,
    navigateToFolder,
    navigateUp,
    navigateToRoot,
    downloadMultipleFiles,
    refreshCurrentFolder,
  } = useGoogleDrive();

  const [initialized, setInitialized] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const init = async () => {
      const isConnected = await checkConnection();
      if (isConnected) {
        await fetchFolders('root');
      }
      setInitialized(true);
    };
    init();
  }, [checkConnection, fetchFolders]);

  const toggleFileSelection = (fileId: string, index: number, shiftKey: boolean) => {
    if (shiftKey && lastClickedIndex !== null) {
      // Shift-click: select all files in range
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeFileIds = files.slice(start, end + 1).map(f => f.id);
      
      setSelectedFiles(prev => {
        const next = new Set(prev);
        rangeFileIds.forEach(id => next.add(id));
        return next;
      });
    } else {
      // Normal click: toggle single file
      setSelectedFiles(prev => {
        const next = new Set(prev);
        if (next.has(fileId)) {
          next.delete(fileId);
        } else {
          next.add(fileId);
        }
        return next;
      });
      setLastClickedIndex(index);
    }
  };

  const selectAll = () => {
    setSelectedFiles(new Set(files.map(f => f.id)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleImport = async () => {
    if (selectedFiles.size === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: selectedFiles.size });

    try {
      const downloaded = await downloadMultipleFiles(
        Array.from(selectedFiles),
        (current, total) => setDownloadProgress({ current, total })
      );

      if (downloaded.length > 0) {
        onFilesSelected(downloaded.map(d => ({ blob: d.blob, name: d.name })));
        toast.success(`Imported ${downloaded.length} files from Google Drive`);
      } else {
        toast.error('Failed to download files');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Error importing files');
    } finally {
      setIsDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  const handleFolderClick = async (folder: DriveFolder) => {
    setSelectedFiles(new Set());
    await navigateToFolder(folder);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (size?: string) => {
    if (!size) return '';
    const bytes = parseInt(size, 10);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (date.getFullYear() !== now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!initialized) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Google Drive Import</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Cloud className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">Not Connected to Google Drive</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            To import scans from Google Drive, please sign in with Google first. 
            Your scanner can save directly to Drive for seamless import.
          </p>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Google Drive Import</CardTitle>
            {files.length > 0 && (
              <Badge variant="secondary">{files.length} files</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshCurrentFolder}
            disabled={loading || !currentPath.length}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1 text-sm overflow-x-auto pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={navigateToRoot}
            disabled={loading || currentPath.length === 0}
          >
            <Home className="h-4 w-4" />
          </Button>
          {currentPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className={cn(
                "px-2 py-0.5 rounded",
                index === currentPath.length - 1 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground"
              )}>
                {folder.name}
              </span>
            </div>
          ))}
        </div>

        {/* Back Button */}
        {currentPath.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={navigateUp}
            disabled={loading}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}

        {/* Folders and Files */}
        <ScrollArea className="h-[350px] border rounded-lg">
          <div className="p-2 space-y-1">
            {/* Folders */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <Folder className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                <span className="truncate">{folder.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0" />
              </button>
            ))}

            {/* Separator between folders and files */}
            {folders.length > 0 && files.length > 0 && (
              <Separator className="my-2" />
            )}

            {/* Files */}
            {files.map((file, index) => (
              <div
                key={file.id}
                onClick={(e) => toggleFileSelection(file.id, index, e.shiftKey)}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer select-none",
                  selectedFiles.has(file.id) && "bg-primary/10 border border-primary/30"
                )}
              >
              <Checkbox
                  checked={selectedFiles.has(file.id)}
                  onCheckedChange={() => {}}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFileSelection(file.id, index, e.shiftKey);
                  }}
                />
                {file.thumbnailLink ? (
                  <img 
                    src={file.thumbnailLink} 
                    alt={file.name}
                    className="h-10 w-10 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center bg-muted rounded flex-shrink-0">
                    {getFileIcon(file.mimeType)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm">{file.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{formatFileSize(file.size)}</span>
                    {file.modifiedTime && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{formatDate(file.modifiedTime)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {folders.length === 0 && files.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                {currentPath.length === 0 
                  ? 'No folders found in your Drive root'
                  : 'No image files in this folder'}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Selection Controls */}
        {files.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {selectedFiles.size} selected
            </span>
          </div>
        )}

        {/* Download Progress */}
        {isDownloading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Downloading {downloadProgress.current} of {downloadProgress.total}...</span>
            </div>
            <Progress 
              value={(downloadProgress.current / downloadProgress.total) * 100} 
              className="h-2" 
            />
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedFiles.size === 0 || isDownloading}
          >
            <Check className="h-4 w-4 mr-2" />
            Import {selectedFiles.size} Files
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
