import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Upload,
  Loader2,
  RotateCcw,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  Layers,
  FileImage,
  Wand2,
  GripVertical,
  ZoomIn,
  ZoomOut,
  Eye,
  FolderOpen,
  RefreshCw,
  Settings2,
  Cloud,
  Zap,
  Pause,
  Play,
  Usb,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resizeImage, blobToBase64, applyPhotocopyFilter } from "@/lib/imageUtils";
import { pdfToImages, isPdfFile, isFilePdf } from "@/lib/pdfUtils";
import { GoogleDriveImport } from "./GoogleDriveImport";
import { GoogleDriveAutoSyncConfig } from "./GoogleDriveAutoSyncConfig";
import { HotFolderAlert } from "./HotFolderAlert";
import { WebUSBScannerPanel } from "./WebUSBScannerPanel";

import { useGoogleDriveAutoSync, SyncedFile } from "@/hooks/useGoogleDriveAutoSync";
import { playNotificationSound, isSoundEnabled } from "@/lib/notificationSound";

interface ScanPage {
  id: string;
  originalDataUrl: string;
  processedDataUrl: string;
  rotation: number; // 0, 90, 180, 270
  order: number;
  filename: string;
  autoRotated: boolean;
  isProcessing: boolean;
  detectedOrientation?: "portrait" | "landscape" | "unknown";
}

interface ScannerImportModeProps {
  onPagesReady: (pages: { dataUrl: string; order: number; filename: string }[]) => void;
  onClose: () => void;
}

// Detect text orientation using canvas analysis
const detectTextOrientation = async (
  imageDataUrl: string,
): Promise<{
  suggestedRotation: number;
  confidence: number;
  orientation: "portrait" | "landscape" | "unknown";
}> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ suggestedRotation: 0, confidence: 0, orientation: "unknown" });
        return;
      }

      // Sample at smaller size for speed
      const maxSize = 300;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      // Convert to grayscale and find edges
      const gray: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }

      // Detect horizontal vs vertical edges using Sobel operator
      let horizontalEdges = 0;
      let verticalEdges = 0;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;

          // Horizontal Sobel (detects horizontal lines - text lines)
          const gx =
            -gray[(y - 1) * width + (x - 1)] +
            gray[(y - 1) * width + (x + 1)] +
            -2 * gray[y * width + (x - 1)] +
            2 * gray[y * width + (x + 1)] +
            -gray[(y + 1) * width + (x - 1)] +
            gray[(y + 1) * width + (x + 1)];

          // Vertical Sobel
          const gy =
            -gray[(y - 1) * width + (x - 1)] -
            2 * gray[(y - 1) * width + x] -
            gray[(y - 1) * width + (x + 1)] +
            gray[(y + 1) * width + (x - 1)] +
            2 * gray[(y + 1) * width + x] +
            gray[(y + 1) * width + (x + 1)];

          horizontalEdges += Math.abs(gy);
          verticalEdges += Math.abs(gx);
        }
      }

      // Text typically has more horizontal structure (lines of text)
      const ratio = horizontalEdges / (verticalEdges + 1);

      // Determine aspect ratio
      const aspectRatio = img.width / img.height;

      let orientation: "portrait" | "landscape" | "unknown" = "unknown";
      let suggestedRotation = 0;
      let confidence = 0;

      // Standard document is portrait (taller than wide)
      if (aspectRatio > 1.2) {
        // Image is landscape - might need rotation
        orientation = "landscape";

        // If strong horizontal text lines in landscape mode, it's rotated
        if (ratio > 1.3) {
          suggestedRotation = 90;
          confidence = Math.min(0.9, ratio / 3);
        } else if (ratio < 0.7) {
          suggestedRotation = 0; // Text is vertical, might be intentional
          confidence = 0.5;
        }
      } else if (aspectRatio < 0.8) {
        // Portrait orientation - usually correct
        orientation = "portrait";
        confidence = 0.8;

        // Check if upside down (harder to detect)
        // For now, assume correct if portrait
        suggestedRotation = 0;
      } else {
        // Near square - harder to determine
        orientation = "unknown";
        confidence = 0.3;
      }

      resolve({ suggestedRotation, confidence, orientation });
    };
    img.onerror = () => {
      resolve({ suggestedRotation: 0, confidence: 0, orientation: "unknown" });
    };
    img.src = imageDataUrl;
  });
};

// Rotate an image by specified degrees
const rotateImage = (imageDataUrl: string, degrees: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (degrees === 0) {
      resolve(imageDataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Swap dimensions for 90/270 degree rotations
      if (degrees === 90 || degrees === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
};

export function ScannerImportMode({ onPagesReady, onClose }: ScannerImportModeProps) {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSearchQuery, setPreviewSearchQuery] = useState("");
  const [driveImportOpen, setDriveImportOpen] = useState(false);
  const [autoSyncConfigOpen, setAutoSyncConfigOpen] = useState(false);
  const [showUSBScanner, setShowUSBScanner] = useState(false);

  const [settings, setSettings] = useState({
    autoRotate: true,
    applyPhotocopyFilter: true,
    autoOrder: true,
  });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [folderWatchSupported, setFolderWatchSupported] = useState(false);
  const [watchingFolder, setWatchingFolder] = useState(false);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive Auto-Sync
  const {
    config: autoSyncConfig,
    isSyncing,
    lastSyncTime,
    newFilesCount,
    configureSync,
    startAutoSync,
    stopAutoSync,
    disableSync,
    manualSync,
    isAutoSyncActive,
  } = useGoogleDriveAutoSync();

  // Track new files for the hot folder alert
  const [hotFolderNewFiles, setHotFolderNewFiles] = useState(0);
  const [showHotFolderAlert, setShowHotFolderAlert] = useState(false);

  // Check if File System Access API is available
  useEffect(() => {
    setFolderWatchSupported("showDirectoryPicker" in window);
  }, []);

  const processImage = useCallback(
    async (file: File, index: number, total: number): Promise<ScanPage> => {
      const id = `page-${Date.now()}-${index}`;

      // Read file
      const resizedBlob = await resizeImage(file);
      let dataUrl = await blobToBase64(resizedBlob);

      // Apply photocopy filter if enabled
      if (settings.applyPhotocopyFilter) {
        dataUrl = await applyPhotocopyFilter(dataUrl);
      }

      let rotation = 0;
      let autoRotated = false;
      let detectedOrientation: "portrait" | "landscape" | "unknown" = "unknown";

      // Auto-detect and fix rotation if enabled
      if (settings.autoRotate) {
        const orientationResult = await detectTextOrientation(dataUrl);
        detectedOrientation = orientationResult.orientation;

        if (orientationResult.suggestedRotation !== 0 && orientationResult.confidence > 0.6) {
          dataUrl = await rotateImage(dataUrl, orientationResult.suggestedRotation);
          rotation = orientationResult.suggestedRotation;
          autoRotated = true;
        }
      }

      setProcessProgress(((index + 1) / total) * 100);

      return {
        id,
        originalDataUrl: dataUrl,
        processedDataUrl: dataUrl,
        rotation,
        order: index + 1,
        filename: file.name,
        autoRotated,
        isProcessing: false,
        detectedOrientation,
      };
    },
    [settings.applyPhotocopyFilter, settings.autoRotate],
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessProgress(0);

    const fileArray = Array.from(files);

    // Sort files by name for natural ordering
    if (settings.autoOrder) {
      fileArray.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }

    toast.info(`Processing ${fileArray.length} file(s)...`);

    try {
      const newPages: ScanPage[] = [];
      let totalItems = 0;

      // First pass: detect PDFs using async detection for better accuracy
      const fileTypes: Map<File, boolean> = new Map();
      for (const file of fileArray) {
        // Use async detection for reliable PDF identification
        const isPdf = await isFilePdf(file);
        fileTypes.set(file, isPdf);
        totalItems += 1;
        
        console.log(`[handleFileSelect] File: "${file.name}", type: "${file.type}", isPdf: ${isPdf}`);
      }

      let processedCount = 0;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const isPdf = fileTypes.get(file) ?? false;

        if (isPdf) {
          // Convert PDF to images
          toast.info(`Converting PDF: ${file.name}...`);
          try {
            const pdfImages = await pdfToImages(file);

            if (pdfImages.length === 0) {
              toast.error(`PDF has no pages: ${file.name}`);
              continue;
            }

            for (let pageIdx = 0; pageIdx < pdfImages.length; pageIdx++) {
              // Create a mock file from the PDF page image for processing
              const pageDataUrl = pdfImages[pageIdx];
              const page = await processImageFromDataUrl(
                pageDataUrl,
                `${file.name}-page${pageIdx + 1}`,
                processedCount,
                totalItems + pdfImages.length - 1,
              );
              newPages.push(page);
              processedCount++;
            }
            toast.success(`Converted ${pdfImages.length} pages from ${file.name}`);
          } catch (pdfErr: unknown) {
            console.error("Error processing PDF:", pdfErr);
            const errorMessage = pdfErr instanceof Error ? pdfErr.message : "Unknown error";
            toast.error(`Failed to process PDF: ${file.name}. ${errorMessage}`);
          }
        } else {
          const page = await processImage(file, processedCount, totalItems);
          newPages.push(page);
          processedCount++;
        }
      }

      // Append to existing pages
      setPages((prev) => {
        const existingCount = prev.length;
        return [...prev, ...newPages.map((p, i) => ({ ...p, order: existingCount + i + 1 }))];
      });

      if (newPages.length > 0) {
        const autoRotatedCount = newPages.filter((p) => p.autoRotated).length;
        toast.success(
          `Added ${newPages.length} page${newPages.length > 1 ? "s" : ""}${autoRotatedCount > 0 ? ` (${autoRotatedCount} auto-rotated)` : ""}`,
        );

        // Play sound notification if enabled
        if (isSoundEnabled()) {
          playNotificationSound();
        }
      } else {
        toast.warning("No pages were added. Check console for errors.");
      }
    } catch (error: unknown) {
      console.error("Error processing files:", error);
      toast.error(`Error processing files: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
      setProcessProgress(0);
      e.target.value = "";
    }
  };

  // Helper to process an image from data URL (for PDF pages)
  const processImageFromDataUrl = useCallback(
    async (dataUrl: string, filename: string, index: number, total: number): Promise<ScanPage> => {
      const id = `page-${Date.now()}-${index}`;

      let processedDataUrl = dataUrl;

      // Apply photocopy filter if enabled
      if (settings.applyPhotocopyFilter) {
        processedDataUrl = await applyPhotocopyFilter(processedDataUrl);
      }

      let rotation = 0;
      let autoRotated = false;
      let detectedOrientation: "portrait" | "landscape" | "unknown" = "unknown";

      // Auto-detect and fix rotation if enabled
      if (settings.autoRotate) {
        const orientationResult = await detectTextOrientation(processedDataUrl);
        detectedOrientation = orientationResult.orientation;

        if (orientationResult.suggestedRotation !== 0 && orientationResult.confidence > 0.6) {
          processedDataUrl = await rotateImage(processedDataUrl, orientationResult.suggestedRotation);
          rotation = orientationResult.suggestedRotation;
          autoRotated = true;
        }
      }

      setProcessProgress(((index + 1) / total) * 100);

      return {
        id,
        originalDataUrl: dataUrl,
        processedDataUrl,
        rotation,
        order: index + 1,
        filename,
        autoRotated,
        isProcessing: false,
        detectedOrientation,
      };
    },
    [settings.applyPhotocopyFilter, settings.autoRotate],
  );

  const handleRotatePage = async (pageId: string, direction: "cw" | "ccw") => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, isProcessing: true } : p)));

    const rotationDelta = direction === "cw" ? 90 : -90;
    const newRotation = (((page.rotation + rotationDelta) % 360) + 360) % 360;

    try {
      // Rotate from original
      const rotatedUrl = await rotateImage(page.originalDataUrl, newRotation);

      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId
            ? { ...p, rotation: newRotation, processedDataUrl: rotatedUrl, isProcessing: false, autoRotated: false }
            : p,
        ),
      );
    } catch (error) {
      console.error("Error rotating:", error);
      toast.error("Failed to rotate page");
      setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, isProcessing: false } : p)));
    }
  };

  const handleReorderPage = (pageId: string, direction: "up" | "down") => {
    setPages((prev) => {
      const index = prev.findIndex((p) => p.id === pageId);
      if (index === -1) return prev;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newPages = [...prev];
      [newPages[index], newPages[newIndex]] = [newPages[newIndex], newPages[index]];

      // Update order numbers
      return newPages.map((p, i) => ({ ...p, order: i + 1 }));
    });
  };

  const handleDeletePage = (pageId: string) => {
    setPages((prev) => {
      const filtered = prev.filter((p) => p.id !== pageId);
      return filtered.map((p, i) => ({ ...p, order: i + 1 }));
    });
    toast.success("Page removed");
  };

  const handleDragStart = (pageId: string) => {
    setDraggedId(pageId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    setPages((prev) => {
      const dragIndex = prev.findIndex((p) => p.id === draggedId);
      const targetIndex = prev.findIndex((p) => p.id === targetId);

      if (dragIndex === -1 || targetIndex === -1) return prev;

      const newPages = [...prev];
      const [dragged] = newPages.splice(dragIndex, 1);
      newPages.splice(targetIndex, 0, dragged);

      return newPages.map((p, i) => ({ ...p, order: i + 1 }));
    });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleStartFolderWatch = async () => {
    if (!folderWatchSupported) {
      toast.error("Folder watching not supported in this browser");
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker();
      setFolderHandle(handle);
      setWatchingFolder(true);
      toast.success("Watching folder for new scans. Drop files into the folder to import.");

      // Initial scan of folder
      await scanFolder(handle);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Could not access folder");
      }
    }
  };

  const scanFolder = async (handle: FileSystemDirectoryHandle) => {
    const existingNames = new Set(pages.map((p) => p.filename));
    const newFiles: File[] = [];

    for await (const entry of (handle as any).values()) {
      if (entry.kind === "file" && !existingNames.has(entry.name)) {
        const file = await entry.getFile();
        // Check if it's an image or PDF using improved detection
        const isPdf = await isFilePdf(file);
        if (file.type.startsWith("image/") || isPdf) {
          newFiles.push(file);
        }
      }
    }

    if (newFiles.length > 0) {
      setIsProcessing(true);
      setProcessProgress(0);

      // Sort by name
      newFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      const processedPages: ScanPage[] = [];
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const isPdf = await isFilePdf(file);
        
        if (isPdf) {
          // Process PDF file
          try {
            const pdfImages = await pdfToImages(file);
            for (let pageIdx = 0; pageIdx < pdfImages.length; pageIdx++) {
              const page = await processImageFromDataUrl(
                pdfImages[pageIdx],
                `${file.name}-page${pageIdx + 1}`,
                processedPages.length + pages.length,
                newFiles.length,
              );
              processedPages.push(page);
            }
          } catch (pdfErr) {
            console.error("Error processing PDF from folder:", pdfErr);
            toast.error(`Failed to process PDF: ${file.name}`);
          }
        } else {
          const page = await processImage(file, pages.length + i, newFiles.length);
          processedPages.push(page);
        }
      }

      setPages((prev) => [...prev, ...processedPages]);
      setIsProcessing(false);
      toast.success(`Added ${processedPages.length} new scans from folder`);
    }
  };

  const handleRefreshFolder = async () => {
    if (folderHandle) {
      await scanFolder(folderHandle);
    }
  };

  const handleStopFolderWatch = () => {
    setFolderHandle(null);
    setWatchingFolder(false);
    toast.info("Stopped watching folder");
  };

  // Handle files imported from Google Drive
  const handleDriveFilesImported = async (driveFiles: { blob: Blob; name: string }[]) => {
    setDriveImportOpen(false);

    if (driveFiles.length === 0) return;

    setIsProcessing(true);
    setProcessProgress(0);

    // Sort files by name for natural ordering
    if (settings.autoOrder) {
      driveFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }

    toast.info(`Processing ${driveFiles.length} scanned pages from Drive...`);

    try {
      const newPages: ScanPage[] = [];

      for (let i = 0; i < driveFiles.length; i++) {
        const { blob, name } = driveFiles[i];
        // Convert blob to File for consistent processing
        const file = new File([blob], name, { type: blob.type });
        const page = await processImage(file, i, driveFiles.length);
        newPages.push(page);
      }

      // Append to existing pages
      setPages((prev) => {
        const existingCount = prev.length;
        return [...prev, ...newPages.map((p, i) => ({ ...p, order: existingCount + i + 1 }))];
      });

      const autoRotatedCount = newPages.filter((p) => p.autoRotated).length;
      toast.success(
        `Added ${newPages.length} pages from Drive${autoRotatedCount > 0 ? ` (${autoRotatedCount} auto-rotated)` : ""}`,
      );
    } catch (error) {
      console.error("Error processing Drive files:", error);
      toast.error("Error processing some files");
    } finally {
      setIsProcessing(false);
      setProcessProgress(0);
    }
  };

  // Handle auto-synced files from Google Drive
  const handleAutoSyncFiles = useCallback(
    async (syncedFiles: SyncedFile[]) => {
      if (syncedFiles.length === 0) return;

      // Show hot folder alert and play sound
      setHotFolderNewFiles((prev) => prev + syncedFiles.length);
      setShowHotFolderAlert(true);

      if (isSoundEnabled()) {
        playNotificationSound("success");
      }

      setIsProcessing(true);
      setProcessProgress(0);

      toast.info(`Auto-importing ${syncedFiles.length} new scans from Drive...`);

      try {
        const newPages: ScanPage[] = [];

        // Sort by name
        const sortedFiles = settings.autoOrder
          ? [...syncedFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
          : syncedFiles;

        for (let i = 0; i < sortedFiles.length; i++) {
          const { blob, name } = sortedFiles[i];
          const file = new File([blob], name, { type: blob.type });
          const page = await processImage(file, i, sortedFiles.length);
          newPages.push(page);
        }

        setPages((prev) => {
          const existingCount = prev.length;
          return [...prev, ...newPages.map((p, i) => ({ ...p, order: existingCount + i + 1 }))];
        });

        const autoRotatedCount = newPages.filter((p) => p.autoRotated).length;
        toast.success(
          `Auto-imported ${newPages.length} pages${autoRotatedCount > 0 ? ` (${autoRotatedCount} auto-rotated)` : ""}`,
        );
      } catch (error) {
        console.error("Error processing auto-sync files:", error);
        toast.error("Error processing auto-synced files");
      } finally {
        setIsProcessing(false);
        setProcessProgress(0);
      }
    },
    [settings.autoOrder, processImage],
  );

  // Handle auto-sync folder configuration
  const handleConfigureAutoSync = (folderId: string, folderName: string, intervalSeconds: number) => {
    configureSync(folderId, folderName, intervalSeconds);
    setAutoSyncConfigOpen(false);
    // Start auto-sync with the callback
    setTimeout(() => {
      startAutoSync(handleAutoSyncFiles);
    }, 100);
  };

  // Toggle auto-sync on/off
  const handleToggleAutoSync = () => {
    if (isAutoSyncActive) {
      stopAutoSync();
    } else if (autoSyncConfig?.enabled) {
      startAutoSync(handleAutoSyncFiles);
    } else {
      setAutoSyncConfigOpen(true);
    }
  };

  // Handle images scanned via WebUSB scanner
  const handleUSBScannedImages = useCallback(
    async (imageUrls: string[]) => {
      if (imageUrls.length === 0) return;

      setIsProcessing(true);
      setProcessProgress(0);

      try {
        const newPages: ScanPage[] = [];

        for (let i = 0; i < imageUrls.length; i++) {
          const response = await fetch(imageUrls[i]);
          const blob = await response.blob();
          const file = new File([blob], `usb-scan-${Date.now()}-${i + 1}.png`, { type: blob.type });
          const page = await processImage(file, i, imageUrls.length);
          newPages.push(page);
        }

        setPages((prev) => {
          const existingCount = prev.length;
          return [...prev, ...newPages.map((p, i) => ({ ...p, order: existingCount + i + 1 }))];
        });

        toast.success(`Added ${newPages.length} pages from USB scanner`);
      } catch (error) {
        console.error("Error processing USB scanned images:", error);
        toast.error("Error processing scanned images");
      } finally {
        setIsProcessing(false);
        setProcessProgress(0);
      }
    },
    [processImage],
  );

  const handleConfirmPages = () => {
    if (pages.length === 0) {
      toast.error("No pages to process");
      return;
    }

    const orderedPages = [...pages]
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ dataUrl: p.processedDataUrl, order: p.order, filename: p.filename }));

    onPagesReady(orderedPages);
    toast.success(`${pages.length} pages ready for analysis`);
  };

  const openPreview = (pageId: string) => {
    setSelectedPage(pageId);
    setPreviewOpen(true);
    setPreviewSearchQuery("");
  };

  const selectedPageData = pages.find((p) => p.id === selectedPage);
  const selectedPageIndex = pages.findIndex((p) => p.id === selectedPage);

  // Filter pages by search query (matches filename)
  const filteredPages = useMemo(() => {
    if (!previewSearchQuery.trim()) return pages;
    const query = previewSearchQuery.toLowerCase().trim();
    return pages.filter(
      (p) => p.filename.toLowerCase().includes(query) || `page ${p.order}`.toLowerCase().includes(query),
    );
  }, [pages, previewSearchQuery]);

  // Navigation functions for preview dialog
  const navigatePreview = useCallback(
    (direction: "prev" | "next") => {
      const listToUse = previewSearchQuery.trim() ? filteredPages : pages;
      const currentIdx = listToUse.findIndex((p) => p.id === selectedPage);
      if (currentIdx === -1) return;

      const newIdx = direction === "prev" ? currentIdx - 1 : currentIdx + 1;
      if (newIdx >= 0 && newIdx < listToUse.length) {
        setSelectedPage(listToUse[newIdx].id);
      }
    },
    [selectedPage, pages, filteredPages, previewSearchQuery],
  );

  const canNavigatePrev = useMemo(() => {
    const listToUse = previewSearchQuery.trim() ? filteredPages : pages;
    const currentIdx = listToUse.findIndex((p) => p.id === selectedPage);
    return currentIdx > 0;
  }, [selectedPage, pages, filteredPages, previewSearchQuery]);

  const canNavigateNext = useMemo(() => {
    const listToUse = previewSearchQuery.trim() ? filteredPages : pages;
    const currentIdx = listToUse.findIndex((p) => p.id === selectedPage);
    return currentIdx < listToUse.length - 1;
  }, [selectedPage, pages, filteredPages, previewSearchQuery]);

  // Parse worksheet name from filename (removes extension, page numbers, cleans up)
  const parseWorksheetName = useCallback((filename: string): string => {
    if (!filename) return "";
    // Remove file extension
    let name = filename.replace(/\.[^/.]+$/, "");
    // Remove page numbers like _0001, _0002, (1), (2), -page1, etc.
    name = name.replace(/[_\-\s]*(page\s*)?\d{1,4}$/i, "");
    name = name.replace(/\(\d+\)$/, "");
    name = name.replace(/_+$/, "");
    // Replace underscores with spaces
    name = name.replace(/_/g, " ");
    // Clean up multiple spaces
    name = name.replace(/\s+/g, " ").trim();
    return name || filename;
  }, []);

  const worksheetName = useMemo(() => {
    if (!selectedPageData?.filename) return "";
    return parseWorksheetName(selectedPageData.filename);
  }, [selectedPageData?.filename, parseWorksheetName]);

  // Keyboard navigation for preview dialog
  useEffect(() => {
    if (!previewOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is typing in search
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === "ArrowLeft" && canNavigatePrev) {
        navigatePreview("prev");
      } else if (e.key === "ArrowRight" && canNavigateNext) {
        navigatePreview("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewOpen, canNavigatePrev, canNavigateNext, navigatePreview]);

  return (
    <div className="space-y-4">
      {/* Hot Folder Alert - shows when new scans are detected */}
      {showHotFolderAlert && hotFolderNewFiles > 0 && (
        <HotFolderAlert
          newFilesCount={hotFolderNewFiles}
          folderName={autoSyncConfig?.folderName}
          onDismiss={() => {
            setShowHotFolderAlert(false);
            setHotFolderNewFiles(0);
          }}
          onViewFiles={() => {
            setShowHotFolderAlert(false);
            setHotFolderNewFiles(0);
            // Scroll to page list (pages are already added)
          }}
        />
      )}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileImage className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Scanner Import</CardTitle>
              <Badge variant="secondary">{pages.length} pages</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <Button variant="outline" size="sm" asChild>
                  <label>
                    <Settings2 className="h-4 w-4 mr-1" />
                    Settings
                  </label>
                </Button>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings */}
          <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-rotate"
                checked={settings.autoRotate}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, autoRotate: checked }))}
              />
              <Label htmlFor="auto-rotate" className="text-sm">
                Auto-rotate
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="photocopy-filter"
                checked={settings.applyPhotocopyFilter}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, applyPhotocopyFilter: checked }))}
              />
              <Label htmlFor="photocopy-filter" className="text-sm">
                Photocopy filter
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="auto-order"
                checked={settings.autoOrder}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, autoOrder: checked }))}
              />
              <Label htmlFor="auto-order" className="text-sm">
                Sort by filename
              </Label>
            </div>
          </div>

          {/* Upload Actions */}
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
              <Upload className="h-4 w-4 mr-2" />
              Import Scans
            </Button>

            {/* WebUSB Scanner Button */}
            <Button
              variant={showUSBScanner ? "default" : "outline"}
              onClick={() => setShowUSBScanner(!showUSBScanner)}
              disabled={isProcessing}
            >
              <Usb className="h-4 w-4 mr-2" />
              USB Scanner
            </Button>

            <Button variant="outline" onClick={() => setDriveImportOpen(true)} disabled={isProcessing}>
              <Cloud className="h-4 w-4 mr-2" />
              Google Drive
            </Button>

            {/* Auto-Sync Button */}
            {autoSyncConfig?.folderId ? (
              <Button
                variant={isAutoSyncActive ? "default" : "outline"}
                onClick={handleToggleAutoSync}
                disabled={isProcessing || isSyncing}
                className={cn(isAutoSyncActive && "bg-green-600 hover:bg-green-700")}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : isAutoSyncActive ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isAutoSyncActive ? "Syncing..." : "Start Sync"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setAutoSyncConfigOpen(true)} disabled={isProcessing}>
                <Zap className="h-4 w-4 mr-2" />
                Auto-Sync
              </Button>
            )}

            {folderWatchSupported && (
              <>
                {!watchingFolder ? (
                  <Button variant="outline" onClick={handleStartFolderWatch} disabled={isProcessing}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Watch Folder
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleRefreshFolder} disabled={isProcessing}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="ghost" onClick={handleStopFolderWatch}>
                      Stop Watching
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          {/* WebUSB Scanner Panel */}
          {showUSBScanner && <WebUSBScannerPanel onImagesScanned={handleUSBScannedImages} className="mt-2" />}

          {/* Auto-Sync Status */}
          {autoSyncConfig?.folderId && (
            <div
              className={cn(
                "flex items-center justify-between text-sm p-2 rounded",
                isAutoSyncActive ? "bg-green-500/10" : "bg-muted/50",
              )}
            >
              <div className="flex items-center gap-2">
                <Zap className={cn("h-4 w-4", isAutoSyncActive ? "text-green-600" : "text-muted-foreground")} />
                <span>
                  Auto-sync: <strong>{autoSyncConfig.folderName}</strong>
                  {lastSyncTime && (
                    <span className="text-muted-foreground ml-2">(Last: {lastSyncTime.toLocaleTimeString()})</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={manualSync} disabled={isSyncing}>
                  <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAutoSyncConfigOpen(true)}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {watchingFolder && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-500/10 p-2 rounded">
              <FolderOpen className="h-4 w-4 text-green-600" />
              <span>Watching folder for new scans. Click "Refresh" to check for new files.</span>
            </div>
          )}

          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing scans...</span>
              </div>
              <Progress value={processProgress} className="h-2" />
            </div>
          )}

          {/* Page Grid */}
          {pages.length > 0 && (
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    draggable
                    onDragStart={() => handleDragStart(page.id)}
                    onDragOver={(e) => handleDragOver(e, page.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "relative group border rounded-lg overflow-hidden bg-card transition-all",
                      draggedId === page.id && "opacity-50",
                      page.isProcessing && "pointer-events-none opacity-70",
                    )}
                  >
                    {/* Drag Handle */}
                    <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <div className="bg-background/80 backdrop-blur-sm rounded p-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Page Number */}
                    <div className="absolute top-1 right-1 z-10">
                      <Badge variant="secondary" className="text-xs">
                        {page.order}
                      </Badge>
                    </div>

                    {/* Auto-rotated indicator */}
                    {page.autoRotated && (
                      <div className="absolute top-1 left-8 z-10">
                        <Badge variant="outline" className="text-xs bg-background/80">
                          <RotateCw className="h-3 w-3 mr-1" />
                          Auto
                        </Badge>
                      </div>
                    )}

                    {/* Image */}
                    <div className="aspect-[3/4] cursor-pointer" onClick={() => openPreview(page.id)}>
                      <img
                        src={page.processedDataUrl}
                        alt={`Page ${page.order}`}
                        className="w-full h-full object-cover"
                      />
                      {page.isProcessing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotatePage(page.id, "ccw");
                            }}
                            disabled={page.isProcessing}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotatePage(page.id, "cw");
                            }}
                            disabled={page.isProcessing}
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderPage(page.id, "up");
                            }}
                            disabled={page.order === 1}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderPage(page.id, "down");
                            }}
                            disabled={page.order === pages.length}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePage(page.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Filename */}
                    <div className="px-2 py-1 text-xs text-muted-foreground truncate border-t">{page.filename}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {pages.length === 0 && !isProcessing && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-1">No scans imported</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Import scanned documents from your scanner software. Auto-rotation will detect and fix upside-down or
                sideways pages.
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import Scans
              </Button>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {pages.length > 0 && (
                <Button variant="outline" onClick={() => setPages([])}>
                  Clear All
                </Button>
              )}
              <Button onClick={handleConfirmPages} disabled={pages.length === 0 || isProcessing}>
                <Check className="h-4 w-4 mr-2" />
                Process {pages.length} Pages
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewSearchQuery("");
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Page {selectedPageData?.order} Preview
              {selectedPageData?.autoRotated && (
                <Badge variant="outline" className="ml-2">
                  Auto-rotated
                </Badge>
              )}
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                {previewSearchQuery.trim()
                  ? `${filteredPages.findIndex((p) => p.id === selectedPage) + 1} of ${filteredPages.length} results`
                  : `${selectedPageIndex + 1} of ${pages.length}`}
              </span>
            </DialogTitle>

            {/* Worksheet Name - Prominently displayed */}
            {worksheetName && (
              <div className="flex items-center gap-2 mt-1">
                <FileImage className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-base">{worksheetName}</span>
              </div>
            )}

            <DialogDescription className="text-xs">File: {selectedPageData?.filename}</DialogDescription>
          </DialogHeader>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by filename or page number..."
              value={previewSearchQuery}
              onChange={(e) => setPreviewSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {previewSearchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setPreviewSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* No results message */}
          {previewSearchQuery.trim() && filteredPages.length === 0 && (
            <div className="text-center py-2 text-sm text-muted-foreground bg-muted/50 rounded">
              No pages match "{previewSearchQuery}". Try searching by filename (e.g., "Composite Figure") or page
              number.
            </div>
          )}

          {/* Navigation + Image Container */}
          <div className="flex items-center gap-2">
            {/* Left Navigation Arrow */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePreview("prev")}
              disabled={!canNavigatePrev}
              className="shrink-0 h-12 w-12"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            {/* Image Preview */}
            <div className="flex-1 max-h-[55vh] overflow-auto border rounded-lg">
              {selectedPageData ? (
                <img
                  src={selectedPageData.processedDataUrl}
                  alt={`Page ${selectedPageData.order}`}
                  className="max-w-full h-auto mx-auto"
                />
              ) : previewSearchQuery.trim() && filteredPages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mb-4 opacity-50" />
                  <p>No pages match your search</p>
                  <Button variant="link" onClick={() => setPreviewSearchQuery("")} className="mt-2">
                    Clear search
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Right Navigation Arrow */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePreview("next")}
              disabled={!canNavigateNext}
              className="shrink-0 h-12 w-12"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Rotate Controls */}
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => selectedPage && handleRotatePage(selectedPage, "ccw")}
              disabled={selectedPageData?.isProcessing}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rotate Left
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedPage && handleRotatePage(selectedPage, "cw")}
              disabled={selectedPageData?.isProcessing}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Rotate Right
            </Button>
          </div>

          {/* Keyboard shortcuts hint */}
          <p className="text-xs text-center text-muted-foreground">Use ← → arrow keys to navigate between pages</p>
        </DialogContent>
      </Dialog>

      {/* Google Drive Import Dialog */}
      <Dialog open={driveImportOpen} onOpenChange={setDriveImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Import from Google Drive
            </DialogTitle>
            <DialogDescription>Select scanned documents from your Google Drive</DialogDescription>
          </DialogHeader>
          <GoogleDriveImport onFilesSelected={handleDriveFilesImported} onClose={() => setDriveImportOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Google Drive Auto-Sync Config Dialog */}
      <Dialog open={autoSyncConfigOpen} onOpenChange={setAutoSyncConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Configure Auto-Sync
            </DialogTitle>
            <DialogDescription>Select a Google Drive folder to automatically import new scans</DialogDescription>
          </DialogHeader>
          <GoogleDriveAutoSyncConfig
            onFolderSelected={handleConfigureAutoSync}
            onClose={() => setAutoSyncConfigOpen(false)}
            currentFolderId={autoSyncConfig?.folderId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
