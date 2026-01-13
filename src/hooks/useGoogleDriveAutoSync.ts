import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SyncedFile {
  id: string;
  name: string;
  blob: Blob;
  syncedAt: Date;
}

export interface AutoSyncConfig {
  folderId: string;
  folderName: string;
  intervalSeconds: number;
  enabled: boolean;
}

const STORAGE_KEY = 'google-drive-auto-sync-config';

export function useGoogleDriveAutoSync() {
  const [config, setConfig] = useState<AutoSyncConfig | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncedFileIds, setSyncedFileIds] = useState<Set<string>>(new Set());
  const [newFilesCount, setNewFilesCount] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onNewFilesCallbackRef = useRef<((files: SyncedFile[]) => void) | null>(null);

  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.provider_token || null;
  };

  const checkForNewFiles = useCallback(async (): Promise<SyncedFile[]> => {
    if (!config?.folderId) return [];
    
    const accessToken = await getAccessToken();
    if (!accessToken) return [];

    try {
      setIsSyncing(true);
      
      // Query for image files and PDFs in the sync folder
      const query = `'${config.folderId}' in parents and (mimeType contains 'image/' or mimeType='application/pdf') and trashed=false`;
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)&orderBy=name`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      const files = data.files || [];
      
      // Filter out already synced files
      const newFiles = files.filter((f: any) => !syncedFileIds.has(f.id));
      
      if (newFiles.length === 0) {
        setLastSyncTime(new Date());
        return [];
      }

      // Download new files
      const downloadedFiles: SyncedFile[] = [];
      
      for (const file of newFiles) {
        try {
          const downloadResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (downloadResponse.ok) {
            const blob = await downloadResponse.blob();
            downloadedFiles.push({
              id: file.id,
              name: file.name,
              blob,
              syncedAt: new Date(),
            });
            
            // Mark as synced
            setSyncedFileIds(prev => new Set([...prev, file.id]));
          }
        } catch (error) {
          console.error(`Failed to download ${file.name}:`, error);
        }
      }

      setLastSyncTime(new Date());
      setNewFilesCount(downloadedFiles.length);
      
      // Call the callback if registered
      if (downloadedFiles.length > 0 && onNewFilesCallbackRef.current) {
        onNewFilesCallbackRef.current(downloadedFiles);
      }

      return downloadedFiles;
    } catch (error) {
      console.error('Auto-sync error:', error);
      return [];
    } finally {
      setIsSyncing(false);
    }
  }, [config?.folderId, syncedFileIds]);

  const startAutoSync = useCallback((onNewFiles?: (files: SyncedFile[]) => void) => {
    if (!config?.enabled || !config?.folderId) return;
    
    // Store callback
    if (onNewFiles) {
      onNewFilesCallbackRef.current = onNewFiles;
    }
    
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial sync
    checkForNewFiles();
    
    // Set up interval
    const intervalMs = (config.intervalSeconds || 30) * 1000;
    intervalRef.current = setInterval(() => {
      checkForNewFiles();
    }, intervalMs);
    
    toast.success(`Auto-sync started for "${config.folderName}"`);
  }, [config, checkForNewFiles]);

  const stopAutoSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onNewFilesCallbackRef.current = null;
    toast.info('Auto-sync stopped');
  }, []);

  const configureSync = useCallback((folderId: string, folderName: string, intervalSeconds: number = 30) => {
    const newConfig: AutoSyncConfig = {
      folderId,
      folderName,
      intervalSeconds,
      enabled: true,
    };
    
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    
    // Reset synced files when changing folder
    setSyncedFileIds(new Set());
    setNewFilesCount(0);
  }, []);

  const disableSync = useCallback(() => {
    stopAutoSync();
    setConfig(prev => prev ? { ...prev, enabled: false } : null);
    
    if (config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, enabled: false }));
    }
  }, [config, stopAutoSync]);

  const clearConfig = useCallback(() => {
    stopAutoSync();
    setConfig(null);
    setSyncedFileIds(new Set());
    setNewFilesCount(0);
    localStorage.removeItem(STORAGE_KEY);
  }, [stopAutoSync]);

  const manualSync = useCallback(async () => {
    const files = await checkForNewFiles();
    if (files.length === 0) {
      toast.info('No new files found');
    } else {
      toast.success(`Found ${files.length} new files`);
    }
    return files;
  }, [checkForNewFiles]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    config,
    isSyncing,
    lastSyncTime,
    newFilesCount,
    syncedFileIds,
    configureSync,
    startAutoSync,
    stopAutoSync,
    disableSync,
    clearConfig,
    manualSync,
    isAutoSyncActive: !!intervalRef.current,
  };
}
