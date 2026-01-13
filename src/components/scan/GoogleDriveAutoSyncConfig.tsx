import { useState, useEffect } from 'react';
import { 
  Cloud, Folder, ChevronRight, ArrowLeft, Home, 
  RefreshCw, Loader2, Check, Settings2, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useGoogleDrive, DriveFolder } from '@/hooks/useGoogleDrive';

interface GoogleDriveAutoSyncConfigProps {
  onFolderSelected: (folderId: string, folderName: string, intervalSeconds: number) => void;
  onClose: () => void;
  currentFolderId?: string;
}

export function GoogleDriveAutoSyncConfig({ 
  onFolderSelected, 
  onClose,
  currentFolderId 
}: GoogleDriveAutoSyncConfigProps) {
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
  } = useGoogleDrive();

  const [initialized, setInitialized] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null);
  const [syncInterval, setSyncInterval] = useState('30');

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

  const handleFolderClick = async (folder: DriveFolder) => {
    await navigateToFolder(folder);
  };

  const handleSelectCurrentFolder = () => {
    if (currentPath.length === 0) {
      toast.error('Please navigate into a folder first');
      return;
    }
    
    const currentFolder = currentPath[currentPath.length - 1];
    setSelectedFolder(currentFolder);
  };

  const handleConfirm = () => {
    if (!selectedFolder) {
      toast.error('Please select a folder');
      return;
    }
    
    onFolderSelected(selectedFolder.id, selectedFolder.name, parseInt(syncInterval, 10));
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
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Configure Auto-Sync</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Cloud className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">Not Connected to Google Drive</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Sign in with Google to set up auto-sync for your scan folder.
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
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Configure Auto-Sync Folder</CardTitle>
            <CardDescription>
              Select a folder to automatically import new scans
            </CardDescription>
          </div>
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

        {/* Back Button & Select Current */}
        <div className="flex items-center justify-between">
          {currentPath.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateUp}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <div />
          )}
          
          {currentPath.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectCurrentFolder}
              className={cn(
                selectedFolder?.id === currentPath[currentPath.length - 1]?.id && 
                "border-primary bg-primary/5"
              )}
            >
              <Check className="h-4 w-4 mr-1" />
              Use This Folder
            </Button>
          )}
        </div>

        {/* Folders List */}
        <ScrollArea className="h-[250px] border rounded-lg">
          <div className="p-2 space-y-1">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                disabled={loading}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left",
                  currentFolderId === folder.id && "bg-primary/10 border border-primary/20"
                )}
              >
                <Folder className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                <span className="truncate">{folder.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0" />
              </button>
            ))}

            {folders.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                {currentPath.length === 0 
                  ? 'No folders found in your Drive root'
                  : 'No subfolders in this folder'}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Selected Folder Display */}
        {selectedFolder && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <Folder className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-medium text-sm">{selectedFolder.name}</div>
              <div className="text-xs text-muted-foreground">Selected for auto-sync</div>
            </div>
            <Badge variant="secondary">Ready</Badge>
          </div>
        )}

        <Separator />

        {/* Sync Interval */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Check for new files every
          </Label>
          <Select value={syncInterval} onValueChange={setSyncInterval}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="120">2 minutes</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedFolder}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Enable Auto-Sync
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
