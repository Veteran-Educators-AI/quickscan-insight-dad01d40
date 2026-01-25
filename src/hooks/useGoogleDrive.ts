import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  modifiedTime: string;
  size?: string;
  parents?: string[];
}

export interface DriveFolder {
  id: string;
  name: string;
}

// Storage key for Google Drive tokens
const GOOGLE_DRIVE_TOKEN_KEY = 'google_drive_access_token';
const GOOGLE_DRIVE_TOKEN_EXPIRY_KEY = 'google_drive_token_expiry';

export function useGoogleDrive() {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<DriveFolder[]>([]);

  // Listen for auth state changes to capture provider tokens after OAuth
  // Keep callback synchronous to avoid Supabase auth deadlocks.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // After OAuth callback (SIGNED_IN or TOKEN_REFRESHED), capture and store the provider token
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.provider_token) {
        // Store the token and set expiry (provider tokens typically last 1 hour)
        localStorage.setItem(GOOGLE_DRIVE_TOKEN_KEY, session.provider_token);
        const expiryTime = Date.now() + (55 * 60 * 1000); // 55 minutes to be safe
        localStorage.setItem(GOOGLE_DRIVE_TOKEN_EXPIRY_KEY, expiryTime.toString());
        
        // Update connection status
        setConnected(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getAccessToken = async (): Promise<string | null> => {
    // First try to get token from current session (best source after fresh OAuth)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.provider_token) {
      // Update stored token
      localStorage.setItem(GOOGLE_DRIVE_TOKEN_KEY, session.provider_token);
      const expiryTime = Date.now() + (55 * 60 * 1000);
      localStorage.setItem(GOOGLE_DRIVE_TOKEN_EXPIRY_KEY, expiryTime.toString());
      return session.provider_token;
    }
    
    // Fall back to stored token if not expired
    const storedToken = localStorage.getItem(GOOGLE_DRIVE_TOKEN_KEY);
    const storedExpiry = localStorage.getItem(GOOGLE_DRIVE_TOKEN_EXPIRY_KEY);
    
    if (storedToken && storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      if (Date.now() < expiryTime) {
        return storedToken;
      }
      // Token expired, clear it
      localStorage.removeItem(GOOGLE_DRIVE_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_DRIVE_TOKEN_EXPIRY_KEY);
    }
    
    return null;
  };

  const checkConnection = useCallback(async (): Promise<boolean> => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setConnected(false);
      return false;
    }

    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=user',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      
      if (response.ok) {
        setConnected(true);
        return true;
      }
      
      // If token is invalid (401), clear stored token
      if (response.status === 401) {
        localStorage.removeItem(GOOGLE_DRIVE_TOKEN_KEY);
        localStorage.removeItem(GOOGLE_DRIVE_TOKEN_EXPIRY_KEY);
      }
      
      setConnected(false);
      return false;
    } catch {
      setConnected(false);
      return false;
    }
  }, []);

  const fetchFolders = useCallback(async (parentId: string = 'root'): Promise<DriveFolder[]> => {
    setLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Please sign in with Google to access Drive');
        return [];
      }

      const query = parentId === 'root'
        ? `mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`
        : `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch folders');
      }

      const data = await response.json();
      const folderList = data.files || [];
      setFolders(folderList);
      return folderList;
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load Drive folders');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchImagesFromFolder = useCallback(async (folderId: string): Promise<DriveFile[]> => {
    setLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Please sign in with Google to access Drive');
        return [];
      }

      // Query for image files and PDFs
      const query = `'${folderId}' in parents and (mimeType contains 'image/' or mimeType='application/pdf') and trashed=false`;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink,webContentLink,modifiedTime,size)&orderBy=name`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch files');
      }

      const data = await response.json();
      const fileList = data.files || [];
      setFiles(fileList);
      setSelectedFolderId(folderId);
      return fileList;
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load images from folder');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadFile = useCallback(async (fileId: string): Promise<Blob | null> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return null;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      return await response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }, []);

  const downloadMultipleFiles = useCallback(async (
    fileIds: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ fileId: string; blob: Blob; name: string }[]> => {
    const results: { fileId: string; blob: Blob; name: string }[] = [];
    
    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      const file = files.find(f => f.id === fileId);
      
      if (onProgress) {
        onProgress(i + 1, fileIds.length);
      }

      const blob = await downloadFile(fileId);
      if (blob && file) {
        results.push({ fileId, blob, name: file.name });
      }
    }

    return results;
  }, [files, downloadFile]);

  const navigateToFolder = useCallback(async (folder: DriveFolder) => {
    setCurrentPath(prev => [...prev, folder]);
    await fetchFolders(folder.id);
    await fetchImagesFromFolder(folder.id);
  }, [fetchFolders, fetchImagesFromFolder]);

  const navigateUp = useCallback(async () => {
    if (currentPath.length === 0) return;
    
    const newPath = [...currentPath];
    newPath.pop();
    setCurrentPath(newPath);
    
    const parentId = newPath.length > 0 ? newPath[newPath.length - 1].id : 'root';
    await fetchFolders(parentId);
    
    if (newPath.length > 0) {
      await fetchImagesFromFolder(parentId);
    } else {
      setFiles([]);
      setSelectedFolderId(null);
    }
  }, [currentPath, fetchFolders, fetchImagesFromFolder]);

  const navigateToRoot = useCallback(async () => {
    setCurrentPath([]);
    setSelectedFolderId(null);
    setFiles([]);
    await fetchFolders('root');
  }, [fetchFolders]);

  const refreshCurrentFolder = useCallback(async () => {
    if (selectedFolderId) {
      await fetchImagesFromFolder(selectedFolderId);
    }
  }, [selectedFolderId, fetchImagesFromFolder]);

  return {
    loading,
    connected,
    folders,
    files,
    selectedFolderId,
    currentPath,
    checkConnection,
    fetchFolders,
    fetchImagesFromFolder,
    downloadFile,
    downloadMultipleFiles,
    navigateToFolder,
    navigateUp,
    navigateToRoot,
    refreshCurrentFolder,
  };
}
