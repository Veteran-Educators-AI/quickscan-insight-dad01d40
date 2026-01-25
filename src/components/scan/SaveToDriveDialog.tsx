import { useState, useEffect } from 'react';
import { Folder, FolderPlus, ChevronRight, ChevronUp, Home, Loader2, Cloud, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGoogleDrive, DriveFolder } from '@/hooks/useGoogleDrive';
import { toast } from 'sonner';

interface SaveToDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: { blob: Blob; name: string }[];
  onSaveComplete?: (savedCount: number, folderName: string) => void;
}

export function SaveToDriveDialog({
  open,
  onOpenChange,
  files,
  onSaveComplete,
}: SaveToDriveDialogProps) {
  const {
    loading,
    connected,
    folders,
    currentPath,
    checkConnection,
    fetchFolders,
    navigateToFolder,
    navigateUp,
    navigateToRoot,
    createFolder,
    uploadMultipleFiles,
  } = useGoogleDrive();

  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Check connection and load root folders when dialog opens
  useEffect(() => {
    if (open) {
      checkConnection().then((isConnected) => {
        if (isConnected) {
          fetchFolders('root');
        }
      });
    }
  }, [open, checkConnection, fetchFolders]);

  const handleFolderClick = (folder: DriveFolder) => {
    setSelectedFolder(folder);
  };

  const handleFolderDoubleClick = (folder: DriveFolder) => {
    setSelectedFolder(null);
    navigateToFolder(folder);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setCreatingFolder(true);
    try {
      const parentId = currentPath.length > 0 
        ? currentPath[currentPath.length - 1].id 
        : 'root';
      
      const folderId = await createFolder(newFolderName.trim(), parentId);
      if (folderId) {
        toast.success(`Folder "${newFolderName}" created`);
        setNewFolderName('');
        setShowNewFolder(false);
        // Refresh folder list
        await fetchFolders(parentId);
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSave = async () => {
    if (files.length === 0) {
      toast.error('No files to save');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      const targetFolderId = selectedFolder?.id || 
        (currentPath.length > 0 ? currentPath[currentPath.length - 1].id : 'root');
      
      const folderName = selectedFolder?.name || 
        (currentPath.length > 0 ? currentPath[currentPath.length - 1].name : 'My Drive');

      const results = await uploadMultipleFiles(
        files,
        targetFolderId,
        (current, total) => setUploadProgress({ current, total })
      );

      const successCount = results.filter(r => r.fileId !== null).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`Saved ${successCount} file(s) to "${folderName}" on Google Drive`);
        onSaveComplete?.(successCount, folderName);
        onOpenChange(false);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to upload ${failCount} file(s)`);
      }
    } catch (err) {
      console.error('Error saving to Drive:', err);
      toast.error('Failed to save files to Google Drive');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const currentFolderName = currentPath.length > 0 
    ? currentPath[currentPath.length - 1].name 
    : 'My Drive';

  if (!connected) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Save to Google Drive
            </DialogTitle>
            <DialogDescription>
              Connect to Google Drive to save scanned work for later reanalysis
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Sign in with Google to access your Drive
            </p>
            <p className="text-sm text-muted-foreground">
              Use the Google Connection panel in the scanning area to connect
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            Save to Google Drive
          </DialogTitle>
          <DialogDescription>
            Select a folder to save {files.length} scanned file(s) for later reanalysis
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-1 text-sm border-b pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={navigateToRoot}
          >
            <Home className="h-4 w-4" />
          </Button>
          {currentPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  // Navigate to this folder
                  const newPath = currentPath.slice(0, index + 1);
                  navigateToFolder(folder);
                }}
              >
                {folder.name}
              </Button>
            </div>
          ))}
        </div>

        {/* Folder list */}
        <ScrollArea className="h-[250px] border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {/* Go up button */}
              {currentPath.length > 0 && (
                <button
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                  onClick={navigateUp}
                >
                  <ChevronUp className="h-4 w-4" />
                  <span className="text-sm">Go up</span>
                </button>
              )}

              {/* Current folder selection */}
              <button
                className={`w-full flex items-center gap-2 p-2 rounded-md text-left ${
                  !selectedFolder ? 'bg-primary/10 border border-primary' : 'hover:bg-accent'
                }`}
                onClick={() => setSelectedFolder(null)}
              >
                <Folder className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">{currentFolderName}</span>
                {!selectedFolder && <Check className="h-4 w-4 ml-auto text-primary" />}
              </button>

              {/* Subfolders */}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className={`w-full flex items-center gap-2 p-2 rounded-md text-left ${
                    selectedFolder?.id === folder.id 
                      ? 'bg-primary/10 border border-primary' 
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => handleFolderClick(folder)}
                  onDoubleClick={() => handleFolderDoubleClick(folder)}
                >
                  <Folder className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">{folder.name}</span>
                  {selectedFolder?.id === folder.id && (
                    <Check className="h-4 w-4 ml-auto text-primary" />
                  )}
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </button>
              ))}

              {folders.length === 0 && currentPath.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No subfolders
                </p>
              )}
            </div>
          )}
        </ScrollArea>

        {/* New folder creation */}
        {showNewFolder ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="New folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              disabled={creatingFolder}
            />
            <Button 
              size="sm" 
              onClick={handleCreateFolder}
              disabled={creatingFolder || !newFolderName.trim()}
            >
              {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName('');
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setShowNewFolder(true)}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              Saving to: <span className="font-medium">{selectedFolder?.name || currentFolderName}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading {uploadProgress.current}/{uploadProgress.total}
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4 mr-2" />
                    Save {files.length} File(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
