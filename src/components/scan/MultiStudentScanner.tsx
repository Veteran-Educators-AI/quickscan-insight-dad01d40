import { useState, useRef, useEffect } from 'react';
import { Users, Upload, Loader2, Wand2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Save, UserCheck, GraduationCap, Square, Camera, Plus, X, Layers, ImageIcon, RefreshCw, AlertTriangle } from 'lucide-react';
import { resizeImage, blobToBase64 } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { ManualRegionDrawer } from './ManualRegionDrawer';
import { CameraModal } from './CameraModal';

interface BatchImage {
  id: string;
  dataUrl: string;
  timestamp: Date;
  quality?: 'good' | 'medium' | 'poor';
  blurScore?: number;
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
      // Run blur detection
      const qualityResult = await detectImageBlur(imageDataUrl);
      
      if (rescanImageId) {
        // Re-scanning a specific image - replace it
        setBatchImages(prev => prev.map(img => 
          img.id === rescanImageId 
            ? { ...img, dataUrl: imageDataUrl, timestamp: new Date(), ...qualityResult }
            : img
        ));
        setShowCamera(false);
        setRescanImageId(null);
        
        if (qualityResult.quality === 'poor') {
          toast.warning('Image replaced, but quality is still low. Consider re-scanning.');
        } else {
          toast.success('Image replaced successfully!');
        }
      } else {
        // In batch mode, add to batch collection
        const newBatchImage: BatchImage = {
          id: `batch-${Date.now()}`,
          dataUrl: imageDataUrl,
          timestamp: new Date(),
          ...qualityResult,
        };
        setBatchImages(prev => [...prev, newBatchImage]);
        setShowCamera(false);
        
        if (qualityResult.quality === 'poor') {
          toast.warning(`Photo ${batchImages.length + 1} captured but appears blurry. Consider re-scanning.`);
        } else {
          toast.success(`Photo ${batchImages.length + 1} captured! Add more or process all.`);
        }
      }
    } else {
      setOriginalImage(imageDataUrl);
      setExtractedStudents([]);
      setShowCamera(false);
      toast.success('Photo captured! Now extract student regions.');
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
      let poorQualityCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const resizedBlob = await resizeImage(file);
          const dataUrl = await blobToBase64(resizedBlob);
          const qualityResult = await detectImageBlur(dataUrl);
          
          if (qualityResult.quality === 'poor') poorQualityCount++;
          
          const newBatchImage: BatchImage = {
            id: `batch-${Date.now()}-${i}`,
            dataUrl,
            timestamp: new Date(),
            ...qualityResult,
          };
          setBatchImages(prev => [...prev, newBatchImage]);
        } catch (err) {
          console.error('Error resizing image:', err);
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            const qualityResult = await detectImageBlur(dataUrl);
            
            if (qualityResult.quality === 'poor') poorQualityCount++;
            
            const newBatchImage: BatchImage = {
              id: `batch-${Date.now()}-${i}`,
              dataUrl,
              timestamp: new Date(),
              ...qualityResult,
            };
            setBatchImages(prev => [...prev, newBatchImage]);
          };
          reader.readAsDataURL(file);
        }
      }
      
      if (poorQualityCount > 0) {
        toast.warning(`Added ${files.length} image(s). ${poorQualityCount} appear blurry - consider re-scanning.`);
      } else {
        toast.success(`Added ${files.length} image(s) to batch!`);
      }
    }
    e.target.value = '';
  };

  const removeBatchImage = (id: string) => {
    setBatchImages(prev => prev.filter(img => img.id !== id));
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
                    accept="image/*"
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBatchImages([])}
                          className="text-destructive hover:text-destructive"
                        >
                          Clear All
                        </Button>
                      </div>
                      
                      <ScrollArea className="w-full">
                        <div className="flex gap-3 pb-2">
                          {batchImages.map((img, index) => (
                            <div 
                              key={img.id} 
                              className={cn(
                                "relative flex-shrink-0 group",
                                img.quality === 'poor' && "ring-2 ring-destructive ring-offset-2"
                              )}
                            >
                              <img 
                                src={img.dataUrl} 
                                alt={`Batch image ${index + 1}`}
                                className={cn(
                                  "h-24 w-24 object-cover rounded-lg border",
                                  img.quality === 'poor' && "opacity-80"
                                )}
                              />
                              {/* Image number badge */}
                              <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                {index + 1}
                              </div>
                              
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
                              {img.quality === 'poor' && (
                                <div className="absolute bottom-0 left-0 right-0 bg-destructive text-destructive-foreground text-[10px] text-center py-0.5 rounded-b-lg">
                                  Blurry
                                </div>
                              )}
                              
                              {/* Action buttons overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
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
                        accept="image/*"
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
                    <div className="relative">
                      <img 
                        src={student.croppedImageBase64} 
                        alt={`Student ${student.id}`}
                        className="w-full h-24 object-cover"
                      />
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
    </div>
  );
}
