import { useState, useRef, useEffect, useCallback } from 'react';
import { Users, Upload, Loader2, Wand2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Save, UserCheck, GraduationCap, Square, Camera, Plus, X, Layers, ImageIcon, RefreshCw, AlertTriangle, Crop, RotateCcw, ZoomIn, ZoomOut, Maximize2, Move, Check } from 'lucide-react';
import { resizeImage, blobToBase64, enhanceImageForOCR, detectDocumentCorners, applyPhotocopyFilter } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { ManualRegionDrawer } from './ManualRegionDrawer';
import { CameraModal } from './CameraModal';

const MAX_BATCH_IMAGES = 4;

interface DetectedEdge {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

interface BatchImage {
  id: string;
  dataUrl: string;
  timestamp: Date;
  quality?: 'good' | 'medium' | 'poor';
  blurScore?: number;
  enhanced?: boolean;
  enhancements?: string[];
  detectedEdges?: DetectedEdge | null;
}

// Blur detection using Laplacian variance
const detectImageBlur = (imageDataUrl: string): Promise<{ quality: 'good' | 'medium' | 'poor'; blurScore: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ quality: 'medium', blurScore: 50 });
        return;
      }

      // Resize for faster processing
      const maxSize = 200;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale and calculate Laplacian variance
      const gray: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }

      // Apply Laplacian kernel
      const width = canvas.width;
      const height = canvas.height;
      let sum = 0;
      let sumSq = 0;
      let count = 0;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          const laplacian = 
            -gray[idx - width] - 
            gray[idx - 1] + 
            4 * gray[idx] - 
            gray[idx + 1] - 
            gray[idx + width];
          
          sum += laplacian;
          sumSq += laplacian * laplacian;
          count++;
        }
      }

      // Calculate variance
      const mean = sum / count;
      const variance = (sumSq / count) - (mean * mean);
      
      // Normalize to 0-100 score (higher = sharper)
      const blurScore = Math.min(100, Math.max(0, variance / 10));
      
      let quality: 'good' | 'medium' | 'poor';
      if (blurScore >= 40) {
        quality = 'good';
      } else if (blurScore >= 20) {
        quality = 'medium';
      } else {
        quality = 'poor';
      }

      resolve({ quality, blurScore });
    };
    img.onerror = () => {
      resolve({ quality: 'medium', blurScore: 50 });
    };
    img.src = imageDataUrl;
  });
};

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
}

interface ClassOption {
  id: string;
  name: string;
  studentCount: number;
}

interface ExtractedStudent {
  id: string;
  studentName: string | null;
  croppedImageBase64: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  status: 'pending' | 'analyzing' | 'completed' | 'failed' | 'saved';
  assignedStudentId: string | null;
  result?: {
    score: number;
    maxScore: number;
    percentage: number;
    feedback: string;
    ocrText?: string;
  };
  error?: string;
}

interface MultiStudentScannerProps {
  onClose: () => void;
  rubricSteps: { step_number: number; description: string; points: number }[];
}

export function MultiStudentScanner({ onClose, rubricSteps }: MultiStudentScannerProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedStudents, setExtractedStudents] = useState<ExtractedStudent[]>([]);
  const [currentGradingIndex, setCurrentGradingIndex] = useState(0);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [showManualDrawer, setShowManualDrawer] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Batch scanning state
  const [batchMode, setBatchMode] = useState(false);
  const [batchImages, setBatchImages] = useState<BatchImage[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [rescanImageId, setRescanImageId] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  
  // Zoom state for batch gallery
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
  const [zoomImageId, setZoomImageId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);
  
  // Corner editing state
  const [isEditingCorners, setIsEditingCorners] = useState(false);
  const [editableCorners, setEditableCorners] = useState<DetectedEdge | null>(null);
  const [draggingCorner, setDraggingCorner] = useState<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Student work zoom state
  const [studentZoomOpen, setStudentZoomOpen] = useState(false);
  const [studentZoomId, setStudentZoomId] = useState<string | null>(null);
  const [studentZoomScale, setStudentZoomScale] = useState(1);
  const [studentZoomPosition, setStudentZoomPosition] = useState({ x: 0, y: 0 });
  const studentZoomContainerRef = useRef<HTMLDivElement>(null);
  const studentLastTouchDistance = useRef<number | null>(null);
  const studentLastPanPosition = useRef<{ x: number; y: number } | null>(null);
  
  // Class and roster state
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [rosterStudents, setRosterStudents] = useState<StudentOption[]>([]);
  const [classOpen, setClassOpen] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Fetch classes on mount
  useEffect(() => {
    async function fetchClasses() {
      setLoadingClasses(true);
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, students(id)')
        .order('name');

      if (!error && data) {
        setClasses(data.map(c => ({
          id: c.id,
          name: c.name,
          studentCount: c.students?.length || 0,
        })));
      }
      setLoadingClasses(false);
    }
    fetchClasses();
  }, []);

  // Fetch students when class changes
  useEffect(() => {
    async function fetchStudents() {
      if (!selectedClassId) {
        setRosterStudents([]);
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id')
        .eq('class_id', selectedClassId)
        .order('last_name');

      if (!error && data) {
        setRosterStudents(data);
      }
    }
    fetchStudents();
  }, [selectedClassId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedBlob = await resizeImage(file);
        const dataUrl = await blobToBase64(resizedBlob);
        setOriginalImage(dataUrl);
        setExtractedStudents([]);
      } catch (err) {
        console.error('Error resizing image:', err);
        // Fallback to original file
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setOriginalImage(dataUrl);
          setExtractedStudents([]);
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleCameraCapture = async (imageDataUrl: string) => {
    if (batchMode) {
      // Check max limit
      if (!rescanImageId && batchImages.length >= MAX_BATCH_IMAGES) {
        toast.error(`Maximum ${MAX_BATCH_IMAGES} papers allowed per scan.`);
        setShowCamera(false);
        return;
      }
      
      // Apply photocopy filter first to remove shadows
      const photocopiedImage = await applyPhotocopyFilter(imageDataUrl);
      
      // Run blur detection and edge detection in parallel
      const [qualityResult, detectedEdges] = await Promise.all([
        detectImageBlur(photocopiedImage),
        detectDocumentCorners(photocopiedImage)
      ]);
      
      if (rescanImageId) {
        // Re-scanning a specific image - replace it
        setBatchImages(prev => prev.map(img => 
          img.id === rescanImageId 
            ? { ...img, dataUrl: photocopiedImage, timestamp: new Date(), ...qualityResult, detectedEdges }
            : img
        ));
        setShowCamera(false);
        setRescanImageId(null);
        
        if (qualityResult.quality === 'poor') {
          toast.warning('Image replaced, but quality is still low. Consider re-scanning.');
        } else {
          toast.success('Image replaced with shadow removal applied!');
        }
      } else {
        // In batch mode, add to batch collection
        const newBatchImage: BatchImage = {
          id: `batch-${Date.now()}`,
          dataUrl: photocopiedImage,
          timestamp: new Date(),
          ...qualityResult,
          detectedEdges,
        };
        setBatchImages(prev => [...prev, newBatchImage]);
        setShowCamera(false);
        
        if (qualityResult.quality === 'poor') {
          toast.warning(`Photo ${batchImages.length + 1} captured but appears blurry. Consider re-scanning.`);
        } else {
          toast.success(`Photo ${batchImages.length + 1} captured with shadow removal! ${detectedEdges ? 'Paper edges detected.' : ''}`);
        }
      }
    } else {
      // Apply photocopy filter for single image mode too
      const photocopiedImage = await applyPhotocopyFilter(imageDataUrl);
      setOriginalImage(photocopiedImage);
      setExtractedStudents([]);
      setShowCamera(false);
      toast.success('Photo captured with shadow removal! Now extract student regions.');
    }
  };

  const startRescan = (imageId: string) => {
    setRescanImageId(imageId);
    setShowCamera(true);
  };

  const cancelRescan = () => {
    setRescanImageId(null);
    setShowCamera(false);
  };

  const handleBatchFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingSlots = MAX_BATCH_IMAGES - batchImages.length;
      if (remainingSlots <= 0) {
        toast.error(`Maximum ${MAX_BATCH_IMAGES} papers allowed per scan.`);
        e.target.value = '';
        return;
      }
      
      const filesToProcess = Math.min(files.length, remainingSlots);
      if (files.length > remainingSlots) {
        toast.warning(`Only adding ${filesToProcess} of ${files.length} images (max ${MAX_BATCH_IMAGES} per scan).`);
      }
      
      let poorQualityCount = 0;
      
      for (let i = 0; i < filesToProcess; i++) {
        const file = files[i];
        try {
          const resizedBlob = await resizeImage(file);
          const dataUrl = await blobToBase64(resizedBlob);
          // Apply photocopy filter to remove shadows
          const photocopiedDataUrl = await applyPhotocopyFilter(dataUrl);
          const [qualityResult, detectedEdges] = await Promise.all([
            detectImageBlur(photocopiedDataUrl),
            detectDocumentCorners(photocopiedDataUrl)
          ]);
          
          if (qualityResult.quality === 'poor') poorQualityCount++;
          
          const newBatchImage: BatchImage = {
            id: `batch-${Date.now()}-${i}`,
            dataUrl: photocopiedDataUrl,
            timestamp: new Date(),
            ...qualityResult,
            detectedEdges,
          };
          setBatchImages(prev => [...prev, newBatchImage]);
        } catch (err) {
          console.error('Error resizing image:', err);
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            // Apply photocopy filter to remove shadows
            const photocopiedDataUrl = await applyPhotocopyFilter(dataUrl);
            const [qualityResult, detectedEdges] = await Promise.all([
              detectImageBlur(photocopiedDataUrl),
              detectDocumentCorners(photocopiedDataUrl)
            ]);
            
            if (qualityResult.quality === 'poor') poorQualityCount++;
            
            const newBatchImage: BatchImage = {
              id: `batch-${Date.now()}-${i}`,
              dataUrl: photocopiedDataUrl,
              timestamp: new Date(),
              ...qualityResult,
              detectedEdges,
            };
            setBatchImages(prev => [...prev, newBatchImage]);
          };
          reader.readAsDataURL(file);
        }
      }
      
      if (poorQualityCount > 0) {
        toast.warning(`Added ${filesToProcess} image(s) with shadow removal. ${poorQualityCount} appear blurry - consider re-scanning.`);
      } else {
        toast.success(`Added ${filesToProcess} image(s) with shadow removal!`);
      }
    }
    e.target.value = '';
  };

  const removeBatchImage = (id: string) => {
    setBatchImages(prev => prev.filter(img => img.id !== id));
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    setDraggedImageId(imageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', imageId);
  };

  const handleDragOver = (e: React.DragEvent, imageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedImageId && imageId !== draggedImageId) {
      setDragOverImageId(imageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverImageId(null);
  };

  const handleDrop = (e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();
    if (!draggedImageId || draggedImageId === targetImageId) {
      setDraggedImageId(null);
      setDragOverImageId(null);
      return;
    }

    setBatchImages(prev => {
      const newImages = [...prev];
      const draggedIndex = newImages.findIndex(img => img.id === draggedImageId);
      const targetIndex = newImages.findIndex(img => img.id === targetImageId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      const [draggedItem] = newImages.splice(draggedIndex, 1);
      newImages.splice(targetIndex, 0, draggedItem);
      
      return newImages;
    });

    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  const handleDragEnd = () => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  // Zoom handlers for pinch-to-zoom
  const openZoomDialog = (imageId: string) => {
    const img = batchImages.find(i => i.id === imageId);
    setZoomImageId(imageId);
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
    setIsEditingCorners(false);
    setEditableCorners(img?.detectedEdges || null);
    setZoomDialogOpen(true);
  };

  const closeZoomDialog = () => {
    setZoomDialogOpen(false);
    setZoomImageId(null);
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
    setIsEditingCorners(false);
    setEditableCorners(null);
    setDraggingCorner(null);
  };
  
  const startEditingCorners = () => {
    const img = batchImages.find(i => i.id === zoomImageId);
    if (img?.detectedEdges) {
      setEditableCorners({ ...img.detectedEdges });
    } else {
      // Initialize with default corners if none detected
      setEditableCorners({
        topLeft: { x: 0.1, y: 0.1 },
        topRight: { x: 0.9, y: 0.1 },
        bottomLeft: { x: 0.1, y: 0.9 },
        bottomRight: { x: 0.9, y: 0.9 }
      });
    }
    setIsEditingCorners(true);
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
  };
  
  const cancelEditingCorners = () => {
    const img = batchImages.find(i => i.id === zoomImageId);
    setEditableCorners(img?.detectedEdges || null);
    setIsEditingCorners(false);
    setDraggingCorner(null);
  };
  
  const saveEditedCorners = () => {
    if (!zoomImageId || !editableCorners) return;
    setBatchImages(prev => prev.map(img => 
      img.id === zoomImageId 
        ? { ...img, detectedEdges: editableCorners }
        : img
    ));
    setIsEditingCorners(false);
    setDraggingCorner(null);
    toast.success('Corner positions saved!');
  };
  
  const handleCornerMouseDown = (corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingCorner(corner);
  };
  
  const handleCornerTouchStart = (corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingCorner(corner);
  };
  
  const handleCornerMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingCorner || !editableCorners || !imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    
    setEditableCorners(prev => prev ? {
      ...prev,
      [draggingCorner]: { x, y }
    } : null);
  }, [draggingCorner, editableCorners]);
  
  const handleCornerMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingCorner) {
      handleCornerMove(e.clientX, e.clientY);
    }
  }, [draggingCorner, handleCornerMove]);
  
  const handleCornerTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggingCorner && e.touches.length === 1) {
      handleCornerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [draggingCorner, handleCornerMove]);
  
  const handleCornerEnd = useCallback(() => {
    setDraggingCorner(null);
  }, []);

  const handleZoomWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomScale(prev => Math.min(5, Math.max(0.5, prev + delta)));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1) {
      lastPanPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (distance - lastTouchDistance.current) * 0.01;
      setZoomScale(prev => Math.min(5, Math.max(0.5, prev + delta)));
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && lastPanPosition.current && zoomScale > 1) {
      const deltaX = e.touches[0].clientX - lastPanPosition.current.x;
      const deltaY = e.touches[0].clientY - lastPanPosition.current.y;
      setZoomPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      lastPanPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }, [zoomScale]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    lastPanPosition.current = null;
  }, []);

  const zoomIn = () => setZoomScale(prev => Math.min(5, prev + 0.5));
  const zoomOut = () => setZoomScale(prev => Math.max(0.5, prev - 0.5));
  const resetZoom = () => {
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
  };

  // Student work zoom handlers
  const openStudentZoom = (studentId: string) => {
    setStudentZoomId(studentId);
    setStudentZoomScale(1);
    setStudentZoomPosition({ x: 0, y: 0 });
    setStudentZoomOpen(true);
  };

  const closeStudentZoom = () => {
    setStudentZoomOpen(false);
    setStudentZoomId(null);
    setStudentZoomScale(1);
    setStudentZoomPosition({ x: 0, y: 0 });
  };

  const handleStudentZoomWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setStudentZoomScale(prev => Math.min(5, Math.max(0.5, prev + delta)));
  }, []);

  const handleStudentTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      studentLastTouchDistance.current = distance;
    } else if (e.touches.length === 1) {
      studentLastPanPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }, []);

  const handleStudentTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && studentLastTouchDistance.current !== null) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (distance - studentLastTouchDistance.current) * 0.01;
      setStudentZoomScale(prev => Math.min(5, Math.max(0.5, prev + delta)));
      studentLastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && studentLastPanPosition.current && studentZoomScale > 1) {
      const deltaX = e.touches[0].clientX - studentLastPanPosition.current.x;
      const deltaY = e.touches[0].clientY - studentLastPanPosition.current.y;
      setStudentZoomPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      studentLastPanPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }, [studentZoomScale]);

  const handleStudentTouchEnd = useCallback(() => {
    studentLastTouchDistance.current = null;
    studentLastPanPosition.current = null;
  }, []);

  const studentZoomIn = () => setStudentZoomScale(prev => Math.min(5, prev + 0.5));
  const studentZoomOut = () => setStudentZoomScale(prev => Math.max(0.5, prev - 0.5));
  const resetStudentZoom = () => {
    setStudentZoomScale(1);
    setStudentZoomPosition({ x: 0, y: 0 });
  };

  const enhanceAllBatchImages = async () => {
    if (batchImages.length === 0) return;
    
    setIsEnhancing(true);
    let enhancedCount = 0;
    
    for (let i = 0; i < batchImages.length; i++) {
      const img = batchImages[i];
      if (img.enhanced) continue; // Skip already enhanced images
      
      try {
        const result = await enhanceImageForOCR(img.dataUrl);
        if (result.wasEnhanced) {
          enhancedCount++;
          // Re-run blur detection on enhanced image
          const qualityResult = await detectImageBlur(result.enhancedDataUrl);
          
          setBatchImages(prev => prev.map(bImg => 
            bImg.id === img.id 
              ? { 
                  ...bImg, 
                  dataUrl: result.enhancedDataUrl, 
                  enhanced: true, 
                  enhancements: result.enhancements,
                  ...qualityResult 
                }
              : bImg
          ));
        } else {
          // Mark as processed even if no enhancement applied
          setBatchImages(prev => prev.map(bImg => 
            bImg.id === img.id ? { ...bImg, enhanced: true, enhancements: [] } : bImg
          ));
        }
      } catch (err) {
        console.error('Enhancement error:', err);
      }
    }
    
    setIsEnhancing(false);
    if (enhancedCount > 0) {
      toast.success(`Enhanced ${enhancedCount} image(s) with auto-crop and perspective correction!`);
    } else {
      toast.info('No significant improvements needed for these images.');
    }
  };

  const enhanceSingleImage = async (imageId: string) => {
    const img = batchImages.find(i => i.id === imageId);
    if (!img) return;
    
    setIsEnhancing(true);
    try {
      const result = await enhanceImageForOCR(img.dataUrl);
      if (result.wasEnhanced) {
        const qualityResult = await detectImageBlur(result.enhancedDataUrl);
        setBatchImages(prev => prev.map(bImg => 
          bImg.id === imageId 
            ? { 
                ...bImg, 
                dataUrl: result.enhancedDataUrl, 
                enhanced: true, 
                enhancements: result.enhancements,
                ...qualityResult 
              }
            : bImg
        ));
        toast.success(`Image enhanced: ${result.enhancements.join(', ')}`);
      } else {
        setBatchImages(prev => prev.map(bImg => 
          bImg.id === imageId ? { ...bImg, enhanced: true, enhancements: [] } : bImg
        ));
        toast.info('No significant improvements needed for this image.');
      }
    } catch (err) {
      console.error('Enhancement error:', err);
      toast.error('Failed to enhance image');
    }
    setIsEnhancing(false);
  };

  const processAllBatchImages = async () => {
    if (batchImages.length === 0) return;

    setIsProcessingBatch(true);
    let allExtractedStudents: ExtractedStudent[] = [];
    let studentCounter = 0;

    for (let i = 0; i < batchImages.length; i++) {
      setCurrentBatchIndex(i);
      toast.info(`Processing image ${i + 1} of ${batchImages.length}...`);

      try {
        const { data, error } = await supabase.functions.invoke('extract-multi-student-regions', {
          body: { imageBase64: batchImages[i].dataUrl }
        });

        if (error) throw error;

        if (data.regions && data.regions.length > 0) {
          const students: ExtractedStudent[] = data.regions.map((region: any) => {
            studentCounter++;
            let matchedStudentId: string | null = null;
            if (region.detectedName && rosterStudents.length > 0) {
              const detected = region.detectedName.toLowerCase();
              const match = rosterStudents.find(s => {
                const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
                const reverseName = `${s.last_name} ${s.first_name}`.toLowerCase();
                return fullName.includes(detected) || reverseName.includes(detected) || 
                       detected.includes(s.first_name.toLowerCase()) || 
                       detected.includes(s.last_name.toLowerCase());
              });
              if (match) matchedStudentId = match.id;
            }

            return {
              id: `student-${studentCounter}`,
              studentName: region.detectedName || null,
              croppedImageBase64: region.croppedImage,
              boundingBox: region.boundingBox,
              status: 'pending' as const,
              assignedStudentId: matchedStudentId,
            };
          });
          
          allExtractedStudents = [...allExtractedStudents, ...students];
        }
      } catch (err) {
        console.error(`Extraction error for image ${i + 1}:`, err);
        toast.error(`Failed to extract from image ${i + 1}`);
      }
    }

    setExtractedStudents(allExtractedStudents);
    setIsProcessingBatch(false);
    
    if (allExtractedStudents.length > 0) {
      const matchedCount = allExtractedStudents.filter(s => s.assignedStudentId).length;
      toast.success(`Found ${allExtractedStudents.length} student work regions from ${batchImages.length} images!${matchedCount > 0 ? ` Auto-matched ${matchedCount} to roster.` : ''}`);
      // Clear batch after successful processing
      setBatchImages([]);
      setBatchMode(false);
    } else {
      toast.warning('Could not detect any student regions from the batch. Try clearer images.');
    }
  };

  const extractStudentRegions = async () => {
    if (!originalImage) return;

    setIsExtracting(true);
    toast.info('Analyzing image to detect individual student work...');

    try {
      const { data, error } = await supabase.functions.invoke('extract-multi-student-regions', {
        body: { imageBase64: originalImage }
      });

      if (error) throw error;

      if (data.regions && data.regions.length > 0) {
        const students: ExtractedStudent[] = data.regions.map((region: any, index: number) => {
          // Try to auto-match detected name with roster
          let matchedStudentId: string | null = null;
          if (region.detectedName && rosterStudents.length > 0) {
            const detected = region.detectedName.toLowerCase();
            const match = rosterStudents.find(s => {
              const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
              const reverseName = `${s.last_name} ${s.first_name}`.toLowerCase();
              return fullName.includes(detected) || reverseName.includes(detected) || 
                     detected.includes(s.first_name.toLowerCase()) || 
                     detected.includes(s.last_name.toLowerCase());
            });
            if (match) matchedStudentId = match.id;
          }

          return {
            id: `student-${index + 1}`,
            studentName: region.detectedName || null,
            croppedImageBase64: region.croppedImage,
            boundingBox: region.boundingBox,
            status: 'pending' as const,
            assignedStudentId: matchedStudentId,
          };
        });
        
        setExtractedStudents(students);
        const matchedCount = students.filter(s => s.assignedStudentId).length;
        toast.success(`Found ${students.length} student work regions!${matchedCount > 0 ? ` Auto-matched ${matchedCount} to roster.` : ''}`);
      } else {
        toast.warning('Could not detect multiple student regions. Try a clearer image or manually segment.');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      toast.error('Failed to extract student regions');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualRegionsConfirm = (regions: { id: string; x: number; y: number; width: number; height: number }[], croppedImages: string[]) => {
    const students: ExtractedStudent[] = croppedImages.map((croppedImage, index) => ({
      id: `student-${index + 1}`,
      studentName: null,
      croppedImageBase64: croppedImage,
      boundingBox: regions[index],
      status: 'pending' as const,
      assignedStudentId: null,
    }));
    
    setExtractedStudents(students);
    setShowManualDrawer(false);
    toast.success(`Created ${students.length} student regions manually!`);
  };

  const assignStudent = (extractedId: string, rosterStudentId: string | null) => {
    setExtractedStudents(prev => 
      prev.map(s => s.id === extractedId ? { ...s, assignedStudentId: rosterStudentId } : s)
    );
  };

  const gradeAllStudents = async () => {
    if (extractedStudents.length === 0) return;

    setIsGrading(true);
    setCurrentGradingIndex(0);

    for (let i = 0; i < extractedStudents.length; i++) {
      setCurrentGradingIndex(i);
      
      setExtractedStudents(prev => 
        prev.map((s, idx) => idx === i ? { ...s, status: 'analyzing' } : s)
      );

      try {
        const { data, error } = await supabase.functions.invoke('analyze-student-work', {
          body: {
            imageBase64: extractedStudents[i].croppedImageBase64,
            rubricSteps,
            assessmentMode: 'ai',
          }
        });

        if (error) throw error;

        const analysis = data.analysis;
        
        setExtractedStudents(prev => 
          prev.map((s, idx) => idx === i ? {
            ...s,
            status: 'completed',
            result: {
              score: analysis.totalScore.earned,
              maxScore: analysis.totalScore.possible,
              percentage: analysis.totalScore.percentage,
              feedback: analysis.feedback,
              ocrText: analysis.ocrText,
            }
          } : s)
        );
      } catch (err) {
        console.error(`Grading error for student ${i + 1}:`, err);
        setExtractedStudents(prev => 
          prev.map((s, idx) => idx === i ? {
            ...s,
            status: 'failed',
            error: 'Failed to analyze this work'
          } : s)
        );
      }
    }

    setIsGrading(false);
    toast.success('All student work graded!');
  };

  const saveAllResults = async () => {
    if (!user) {
      toast.error('You must be logged in to save results');
      return;
    }

    const completedWithStudent = extractedStudents.filter(
      s => s.status === 'completed' && s.assignedStudentId && s.result
    );

    if (completedWithStudent.length === 0) {
      toast.error('No graded results with assigned students to save');
      return;
    }

    setIsSaving(true);
    let savedCount = 0;

    try {
      for (const student of completedWithStudent) {
        if (!student.result || !student.assignedStudentId) continue;

        // Create a generic question ID or use a placeholder
        // In a real implementation, you might want to select a specific question
        const { data: question } = await supabase
          .from('questions')
          .select('id')
          .limit(1)
          .single();

        const questionId = question?.id;
        if (!questionId) {
          console.warn('No question found, skipping save for student');
          continue;
        }

        // Create attempt record
        const { data: attempt, error: attemptError } = await supabase
          .from('attempts')
          .insert({
            student_id: student.assignedStudentId,
            question_id: questionId,
            status: 'analyzed',
          })
          .select('id')
          .single();

        if (attemptError) {
          console.error('Error creating attempt:', attemptError);
          continue;
        }

        // Create attempt_image record
        await supabase
          .from('attempt_images')
          .insert({
            attempt_id: attempt.id,
            image_url: student.croppedImageBase64,
            ocr_text: student.result.ocrText || null,
          });

        // Create score record
        await supabase
          .from('scores')
          .insert({
            attempt_id: attempt.id,
            points_earned: student.result.score,
            notes: student.result.feedback,
            is_auto_scored: true,
            teacher_override: false,
          });

        // Update status to saved
        setExtractedStudents(prev =>
          prev.map(s => s.id === student.id ? { ...s, status: 'saved' } : s)
        );
        
        savedCount++;
      }

      toast.success(`Saved ${savedCount} student results to database!`);
    } catch (err) {
      console.error('Error saving results:', err);
      toast.error('Failed to save some results');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleResultExpanded = (id: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const completedCount = extractedStudents.filter(s => s.status === 'completed' || s.status === 'saved').length;
  const savedCount = extractedStudents.filter(s => s.status === 'saved').length;
  const assignedCount = extractedStudents.filter(s => s.assignedStudentId).length;
  const canSave = completedCount > 0 && assignedCount > 0 && !isSaving && savedCount < completedCount;
  
  const averageScore = completedCount > 0
    ? Math.round(extractedStudents
        .filter(s => (s.status === 'completed' || s.status === 'saved') && s.result)
        .reduce((sum, s) => sum + (s.result?.percentage || 0), 0) / completedCount)
    : 0;

  // Get unassigned roster students
  const assignedIds = new Set(extractedStudents.map(s => s.assignedStudentId).filter(Boolean));
  const availableRosterStudents = rosterStudents.filter(s => !assignedIds.has(s.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Multi-Student Grading</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Upload a single image containing multiple students' work. The AI will detect and grade each student's work separately.
      </p>

      {/* Class Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Select Class (for roster matching)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={classOpen} onOpenChange={setClassOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={classOpen}
                className="w-full justify-between"
                disabled={loadingClasses || isGrading}
              >
                {selectedClass ? (
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {selectedClass.name}
                    <Badge variant="secondary" className="ml-auto">
                      {selectedClass.studentCount} students
                    </Badge>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select a class for roster matching...</span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search classes..." />
                <CommandList>
                  <CommandEmpty>No classes found.</CommandEmpty>
                  <CommandGroup>
                    {classes.map((classOption) => (
                      <CommandItem
                        key={classOption.id}
                        value={classOption.name}
                        onSelect={() => {
                          setSelectedClassId(classOption.id);
                          setClassOpen(false);
                        }}
                      >
                        <span className="flex-1">{classOption.name}</span>
                        <Badge variant="outline">{classOption.studentCount}</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Image Upload / Camera / Batch Mode */}
      {!originalImage && extractedStudents.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Mode Toggle */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <Button
                  variant={!batchMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBatchMode(false)}
                  className="gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Single Image
                </Button>
                <Button
                  variant={batchMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBatchMode(true)}
                  className="gap-2"
                >
                  <Layers className="h-4 w-4" />
                  Batch Scan
                </Button>
              </div>

              {!batchMode ? (
                /* Single Image Mode */
                <div className="text-center space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Camera Option */}
                    <div 
                      className="w-full min-h-[180px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                      onClick={() => setShowCamera(true)}
                    >
                      <Camera className="h-10 w-10 text-primary" />
                      <div>
                        <p className="font-medium">Scan with Camera</p>
                        <p className="text-sm text-muted-foreground">
                          Take a photo of student work
                        </p>
                      </div>
                    </div>

                    {/* Upload Option */}
                    <div 
                      className="w-full min-h-[180px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Upload Image</p>
                        <p className="text-sm text-muted-foreground">
                          Select an existing photo
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">JPG</Badge>
                        <Badge variant="outline">PNG</Badge>
                        <Badge variant="outline">HEIC</Badge>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground pt-2">
                    Capture or upload a photo containing multiple students' work
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                /* Batch Mode */
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Capture multiple pages of student work, then process all at once
                    </p>
                  </div>

                  {/* Batch Gallery */}
                  {batchImages.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Layers className="h-3 w-3" />
                            {batchImages.length} image{batchImages.length !== 1 ? 's' : ''} in batch
                          </Badge>
                          {batchImages.filter(img => img.quality === 'poor').length > 0 && (
                            <Badge variant="destructive" className="gap-1 animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              {batchImages.filter(img => img.quality === 'poor').length} blurry
                            </Badge>
                          )}
                          {batchImages.filter(img => img.quality === 'good').length > 0 && (
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                              <CheckCircle className="h-3 w-3" />
                              {batchImages.filter(img => img.quality === 'good').length} good
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={enhanceAllBatchImages}
                            disabled={isEnhancing || batchImages.every(img => img.enhanced)}
                            className="gap-1"
                          >
                            {isEnhancing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Crop className="h-3 w-3" />
                            )}
                            Auto-Enhance
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBatchImages([])}
                            className="text-destructive hover:text-destructive"
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                      
                      <ScrollArea className="w-full">
                        <div className="flex gap-3 pb-2">
                          {batchImages.map((img, index) => (
                            <div 
                              key={img.id} 
                              draggable
                              onDragStart={(e) => handleDragStart(e, img.id)}
                              onDragOver={(e) => handleDragOver(e, img.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, img.id)}
                              onDragEnd={handleDragEnd}
                              onDoubleClick={() => openZoomDialog(img.id)}
                              className={cn(
                                "relative flex-shrink-0 group cursor-grab active:cursor-grabbing transition-all duration-200",
                                img.quality === 'poor' && "ring-2 ring-destructive ring-offset-2",
                                draggedImageId === img.id && "opacity-50 scale-95",
                                dragOverImageId === img.id && "ring-2 ring-primary ring-offset-2 scale-105"
                              )}
                              title="Double-click to zoom and adjust corners"
                            >
                              <div className="relative h-24 w-24">
                                <img 
                                  src={img.dataUrl} 
                                  alt={`Batch image ${index + 1}`}
                                  className={cn(
                                    "h-24 w-24 object-cover rounded-lg border pointer-events-none",
                                    img.quality === 'poor' && "opacity-80"
                                  )}
                                />
                                {/* Detected edges overlay */}
                                {img.detectedEdges && (
                                  <svg className="absolute inset-0 h-24 w-24 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <polygon
                                      points={`${img.detectedEdges.topLeft.x * 100},${img.detectedEdges.topLeft.y * 100} ${img.detectedEdges.topRight.x * 100},${img.detectedEdges.topRight.y * 100} ${img.detectedEdges.bottomRight.x * 100},${img.detectedEdges.bottomRight.y * 100} ${img.detectedEdges.bottomLeft.x * 100},${img.detectedEdges.bottomLeft.y * 100}`}
                                      fill="none"
                                      stroke="hsl(var(--primary))"
                                      strokeWidth="2"
                                      strokeDasharray="4 2"
                                    />
                                  </svg>
                                )}
                              </div>
                              {/* Image number badge */}
                              <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                {index + 1}
                              </div>
                              
                              {/* Edge detected badge */}
                              {img.detectedEdges && (
                                <div className="absolute bottom-1 left-1 bg-primary/80 text-primary-foreground text-[9px] px-1 py-0.5 rounded">
                                  <Square className="h-2 w-2 inline mr-0.5" />
                                  Edges
                                </div>
                              )}
                              
                              {/* Quality indicator badge */}
                              {img.quality && (
                                <div 
                                  className={cn(
                                    "absolute top-1 right-1 rounded-full p-1",
                                    img.quality === 'good' && "bg-green-500",
                                    img.quality === 'medium' && "bg-yellow-500",
                                    img.quality === 'poor' && "bg-destructive animate-pulse"
                                  )}
                                  title={
                                    img.quality === 'good' ? 'Good quality' :
                                    img.quality === 'medium' ? 'Acceptable quality' :
                                    'Poor quality - consider re-scanning'
                                  }
                                >
                                  {img.quality === 'poor' ? (
                                    <AlertTriangle className="h-2.5 w-2.5 text-white" />
                                  ) : img.quality === 'good' ? (
                                    <CheckCircle className="h-2.5 w-2.5 text-white" />
                                  ) : (
                                    <div className="h-2.5 w-2.5" />
                                  )}
                                </div>
                              )}
                              
                              {/* Poor quality warning label */}
                              {img.quality === 'poor' && !img.detectedEdges && (
                                <div className="absolute bottom-0 left-0 right-0 bg-destructive text-destructive-foreground text-[10px] text-center py-0.5 rounded-b-lg">
                                  Blurry
                                </div>
                              )}
                              
                              {/* Action buttons overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openZoomDialog(img.id); }}
                                  className="bg-white text-black rounded-full p-1.5 hover:bg-gray-200 transition-colors"
                                  title="Zoom to inspect"
                                >
                                  <ZoomIn className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => enhanceSingleImage(img.id)}
                                  disabled={isEnhancing || img.enhanced}
                                  className={cn(
                                    "rounded-full p-1.5 transition-colors",
                                    img.enhanced
                                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                                      : "bg-blue-500 text-white hover:bg-blue-400"
                                  )}
                                  title={img.enhanced ? "Already enhanced" : "Auto-crop & fix perspective"}
                                >
                                  <Crop className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => startRescan(img.id)}
                                  className={cn(
                                    "rounded-full p-1.5 transition-colors",
                                    img.quality === 'poor' 
                                      ? "bg-yellow-500 text-black hover:bg-yellow-400" 
                                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                                  )}
                                  title="Re-scan this image"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => removeBatchImage(img.id)}
                                  className="bg-destructive text-destructive-foreground rounded-full p-1.5 hover:bg-destructive/90 transition-colors"
                                  title="Remove this image"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Add More Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-24 flex-col gap-2"
                      onClick={() => setShowCamera(true)}
                    >
                      <Camera className="h-6 w-6 text-primary" />
                      <span>Capture Photo</span>
                    </Button>
                    
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        multiple
                        onChange={handleBatchFileSelect}
                        className="hidden"
                      />
                      <div className="h-24 flex flex-col items-center justify-center gap-2 border rounded-lg hover:bg-muted/50 transition-colors">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm">Add Images</span>
                      </div>
                    </label>
                  </div>

                  {/* Process Batch Button */}
                  {batchImages.length > 0 && (
                    <Button
                      variant="hero"
                      className="w-full"
                      onClick={processAllBatchImages}
                      disabled={isProcessingBatch}
                    >
                      {isProcessingBatch ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing {currentBatchIndex + 1} of {batchImages.length}...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Process All {batchImages.length} Images
                        </>
                      )}
                    </Button>
                  )}

                  {isProcessingBatch && (
                    <Progress 
                      value={((currentBatchIndex + 1) / batchImages.length) * 100} 
                      className="h-2"
                    />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview & Extraction */}
      {originalImage && extractedStudents.length === 0 && !showManualDrawer && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <img 
              src={originalImage} 
              alt="Uploaded class work" 
              className="w-full rounded-lg object-contain max-h-[300px]"
            />
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setOriginalImage(null)}
                  disabled={isExtracting}
                >
                  Change Image
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1"
                  onClick={extractStudentRegions}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Detecting Student Work...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Auto-Detect Regions
                    </>
                  )}
                </Button>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowManualDrawer(true)}
                disabled={isExtracting}
                className="w-full"
              >
                <Square className="h-4 w-4 mr-2" />
                Draw Regions Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Region Drawer */}
      {originalImage && showManualDrawer && extractedStudents.length === 0 && (
        <Card>
          <CardContent className="p-4">
            <ManualRegionDrawer
              imageUrl={originalImage}
              onRegionsConfirm={handleManualRegionsConfirm}
              onCancel={() => setShowManualDrawer(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Extracted Students Grid */}
      {extractedStudents.length > 0 && (
        <div className="space-y-4">
          {/* Summary Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">{extractedStudents.length} Students Detected</p>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {assignedCount > 0 && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        {assignedCount} assigned
                      </span>
                    )}
                    {completedCount > 0 && (
                      <span>• Average: <span className="font-semibold text-primary">{averageScore}%</span></span>
                    )}
                    {savedCount > 0 && (
                      <span>• {savedCount} saved</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isGrading ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          Grading {currentGradingIndex + 1} of {extractedStudents.length}
                        </p>
                        <Progress 
                          value={(currentGradingIndex / extractedStudents.length) * 100} 
                          className="w-32 h-2"
                        />
                      </div>
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : completedCount === extractedStudents.length ? (
                    <>
                      {canSave && (
                        <Button variant="default" onClick={saveAllResults} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save to Database ({assignedCount})
                            </>
                          )}
                        </Button>
                      )}
                      {savedCount === completedCount && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          All Saved
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Button variant="hero" onClick={gradeAllStudents}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Grade All ({extractedStudents.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Results Grid */}
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-4">
              {extractedStudents.map((student) => {
                const assignedRosterStudent = rosterStudents.find(s => s.id === student.assignedStudentId);
                
                return (
                  <Card 
                    key={student.id} 
                    className={cn(
                      "overflow-hidden transition-all",
                      student.status === 'saved' ? 'ring-2 ring-blue-500/30' :
                      student.status === 'completed' ? 'ring-2 ring-green-500/30' :
                      student.status === 'failed' ? 'ring-2 ring-destructive/30' :
                      student.status === 'analyzing' ? 'ring-2 ring-primary/50 animate-pulse' :
                      ''
                    )}
                  >
                    <div 
                      className="relative cursor-pointer group/img"
                      onClick={() => openStudentZoom(student.id)}
                      title="Click to zoom and inspect"
                    >
                      <img 
                        src={student.croppedImageBase64} 
                        alt={`Student ${student.id}`}
                        className="w-full h-24 object-cover"
                      />
                      {/* Zoom hint overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white" />
                      </div>
                      {student.status === 'analyzing' && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}
                      {(student.status === 'completed' || student.status === 'saved') && student.result && (
                        <div className="absolute top-1 right-1 flex gap-1">
                          {student.status === 'saved' && (
                            <Badge variant="default" className="bg-blue-500">
                              <CheckCircle className="h-3 w-3" />
                            </Badge>
                          )}
                          <Badge 
                            variant={student.result.percentage >= 70 ? 'default' : 'destructive'}
                            className={student.result.percentage >= 70 ? 'bg-green-500' : ''}
                          >
                            {student.result.percentage}%
                          </Badge>
                        </div>
                      )}
                      {student.status === 'failed' && (
                        <div className="absolute top-1 right-1">
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3" />
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2 space-y-2">
                      {/* Roster Assignment */}
                      {rosterStudents.length > 0 && student.status !== 'saved' ? (
                        <Select
                          value={student.assignedStudentId || ''}
                          onValueChange={(value) => assignStudent(student.id, value === '__unassign__' ? null : (value || null))}
                          disabled={isGrading || isSaving}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Assign student..." />
                          </SelectTrigger>
                          <SelectContent>
                            {student.assignedStudentId && (
                              <SelectItem value="__unassign__">Unassign</SelectItem>
                            )}
                            {assignedRosterStudent && (
                              <SelectItem value={assignedRosterStudent.id}>
                                {assignedRosterStudent.last_name}, {assignedRosterStudent.first_name}
                              </SelectItem>
                            )}
                            {availableRosterStudents.map((rs) => (
                              <SelectItem key={rs.id} value={rs.id}>
                                {rs.last_name}, {rs.first_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs font-medium truncate">
                          {assignedRosterStudent 
                            ? `${assignedRosterStudent.last_name}, ${assignedRosterStudent.first_name}`
                            : student.studentName || `Student ${student.id.split('-')[1]}`}
                        </p>
                      )}

                      {(student.status === 'completed' || student.status === 'saved') && student.result && (
                        <Collapsible 
                          open={expandedResults.has(student.id)}
                          onOpenChange={() => toggleResultExpanded(student.id)}
                        >
                          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
                            {expandedResults.has(student.id) ? (
                              <>Hide <ChevronUp className="h-3 w-3" /></>
                            ) : (
                              <>Details <ChevronDown className="h-3 w-3" /></>
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <p className="text-xs text-muted-foreground">
                              {student.result.score}/{student.result.maxScore} points
                            </p>
                            {student.result.feedback && (
                              <p className="text-xs mt-1 line-clamp-3">{student.result.feedback}</p>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      {student.status === 'failed' && (
                        <p className="text-xs text-destructive">{student.error}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setOriginalImage(null);
                setExtractedStudents([]);
              }}
              disabled={isGrading || isSaving}
            >
              Start Over
            </Button>
          </div>
        </div>
      )}
      {/* Camera Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => {
          setShowCamera(false);
          setRescanImageId(null);
        }}
        onCapture={handleCameraCapture}
      />

      {/* Zoom Dialog for pinch-to-zoom inspection and corner editing */}
      <Dialog open={zoomDialogOpen} onOpenChange={closeZoomDialog}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-2 flex-shrink-0">
            <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>{isEditingCorners ? 'Adjust Paper Corners' : 'Inspect Image'}</span>
              <div className="flex items-center gap-2">
                {isEditingCorners ? (
                  <>
                    <Button variant="outline" size="sm" onClick={cancelEditingCorners}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveEditedCorners} className="bg-green-600 hover:bg-green-700">
                      <Check className="h-4 w-4 mr-1" />
                      Save Corners
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={startEditingCorners}
                      className="gap-1"
                    >
                      <Move className="h-4 w-4" />
                      Edit Corners
                    </Button>
                    <Button variant="outline" size="sm" onClick={zoomOut} disabled={zoomScale <= 0.5}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-16 text-center">{Math.round(zoomScale * 100)}%</span>
                    <Button variant="outline" size="sm" onClick={zoomIn} disabled={zoomScale >= 5}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetZoom}>
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {isEditingCorners ? (
            /* Corner editing mode */
            <div 
              className="flex-1 overflow-hidden p-4"
              onMouseMove={handleCornerMouseMove}
              onMouseUp={handleCornerEnd}
              onMouseLeave={handleCornerEnd}
              onTouchMove={handleCornerTouchMove}
              onTouchEnd={handleCornerEnd}
            >
              {zoomImageId && batchImages.find(img => img.id === zoomImageId) && (
                <div className="h-full flex items-center justify-center">
                  <div 
                    ref={imageContainerRef}
                    className="relative max-h-full max-w-full"
                    style={{ touchAction: 'none' }}
                  >
                    <img 
                      src={batchImages.find(img => img.id === zoomImageId)?.dataUrl} 
                      alt="Edit corners"
                      className="max-h-[55vh] max-w-full object-contain rounded-lg"
                      draggable={false}
                    />
                    {/* Corner overlay with polygon and draggable handles */}
                    {editableCorners && (
                      <svg 
                        className="absolute inset-0 w-full h-full pointer-events-none" 
                        style={{ touchAction: 'none' }}
                      >
                        {/* Semi-transparent overlay outside the polygon */}
                        <defs>
                          <mask id="cornerMask">
                            <rect width="100%" height="100%" fill="white" />
                            <polygon
                              points={`${editableCorners.topLeft.x * 100}%,${editableCorners.topLeft.y * 100}% ${editableCorners.topRight.x * 100}%,${editableCorners.topRight.y * 100}% ${editableCorners.bottomRight.x * 100}%,${editableCorners.bottomRight.y * 100}% ${editableCorners.bottomLeft.x * 100}%,${editableCorners.bottomLeft.y * 100}%`}
                              fill="black"
                            />
                          </mask>
                        </defs>
                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.4)" mask="url(#cornerMask)" />
                        
                        {/* Edge lines */}
                        <polygon
                          points={`${editableCorners.topLeft.x * 100}%,${editableCorners.topLeft.y * 100}% ${editableCorners.topRight.x * 100}%,${editableCorners.topRight.y * 100}% ${editableCorners.bottomRight.x * 100}%,${editableCorners.bottomRight.y * 100}% ${editableCorners.bottomLeft.x * 100}%,${editableCorners.bottomLeft.y * 100}%`}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="3"
                        />
                        
                        {/* Corner handles */}
                        {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((corner) => (
                          <g key={corner}>
                            <circle
                              cx={`${editableCorners[corner].x * 100}%`}
                              cy={`${editableCorners[corner].y * 100}%`}
                              r="12"
                              fill="hsl(var(--primary))"
                              stroke="white"
                              strokeWidth="3"
                              className="pointer-events-auto cursor-grab active:cursor-grabbing"
                              style={{ touchAction: 'none' }}
                              onMouseDown={handleCornerMouseDown(corner)}
                              onTouchStart={handleCornerTouchStart(corner)}
                            />
                            <circle
                              cx={`${editableCorners[corner].x * 100}%`}
                              cy={`${editableCorners[corner].y * 100}%`}
                              r="4"
                              fill="white"
                              className="pointer-events-none"
                            />
                          </g>
                        ))}
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Normal zoom mode */
            <div 
              ref={zoomContainerRef}
              className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing touch-none"
              onWheel={handleZoomWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {zoomImageId && batchImages.find(img => img.id === zoomImageId) && (
                <div className="h-full flex items-center justify-center p-4">
                  <div 
                    style={{ transform: `scale(${zoomScale}) translate(${zoomPosition.x / zoomScale}px, ${zoomPosition.y / zoomScale}px)` }} 
                    className="transition-transform duration-75 relative"
                  >
                    <img 
                      src={batchImages.find(img => img.id === zoomImageId)?.dataUrl} 
                      alt="Zoomed image"
                      className="max-h-[60vh] max-w-full object-contain rounded-lg"
                      draggable={false}
                    />
                    {/* Show detected edges overlay */}
                    {editableCorners && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <polygon
                          points={`${editableCorners.topLeft.x * 100}%,${editableCorners.topLeft.y * 100}% ${editableCorners.topRight.x * 100}%,${editableCorners.topRight.y * 100}% ${editableCorners.bottomRight.x * 100}%,${editableCorners.bottomRight.y * 100}% ${editableCorners.bottomLeft.x * 100}%,${editableCorners.bottomLeft.y * 100}%`}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                          strokeDasharray="8 4"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground text-center pb-4 flex-shrink-0">
            {isEditingCorners 
              ? 'Drag the corner handles to adjust paper edges • Tap Save when done'
              : 'Pinch to zoom on touch devices • Scroll to zoom on desktop • Drag to pan when zoomed'
            }
          </p>
        </DialogContent>
      </Dialog>

      {/* Student Work Zoom Dialog */}
      <Dialog open={studentZoomOpen} onOpenChange={closeStudentZoom}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 flex-shrink-0">
            <DialogTitle className="flex items-center justify-between gap-4">
              <span>
                {studentZoomId && (() => {
                  const student = extractedStudents.find(s => s.id === studentZoomId);
                  const assignedRosterStudent = student?.assignedStudentId 
                    ? rosterStudents.find(r => r.id === student.assignedStudentId)
                    : null;
                  return assignedRosterStudent 
                    ? `${assignedRosterStudent.first_name} ${assignedRosterStudent.last_name}'s Work`
                    : student?.studentName || `Student Work`;
                })()}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={studentZoomOut} disabled={studentZoomScale <= 0.5}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-16 text-center">{Math.round(studentZoomScale * 100)}%</span>
                <Button variant="outline" size="sm" onClick={studentZoomIn} disabled={studentZoomScale >= 5}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={resetStudentZoom}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div 
            ref={studentZoomContainerRef}
            className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing touch-none"
            onWheel={handleStudentZoomWheel}
            onTouchStart={handleStudentTouchStart}
            onTouchMove={handleStudentTouchMove}
            onTouchEnd={handleStudentTouchEnd}
          >
            {studentZoomId && extractedStudents.find(s => s.id === studentZoomId) && (
              <div className="h-full flex items-center justify-center p-4">
                <div 
                  style={{ transform: `scale(${studentZoomScale}) translate(${studentZoomPosition.x / studentZoomScale}px, ${studentZoomPosition.y / studentZoomScale}px)` }} 
                  className="transition-transform duration-75"
                >
                  <img 
                    src={extractedStudents.find(s => s.id === studentZoomId)?.croppedImageBase64} 
                    alt="Student work zoomed"
                    className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg"
                    draggable={false}
                  />
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground text-center pb-4 flex-shrink-0">
            Pinch to zoom on touch devices • Scroll to zoom on desktop • Drag to pan when zoomed
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
