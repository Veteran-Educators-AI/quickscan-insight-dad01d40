import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, RotateCcw, Layers, Play, Plus, Sparkles, User, Bot, Wand2, Clock, Save, CheckCircle, Users, QrCode, FileQuestion, FileImage, UserCheck, GraduationCap, ScanLine, AlertTriangle, XCircle, FileStack, ShieldCheck, RefreshCw, FileText, Brain, BookOpen } from 'lucide-react';
import { resizeImage, blobToBase64, compressImage } from '@/lib/imageUtils';
import { pdfToImages, isPdfFile } from '@/lib/pdfUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SaveAnalyticsConfirmDialog } from '@/components/scan/SaveAnalyticsConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { CameraModal } from '@/components/scan/CameraModal';
import { ContinuousQRScanner } from '@/components/scan/ContinuousQRScanner';
import { ImagePreview } from '@/components/scan/ImagePreview';
import { AnalysisResults } from '@/components/scan/AnalysisResults';
import { BatchQueue } from '@/components/scan/BatchQueue';
import { BatchReport } from '@/components/scan/BatchReport';
import { ClassStudentSelector, useClassStudents } from '@/components/scan/ClassStudentSelector';
import { ScanClassStudentPicker, useStudentName } from '@/components/scan/ScanClassStudentPicker';
import { ScanQuestionSelector } from '@/components/scan/ScanQuestionSelector';
import { SaveForLaterTab } from '@/components/scan/SaveForLaterTab';
import { SyncStatusIndicator } from '@/components/scan/SyncStatusIndicator';
import { AILearningProgress } from '@/components/scan/AILearningProgress';
import { AITrainingWizard } from '@/components/scan/AITrainingWizard';
import { TeacherAnswerKeyDialog } from '@/components/scan/TeacherAnswerKeyDialog';
import { useAnalyzeStudentWork } from '@/hooks/useAnalyzeStudentWork';
import { useBatchAnalysis } from '@/hooks/useBatchAnalysis';
import { usePendingScans } from '@/hooks/usePendingScans';
import { useSaveAnalysisResults } from '@/hooks/useSaveAnalysisResults';
import { useQRCodeScanner } from '@/hooks/useQRCodeScanner';
import { useQRScanSettings } from '@/hooks/useQRScanSettings';
import { useStudentIdentification } from '@/hooks/useStudentIdentification';
import { useNameCorrections } from '@/hooks/useNameCorrections';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { ManualScoringForm } from '@/components/scan/ManualScoringForm';
import { MultiStudentScanner } from '@/components/scan/MultiStudentScanner';
import { ScannerImportMode } from '@/components/scan/ScannerImportMode';
import { GradingModeSelector, GradingMode } from '@/components/scan/GradingModeSelector';
import { BatchGradingModeSelector, BatchGradingMode } from '@/components/scan/BatchGradingModeSelector';
import { GradingComparisonView } from '@/components/scan/GradingComparisonView';
import { GoogleClassroomImport, type ImportedSubmission } from '@/components/scan/GoogleClassroomImport';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

type ScanState = 'idle' | 'camera' | 'preview' | 'choose-method' | 'upload-solution' | 'analyzed' | 'manual-scoring' | 'analyze-saved' | 'comparison';
type ScanMode = 'single' | 'batch' | 'saved' | 'scanner';

interface ManualResult {
  rubricScores: { criterion: string; score: number; maxScore: number; feedback: string }[];
  totalScore: { earned: number; possible: number; percentage: number };
  feedback: string;
  misconceptions: string[];
}

export default function Scan() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);
  
  const [scanMode, setScanMode] = useState<ScanMode>('single');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [solutionImage, setSolutionImage] = useState<string | null>(null);
  const [showBatchReport, setShowBatchReport] = useState(false);
  const [gradingMode, setGradingMode] = useState<GradingMode>('ai');
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);
  const [batchCameraMode, setBatchCameraMode] = useState(false);
  const [answerGuideImage, setAnswerGuideImage] = useState<string | null>(null);
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [selectedAnalysisResult, setSelectedAnalysisResult] = useState<'ai' | 'teacher-guided' | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchSavedStudents, setBatchSavedStudents] = useState<Set<string>>(new Set());
  const [showBatchGradingModeSelector, setShowBatchGradingModeSelector] = useState(false);
  const [batchAnswerGuideImage, setBatchAnswerGuideImage] = useState<string | null>(null);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  
  const solutionInputRef = useRef<HTMLInputElement>(null);

  // Class & student selection for batch mode
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const { students } = useClassStudents(selectedClassId);
  
  // Single scan class/student selection
  const [singleScanClassId, setSingleScanClassId] = useState<string | null>(null);
  const [singleScanStudentId, setSingleScanStudentId] = useState<string | null>(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const { students: singleScanStudents } = useClassStudents(singleScanClassId);

  const { analyze, analyzeWithTeacherGuide, runBothAnalyses, compareWithSolution, cancelAnalysis, isAnalyzing, isComparing, error, result, teacherGuidedResult, rawAnalysis, comparisonResult } = useAnalyzeStudentWork();
  const batch = useBatchAnalysis();
  const { pendingScans, refresh: refreshPendingScans, updateScanStatus } = usePendingScans();
  const { saveResults, saveMultiQuestionResults, isSaving, syncStatus, resetSyncStatus } = useSaveAnalysisResults();
  const { scanImageForQR, isScanning: isQRScanning, scanResult: qrScanResult, clearResult: clearQRResult } = useQRCodeScanner();
  const { settings: qrScanSettings } = useQRScanSettings();
  const { identifyStudent, isIdentifying, identificationResult, clearResult: clearIdentification } = useStudentIdentification();
  
  const [analyzingScanId, setAnalyzingScanId] = useState<string | null>(null);
  const [analyzingScanStudentId, setAnalyzingScanStudentId] = useState<string | null>(null);
  // Track question IDs for multi-question analysis
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [resultsSaved, setResultsSaved] = useState(false);
  const [multiQuestionResults, setMultiQuestionResults] = useState<Record<string, any>>({});
  
  // QR code detection state - now supports student-only QR codes
  const [detectedQR, setDetectedQR] = useState<{ studentId: string; questionId?: string; type: 'student-only' | 'student-question' } | null>(null);
  
  // Auto-identified student state
  const [autoIdentifiedStudent, setAutoIdentifiedStudent] = useState<{
    studentId: string;
    studentName: string;
    confidence: 'learned' | 'high' | 'medium' | 'low' | 'none';
    handwrittenName?: string | null;
  } | null>(null);
  
  // Name corrections for learning from teacher corrections
  const { 
    corrections, 
    fetchCorrections, 
    saveCorrection, 
    findLearnedMatch,
    isSaving: isSavingCorrection 
  } = useNameCorrections(singleScanClassId);
  
  // Fetch corrections when class changes
  useEffect(() => {
    if (singleScanClassId) {
      fetchCorrections();
    }
  }, [singleScanClassId, fetchCorrections]);
  
  // Get student name for display
  const currentStudentId = detectedQR?.studentId || singleScanStudentId || analyzingScanStudentId;
  const studentName = useStudentName(currentStudentId);
  
  // Confirmation dialog state
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  // Multi-student grading mode
  const [showMultiStudentScanner, setShowMultiStudentScanner] = useState(false);
  
  // Continuous QR scanner mode
  const [showContinuousQRScanner, setShowContinuousQRScanner] = useState(false);
  
  // Scanner import pages
  const [scannerImportPages, setScannerImportPages] = useState<{ dataUrl: string; order: number }[]>([]);
  
  // Camera permission
  const { status: cameraStatus, canUseCamera, requestPermission, error: cameraError, hasCamera } = useCameraPermission();
  
  // AI suggestions for manual scoring
  const [aiSuggestions, setAiSuggestions] = useState<{
    scores: { criterion: string; score: number; maxScore: number; feedback: string }[];
    misconceptions: string[];
    feedback: string;
  } | null>(null);

  // Teacher answer key dialog
  const [showAnswerKeyDialog, setShowAnswerKeyDialog] = useState(false);
  const [answerKeyClassName, setAnswerKeyClassName] = useState<string | undefined>(undefined);
  
  // AI Training wizard
  const [showAITrainingWizard, setShowAITrainingWizard] = useState(false);
  
  // Google Classroom import
  const [showGoogleClassroomImport, setShowGoogleClassroomImport] = useState(false);

  // Mock rubric steps
  const mockRubricSteps = [
    { step_number: 1, description: 'Correctly identifies the problem type', points: 1 },
    { step_number: 2, description: 'Sets up equations/approach correctly', points: 2 },
    { step_number: 3, description: 'Shows clear work and reasoning', points: 2 },
    { step_number: 4, description: 'Arrives at correct answer', points: 1 },
  ];

  const handleCameraCapture = useCallback(async (imageDataUrl: string) => {
    // Compress image on capture to prevent memory issues on mobile
    try {
      const compressed = await compressImage(imageDataUrl, 1200, 0.8);
      setCapturedImage(compressed);
    } catch (error) {
      console.warn('Compression failed, using original:', error);
      setCapturedImage(imageDataUrl);
    }
    setScanState('preview');
    setBatchCameraMode(false);
  }, []);

  const handleBatchCameraComplete = useCallback(async (images: string[]) => {
    if (images.length === 0) return;
    
    toast.info(`Processing ${images.length} captured image(s)...`);
    
    // Process all images with auto-identification if class is selected
    for (const imageDataUrl of images) {
      // Compress each image before processing to prevent memory issues
      let processedImage = imageDataUrl;
      try {
        processedImage = await compressImage(imageDataUrl, 1200, 0.8);
      } catch (error) {
        console.warn('Compression failed for batch image:', error);
      }
      
      if (selectedClassId && students.length > 0) {
        await batch.addImageWithAutoIdentify(processedImage, students);
      } else if (singleScanClassId && singleScanStudents.length > 0) {
        await batch.addImageWithAutoIdentify(processedImage, singleScanStudents);
      } else {
        batch.addImage(processedImage);
      }
    }
    
    // Switch to batch mode automatically
    setScanMode('batch');
    toast.success(`Added ${images.length} image(s) to batch${(selectedClassId || singleScanClassId) ? ' with auto-identification' : ''}`);
    setBatchCameraMode(false);
  }, [batch, selectedClassId, singleScanClassId, students, singleScanStudents]);

  const handlePreviewConfirm = useCallback(async (finalImageDataUrl: string) => {
    if (scanMode === 'batch') {
      // Auto-identify student if a class is selected
      if (selectedClassId && students.length > 0) {
        toast.info('Adding image & identifying student...');
        await batch.addImageWithAutoIdentify(finalImageDataUrl, students);
        toast.success('Image added with auto-identification');
      } else {
        batch.addImage(finalImageDataUrl);
        toast.success('Image added to batch');
      }
      setCapturedImage(null);
      setScanState('idle');
    } else {
      setFinalImage(finalImageDataUrl);
      setCapturedImage(null);
      setAutoIdentifiedStudent(null);
      
      // Move to choose-method state immediately so user can see their image
      setScanState('choose-method');
      
      // Only try QR detection if auto QR scanning is enabled
      if (qrScanSettings.autoQRScanEnabled) {
        // Try to detect QR code in the background (fast local scan with timeout)
        const qrResult = await scanImageForQR(finalImageDataUrl);
        
        if (qrResult) {
          setDetectedQR(qrResult);
          setSingleScanStudentId(qrResult.studentId);
          
          // Only set question ID if it's a student+question QR code
          if (qrResult.type === 'student-question' && qrResult.questionId) {
            setSelectedQuestionIds([qrResult.questionId]);
            toast.success('QR code detected! Student and question auto-identified.', {
              icon: <QrCode className="h-4 w-4" />,
            });
          } else {
            toast.success('Student QR code detected! Student auto-identified.', {
              icon: <QrCode className="h-4 w-4" />,
            });
          }
          return; // QR found, no need for name identification
        }
      }
      
      // No QR code found (or QR scanning disabled) - try learned corrections first, then AI-based name recognition
      setDetectedQR(null);
      if (singleScanClassId && singleScanStudents.length > 0) {
        const identResult = await identifyStudent(finalImageDataUrl, singleScanStudents);
        
        // Check if we have a learned correction for this handwritten name
        const learnedMatch = findLearnedMatch(identResult?.handwrittenName, singleScanStudents);
        
        if (learnedMatch) {
          // Use learned correction (highest confidence)
          setAutoIdentifiedStudent({
            studentId: learnedMatch.studentId,
            studentName: learnedMatch.studentName,
            confidence: 'learned',
            handwrittenName: identResult?.handwrittenName,
          });
          setSingleScanStudentId(learnedMatch.studentId);
          toast.success('Student identified from learned correction!', {
            icon: <GraduationCap className="h-4 w-4" />,
          });
        } else if (identResult?.matchedStudentId) {
          setAutoIdentifiedStudent({
            studentId: identResult.matchedStudentId,
            studentName: identResult.matchedStudentName || 'Unknown',
            confidence: identResult.confidence,
            handwrittenName: identResult.handwrittenName,
          });
          setSingleScanStudentId(identResult.matchedStudentId);
          
          // Also set question ID if detected via QR
          if (identResult.matchedQuestionId) {
            setSelectedQuestionIds([identResult.matchedQuestionId]);
          }
        } else if (identResult?.handwrittenName) {
          // Name detected but no match
          setAutoIdentifiedStudent({
            studentId: '',
            studentName: identResult.handwrittenName,
            confidence: 'none',
            handwrittenName: identResult.handwrittenName,
          });
        }
      }
    }
  }, [scanMode, batch, selectedClassId, singleScanClassId, students, singleScanStudents, scanImageForQR, identifyStudent, findLearnedMatch, qrScanSettings.autoQRScanEnabled]);

  const handleSolutionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedBlob = await resizeImage(file);
        const dataUrl = await blobToBase64(resizedBlob);
        setSolutionImage(dataUrl);
        toast.success('Solution uploaded!');
      } catch (err) {
        console.error('Error resizing image:', err);
        // Fallback to original file
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setSolutionImage(dataUrl);
          toast.success('Solution uploaded!');
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleChooseAI = () => {
    setGradingMode('ai');
    analyzeImage();
  };

  const handleChooseTeacherGuided = async (guideImage: string) => {
    if (!finalImage) return;
    setGradingMode('teacher-guided');
    setAnswerGuideImage(guideImage);
    
    toast.info('Analyzing with your answer guide...');
    const analysisResult = await analyzeWithTeacherGuide(finalImage, guideImage, {
      questionId: selectedQuestionIds[0] || detectedQR?.questionId,
      rubricSteps: mockRubricSteps,
      studentName: studentName || undefined,
    });
    
    if (analysisResult) {
      setScanState('analyzed');
    }
  };

  const handleRunBothAnalyses = async (guideImage: string) => {
    if (!finalImage) return;
    setAnswerGuideImage(guideImage);
    
    toast.info('Running both AI and teacher-guided analysis for comparison...');
    const { aiResult, teacherGuidedResult: tgResult } = await runBothAnalyses(finalImage, guideImage, {
      questionId: selectedQuestionIds[0] || detectedQR?.questionId,
      rubricSteps: mockRubricSteps,
      studentName: studentName || undefined,
    });
    
    if (aiResult && tgResult) {
      setShowComparisonView(true);
      setScanState('comparison');
    } else if (aiResult) {
      toast.warning('Teacher-guided analysis failed. Showing AI result only.');
      setScanState('analyzed');
    } else if (tgResult) {
      toast.warning('AI analysis failed. Showing teacher-guided result only.');
      setScanState('analyzed');
    }
  };

  const handleSelectComparisonResult = (selectedResult: any, source: 'ai' | 'teacher-guided') => {
    setSelectedAnalysisResult(source);
    setShowComparisonView(false);
    setScanState('analyzed');
    toast.success(`Using ${source === 'ai' ? 'AI' : 'teacher-guided'} analysis result`);
  };

  const handleChooseTeacherManual = () => {
    setGradingMode('teacher-manual');
    setScanState('upload-solution');
  };

  const handleProceedWithComparison = async () => {
    // If solution is uploaded, get AI suggestions
    if (solutionImage && finalImage) {
      toast.info('Getting AI suggestions...');
      const comparison = await compareWithSolution(finalImage, solutionImage, mockRubricSteps);
      
      if (comparison) {
        // Map AI suggestions to the form format
        const mappedScores = mockRubricSteps.map((step, index) => {
          const suggested = comparison.suggestedScores[index];
          return {
            criterion: step.description,
            score: suggested?.score || 0,
            maxScore: step.points,
            feedback: suggested?.feedback || '',
          };
        });
        
        setAiSuggestions({
          scores: mappedScores,
          misconceptions: comparison.misconceptions,
          feedback: comparison.feedback,
        });
        toast.success('AI suggestions ready!');
      }
    }
    
    setScanState('manual-scoring');
  };

  const handleSkipToScoring = () => {
    setAiSuggestions(null);
    setScanState('manual-scoring');
  };

  const handlePreviewRetake = useCallback(() => {
    setCapturedImage(null);
    setScanState('camera');
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Check if it's a PDF
        if (isPdfFile(file)) {
          toast.info('Converting PDF to images...');
          const images = await pdfToImages(file);
          if (images.length === 0) {
            toast.error('Could not extract pages from PDF');
            return;
          }
          // For single scan, use the first page
          setCapturedImage(images[0]);
          setScanState('preview');
          if (images.length > 1) {
            toast.info(`PDF has ${images.length} pages. First page loaded. Use Batch mode for multi-page PDFs.`);
          }
        } else {
          const resizedBlob = await resizeImage(file);
          const dataUrl = await blobToBase64(resizedBlob);
          setCapturedImage(dataUrl);
          setScanState('preview');
        }
      } catch (err) {
        console.error('Error processing file:', err);
        // Fallback to original file (for images only)
        if (!isPdfFile(file)) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setCapturedImage(dataUrl);
            setScanState('preview');
          };
          reader.readAsDataURL(file);
        } else {
          toast.error('Failed to process PDF file');
        }
      }
    }
    e.target.value = '';
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileCount = files.length;
    toast.info(`Processing ${fileCount} file(s)...`);
    
    let totalPages = 0;
    
    // Process files with auto-identification if class is selected
    const processFile = async (file: File) => {
      try {
        // Check if it's a PDF
        if (isPdfFile(file)) {
          const images = await pdfToImages(file);
          for (const dataUrl of images) {
            if (selectedClassId && students.length > 0) {
              await batch.addImageWithAutoIdentify(dataUrl, students);
            } else {
              batch.addImage(dataUrl);
            }
            totalPages++;
          }
        } else {
          const resizedBlob = await resizeImage(file);
          const dataUrl = await blobToBase64(resizedBlob);
          if (selectedClassId && students.length > 0) {
            await batch.addImageWithAutoIdentify(dataUrl, students);
          } else {
            batch.addImage(dataUrl);
          }
          totalPages++;
        }
      } catch (err) {
        console.error('Error processing file:', err);
        // Fallback to original file (for images only)
        if (!isPdfFile(file)) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            if (selectedClassId && students.length > 0) {
              await batch.addImageWithAutoIdentify(dataUrl, students);
            } else {
              batch.addImage(dataUrl);
            }
            totalPages++;
          };
          reader.readAsDataURL(file);
        } else {
          toast.error(`Failed to process PDF: ${file.name}`);
        }
      }
    };

    // Process all files
    await Promise.all(Array.from(files).map(processFile));
    
    toast.success(`Added ${totalPages} page(s) from ${fileCount} file(s)${selectedClassId ? ' with auto-identification' : ''}`);
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filter valid files (images and PDFs)
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      file.type === 'application/pdf' || 
      file.name.toLowerCase().endsWith('.pdf')
    );

    if (validFiles.length === 0) {
      toast.error('Please drop image or PDF files only');
      return;
    }

    // Single file in single mode
    if (scanMode === 'single' && validFiles.length === 1) {
      const file = validFiles[0];
      try {
        if (isPdfFile(file)) {
          toast.info('Converting PDF to images...');
          const images = await pdfToImages(file);
          if (images.length === 0) {
            toast.error('Could not extract pages from PDF');
            return;
          }
          setCapturedImage(images[0]);
          setScanState('preview');
          if (images.length > 1) {
            toast.info(`PDF has ${images.length} pages. First page loaded. Use Scanner mode for multi-page PDFs.`);
          }
        } else {
          const resizedBlob = await resizeImage(file);
          const dataUrl = await blobToBase64(resizedBlob);
          setCapturedImage(dataUrl);
          setScanState('preview');
        }
        toast.success('Image loaded from drop');
      } catch (err) {
        console.error('Error processing dropped file:', err);
        toast.error('Failed to process dropped file');
      }
    } else {
      // Multiple files or in scanner mode - process as batch
      toast.info(`Processing ${validFiles.length} dropped file(s)...`);
      let totalPages = 0;

      for (const file of validFiles) {
        try {
          if (isPdfFile(file)) {
            const images = await pdfToImages(file);
            for (const dataUrl of images) {
              if (singleScanClassId && singleScanStudents.length > 0) {
                await batch.addImageWithAutoIdentify(dataUrl, singleScanStudents);
              } else if (selectedClassId && students.length > 0) {
                await batch.addImageWithAutoIdentify(dataUrl, students);
              } else {
                batch.addImage(dataUrl);
              }
              totalPages++;
            }
          } else {
            const resizedBlob = await resizeImage(file);
            const dataUrl = await blobToBase64(resizedBlob);
            if (singleScanClassId && singleScanStudents.length > 0) {
              await batch.addImageWithAutoIdentify(dataUrl, singleScanStudents);
            } else if (selectedClassId && students.length > 0) {
              await batch.addImageWithAutoIdentify(dataUrl, students);
            } else {
              batch.addImage(dataUrl);
            }
            totalPages++;
          }
        } catch (err) {
          console.error('Error processing dropped file:', err);
        }
      }

      if (totalPages > 0) {
        setScanMode('scanner');
        toast.success(`Added ${totalPages} page(s) to batch`);
      }
    }
  }, [scanMode, batch, selectedClassId, singleScanClassId, students, singleScanStudents]);

  const handleNativeCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedBlob = await resizeImage(file);
        const dataUrl = await blobToBase64(resizedBlob);
        setCapturedImage(dataUrl);
        setScanState('preview');
      } catch (err) {
        console.error('Error resizing image:', err);
        // Fallback to original file
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setCapturedImage(dataUrl);
          setScanState('preview');
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const analyzeImage = async () => {
    if (!finalImage) return;

    // Multi-question analysis
    if (selectedQuestionIds.length > 0) {
      const results: Record<string, any> = {};
      
      for (let i = 0; i < selectedQuestionIds.length; i++) {
        setCurrentQuestionIndex(i);
        toast.info(`Analyzing question ${i + 1} of ${selectedQuestionIds.length}...`);
        
        const analysisResult = await analyze(finalImage, selectedQuestionIds[i], mockRubricSteps);
        if (analysisResult) {
          results[selectedQuestionIds[i]] = analysisResult;
        }
      }
      
      setMultiQuestionResults(results);
      setScanState('analyzed');
      
      const totalQuestions = selectedQuestionIds.length;
      const successCount = Object.keys(results).length;
      toast.success(`Analysis complete! ${successCount}/${totalQuestions} questions analyzed`);
      
      if (analyzingScanId) {
        await updateScanStatus(analyzingScanId, 'analyzed');
        refreshPendingScans();
      }
    } else {
      // Single question (legacy flow)
      const analysisResult = await analyze(finalImage, undefined, mockRubricSteps);
      
      if (analysisResult) {
        setScanState('analyzed');
        toast.success('Analysis complete!', {
          description: `Score: ${analysisResult.totalScore.earned}/${analysisResult.totalScore.possible} (${analysisResult.totalScore.percentage}%)`,
        });
        if (analyzingScanId) {
          await updateScanStatus(analyzingScanId, 'analyzed');
          refreshPendingScans();
        }
      } else if (error) {
        toast.error('Analysis failed', { description: error });
      }
    }
  };

  const handleManualScoreSubmit = async (manualScoreResult: ManualResult) => {
    setManualResult(manualScoreResult);
    setScanState('analyzed');
    toast.success('Score saved!', {
      description: `Score: ${manualScoreResult.totalScore.earned}/${manualScoreResult.totalScore.possible} (${manualScoreResult.totalScore.percentage}%)`,
    });
    // Update saved scan status if analyzing a saved scan
    if (analyzingScanId) {
      await updateScanStatus(analyzingScanId, 'analyzed');
      refreshPendingScans();
    }
  };

  const openBatchGradingModeSelector = () => {
    if (batch.items.length === 0) {
      toast.error('Add images to the batch first');
      return;
    }
    setShowBatchGradingModeSelector(true);
  };

  const handleBatchGradingModeSelect = async (mode: BatchGradingMode, answerGuideImage?: string) => {
    setShowBatchGradingModeSelector(false);
    
    // Check if all items have students assigned
    const unassigned = batch.items.filter(item => !item.studentId);
    if (unassigned.length > 0 && selectedClassId) {
      toast.warning(`${unassigned.length} paper(s) don't have students assigned`);
    }

    if (mode === 'manual') {
      // Mark all items as needing manual scoring
      toast.info('Manual scoring mode selected. Grade each paper individually after reviewing.');
      return;
    }

    if (mode === 'teacher-guided' && answerGuideImage) {
      setBatchAnswerGuideImage(answerGuideImage);
      toast.info(`Starting teacher-guided analysis of ${batch.items.length} papers...`);
      await batch.startTeacherGuidedBatchAnalysis(answerGuideImage, mockRubricSteps);
    } else if (mode === 'ai-learned') {
      toast.info(`Starting AI analysis with your learned grading style...`);
      await batch.startBatchAnalysis(mockRubricSteps, 'teacher', undefined, undefined, true);
    } else {
      toast.info(`Starting AI analysis of ${batch.items.length} papers...`);
      await batch.startBatchAnalysis(mockRubricSteps);
    }
    
    const summary = batch.generateSummary();
    setShowBatchReport(true);
    
    toast.success('Batch analysis complete!', {
      description: `Average score: ${summary.averageScore}%`,
    });
  };

  const startBatchAnalysis = async () => {
    openBatchGradingModeSelector();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const summary = batch.summary;
    if (!summary) return;

    doc.setFontSize(20);
    doc.text('Class Grading Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Total Students: ${summary.totalStudents}`, 20, 35);
    doc.text(`Class Average: ${summary.averageScore}%`, 20, 45);
    doc.text(`Pass Rate: ${summary.passRate}%`, 20, 55);
    doc.text(`Score Range: ${summary.lowestScore}% - ${summary.highestScore}%`, 20, 65);

    doc.text('Individual Results:', 20, 80);
    
    let y = 90;
    batch.items
      .filter(item => item.status === 'completed' && item.result)
      .forEach((item, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(
          `${i + 1}. ${item.studentName}: ${item.result!.totalScore.earned}/${item.result!.totalScore.possible} (${item.result!.totalScore.percentage}%)`,
          20,
          y
        );
        y += 10;
      });

    doc.save('grading-report.pdf');
    toast.success('Report exported as PDF');
  };

  // Save all batch results to gradebook directly from BatchQueue
  const handleBatchSaveToGradebook = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to save results');
      return;
    }

    setBatchSaving(true);
    let successCount = 0;
    let failCount = 0;

    const completedItems = batch.items.filter(
      item => item.status === 'completed' && 
      item.result && 
      item.studentId && 
      item.pageType !== 'continuation' &&
      !batchSavedStudents.has(item.studentId)
    );

    try {
      for (const item of completedItems) {
        const result = item.result!;
        // Use overridden grade first, then grade, then percentage
        const effectiveGrade = result.overriddenGrade ?? result.grade ?? result.totalScore.percentage;
        const topicName = result.problemIdentified || 'General Assessment';
        const nysStandard = result.nysStandard || null;
        const regentsScore = result.regentsScore ?? null;
        const isOverridden = result.isOverridden || false;

        // Build justification with override info if applicable
        let gradeJustification = result.gradeJustification || result.feedback || null;
        if (isOverridden && result.overrideJustification) {
          gradeJustification = `TEACHER OVERRIDE: ${result.overrideJustification}. ${gradeJustification || ''}`;
        }

        // Save to grade_history
        const { error: gradeError } = await supabase
          .from('grade_history')
          .insert({
            student_id: item.studentId,
            topic_name: topicName,
            grade: effectiveGrade,
            grade_justification: gradeJustification,
            raw_score_earned: result.totalScore.earned || 0,
            raw_score_possible: result.totalScore.possible || 0,
            teacher_id: user.id,
            regents_score: regentsScore,
            nys_standard: nysStandard,
            regents_justification: result.regentsScoreJustification || null,
          });

        if (gradeError) {
          console.error('Error saving grade for', item.studentName, ':', gradeError);
          failCount++;
          continue;
        }

        successCount++;
        setBatchSavedStudents(prev => new Set([...prev, item.studentId!]));
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`Saved ${successCount} student grade(s) to gradebook!`, {
          icon: <Save className="h-4 w-4" />,
        });
      } else if (successCount > 0) {
        toast.warning(`${successCount} saved, ${failCount} failed`);
      } else if (failCount > 0) {
        toast.error('Failed to save grades to gradebook');
      } else {
        toast.info('No new grades to save');
      }
    } catch (err) {
      console.error('Batch save to gradebook error:', err);
      toast.error('Failed to save to gradebook');
    } finally {
      setBatchSaving(false);
    }
  };

  // Check if all batch items with students have been saved
  const allBatchSaved = batch.items.length > 0 && 
    batch.items.filter(i => i.status === 'completed' && i.studentId && i.pageType !== 'continuation')
      .every(i => batchSavedStudents.has(i.studentId!));

  const clearImage = () => {
    setFinalImage(null);
    setCapturedImage(null);
    setSolutionImage(null);
    setScanState('idle');
  };

  const startNewScan = () => {
    setFinalImage(null);
    setCapturedImage(null);
    setSolutionImage(null);
    setScanState('idle');
    setShowBatchReport(false);
    setManualResult(null);
    setAiSuggestions(null);
    setAnalyzingScanId(null);
    setAnalyzingScanStudentId(null);
    setSelectedQuestionIds([]);
    setCurrentQuestionIndex(0);
    setMultiQuestionResults({});
    setResultsSaved(false);
    setShowStudentPicker(false);
    setDetectedQR(null);
    setAutoIdentifiedStudent(null);
    setBatchSavedStudents(new Set());
    clearQRResult();
    clearIdentification();
    resetSyncStatus();
  };

  // Handle analyzing a saved scan with multiple questions
  const handleAnalyzeSavedScan = async (
    scan: { id: string; image_url: string; student_id: string | null },
    questionIds: string[]
  ) => {
    setAnalyzingScanId(scan.id);
    setAnalyzingScanStudentId(scan.student_id);
    setFinalImage(scan.image_url);
    setSelectedQuestionIds(questionIds);
    setCurrentQuestionIndex(0);
    setMultiQuestionResults({});
    setResultsSaved(false);
    setScanState('choose-method');
  };

  // Save multi-question analysis results to database
  const handleSaveResults = async () => {
    const studentId = currentStudentId;
    
    if (!studentId || Object.keys(multiQuestionResults).length === 0 || !finalImage) {
      toast.error('Missing student or results to save');
      return;
    }

    const success = await saveMultiQuestionResults(
      studentId,
      finalImage,
      multiQuestionResults,
      analyzingScanId || undefined
    );

    if (success) {
      setResultsSaved(true);
      refreshPendingScans();
    }
  };

  // Save single result to database
  const handleSaveSingleResult = async () => {
    const studentId = currentStudentId;
    
    if (!studentId) {
      toast.error('Please associate a student before saving');
      setShowStudentPicker(true);
      return;
    }
    
    // Use either AI result or manual result
    const resultToSave = result || (manualResult ? {
      ocrText: '',
      problemIdentified: '',
      approachAnalysis: '',
      rubricScores: manualResult.rubricScores,
      misconceptions: manualResult.misconceptions,
      totalScore: manualResult.totalScore,
      feedback: manualResult.feedback,
    } : null);
    
    if (!resultToSave || !finalImage) {
      toast.error('Missing analysis results to save');
      return;
    }

    // Check if we have a valid question ID
    const questionId = selectedQuestionIds[0] || detectedQR?.questionId;
    if (!questionId) {
      toast.error('No question selected. Please select a question from your library or use a QR-coded assessment.', {
        duration: 5000,
      });
      return;
    }

    const attemptId = await saveResults({
      studentId,
      questionId,
      imageUrl: finalImage,
      result: resultToSave,
    });

    if (attemptId) {
      setResultsSaved(true);
      toast.success('Analytics saved successfully');
    }
  };

  // Override the analyzed state handler to update scan status
  const handleAnalysisComplete = async () => {
    if (analyzingScanId) {
      await updateScanStatus(analyzingScanId, 'analyzed');
      refreshPendingScans();
    }
  };

  // Detect if running in Capacitor/native context
  const isNativeContext = typeof window !== 'undefined' && 
    (window.navigator.userAgent.includes('Capacitor') || 
     window.navigator.userAgent.includes('wv') ||
     (window as any).Capacitor);

  // Get selected students for display
  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));

  return (
    <>
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Scan Student Work</h1>
            <p className="text-muted-foreground">Capture or upload photos of student responses</p>
          </div>

          {/* AI Learning Progress Indicator */}
          <AILearningProgress compact />

          {/* Train AI, Answer Key, and Import Buttons */}
          <div className="flex justify-end gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGoogleClassroomImport(true)}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Import from Classroom
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAITrainingWizard(true)}
              className="gap-2"
            >
              <Brain className="h-4 w-4" />
              Train AI
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAnswerKeyDialog(true);
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Create Answer Key
            </Button>
          </div>

          {/* Mode Toggle */}
          <Tabs value={scanMode} onValueChange={(v) => {
            setScanMode(v as ScanMode);
            startNewScan();
            batch.clearAll();
            setSelectedClassId(null);
            setSelectedStudentIds([]);
          }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single" className="gap-2">
                <Camera className="h-4 w-4" />
                Single
              </TabsTrigger>
              <TabsTrigger value="scanner" className="gap-2">
                <Layers className="h-4 w-4" />
                Scanner
              </TabsTrigger>
              <TabsTrigger value="saved" className="gap-2">
                <Clock className="h-4 w-4" />
                Saved ({pendingScans.length})
              </TabsTrigger>
            </TabsList>

            {/* Single Scan Mode */}
            <TabsContent value="single" className="space-y-4 mt-4">
              {/* Manual Scoring Form */}
              {scanState === 'manual-scoring' && finalImage && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                      {aiSuggestions ? 'AI-Assisted Scoring' : 'Teacher Scoring'}
                    </h2>
                    <Button variant="outline" size="sm" onClick={startNewScan}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start Over
                    </Button>
                  </div>
                  
                  <ManualScoringForm
                    rubricSteps={mockRubricSteps}
                    imageUrl={finalImage}
                    solutionUrl={solutionImage || undefined}
                    initialSuggestions={aiSuggestions || undefined}
                    onSubmit={handleManualScoreSubmit}
                    onCancel={startNewScan}
                  />
                </div>
              )}

              {/* Upload Solution Screen for Teacher Analysis */}
              {scanState === 'upload-solution' && finalImage && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Upload Solution for Comparison</h2>
                    <Button variant="outline" size="sm" onClick={() => setScanState('choose-method')}>
                      ← Back
                    </Button>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-center">Student Work</p>
                          <img 
                            src={finalImage} 
                            alt="Student work" 
                            className="w-full object-contain max-h-48 rounded-md border" 
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-center">Solution</p>
                          {solutionImage ? (
                            <div className="relative">
                              <img 
                                src={solutionImage} 
                                alt="Solution" 
                                className="w-full object-contain max-h-48 rounded-md border" 
                              />
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="absolute top-2 right-2"
                                onClick={() => setSolutionImage(null)}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="w-full h-48 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                              onClick={() => solutionInputRef.current?.click()}
                            >
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Upload Solution</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <input
                    ref={solutionInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSolutionUpload}
                    className="hidden"
                  />

                  <div className="flex flex-col gap-3">
                    {solutionImage ? (
                      <>
                        <Button 
                          variant="hero" 
                          className="w-full"
                          onClick={handleProceedWithComparison}
                          disabled={isComparing}
                        >
                          {isComparing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              Comparing with AI...
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 mr-2" />
                              Get AI Suggestions & Score
                            </>
                          )}
                        </Button>
                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => solutionInputRef.current?.click()}
                            disabled={isComparing}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Change Solution
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={handleSkipToScoring}
                            disabled={isComparing}
                          >
                            Skip AI, Score Manually
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => solutionInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Solution
                        </Button>
                        <Button 
                          variant="hero" 
                          className="flex-1"
                          onClick={handleSkipToScoring}
                        >
                          Skip & Score Manually
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    {solutionImage 
                      ? 'AI will compare student work with the solution and suggest scores for you to review.'
                      : 'Upload a solution for AI-assisted comparison, or skip to score manually.'}
                  </p>
                </div>
              )}

              {/* Choose Analysis Method */}
              {scanState === 'choose-method' && finalImage && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Choose Analysis Method</h2>
                    <Button variant="outline" size="sm" onClick={startNewScan}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start Over
                    </Button>
                  </div>

                  {/* QR Code Detection Banner */}
                  {detectedQR && (
                    <Card className="border-green-500/50 bg-green-500/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-500/20">
                            <QrCode className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-green-700 dark:text-green-400">QR Code Detected!</p>
                            <p className="text-sm text-muted-foreground">
                              Student and question automatically identified from embedded QR code
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400">
                            Auto-linked
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI Name Recognition Banner */}
                  {!detectedQR && autoIdentifiedStudent && (
                    <Card className={
                      autoIdentifiedStudent.confidence === 'learned'
                        ? "border-green-500/50 bg-green-500/10"
                        : autoIdentifiedStudent.confidence === 'high' || autoIdentifiedStudent.confidence === 'medium'
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-amber-500/50 bg-amber-500/10"
                    }>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            autoIdentifiedStudent.confidence === 'learned'
                              ? 'bg-green-500/20'
                              : autoIdentifiedStudent.confidence === 'high' || autoIdentifiedStudent.confidence === 'medium'
                              ? 'bg-blue-500/20'
                              : 'bg-amber-500/20'
                          }`}>
                            {autoIdentifiedStudent.confidence === 'learned' ? (
                              <GraduationCap className="h-5 w-5 text-green-600" />
                            ) : (
                              <UserCheck className={`h-5 w-5 ${
                                autoIdentifiedStudent.confidence === 'high' || autoIdentifiedStudent.confidence === 'medium'
                                  ? 'text-blue-600'
                                  : 'text-amber-600'
                              }`} />
                            )}
                          </div>
                          <div className="flex-1">
                            {autoIdentifiedStudent.studentId ? (
                              <>
                                <p className={`font-medium ${
                                  autoIdentifiedStudent.confidence === 'learned'
                                    ? 'text-green-700 dark:text-green-400'
                                    : autoIdentifiedStudent.confidence === 'high'
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : autoIdentifiedStudent.confidence === 'medium'
                                    ? 'text-blue-600 dark:text-blue-300'
                                    : 'text-amber-700 dark:text-amber-400'
                                }`}>
                                  {autoIdentifiedStudent.confidence === 'learned' 
                                    ? 'Learned Match!' 
                                    : autoIdentifiedStudent.confidence === 'high' 
                                    ? 'Student Identified!' 
                                    : 'Possible Match Found'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {autoIdentifiedStudent.confidence === 'learned' 
                                    ? <>Matched "{autoIdentifiedStudent.handwrittenName}" → <strong>{autoIdentifiedStudent.studentName}</strong> (from your corrections)</>
                                    : <>Matched "{autoIdentifiedStudent.handwrittenName}" → <strong>{autoIdentifiedStudent.studentName}</strong></>
                                  }
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-amber-700 dark:text-amber-400">Name Detected</p>
                                <p className="text-sm text-muted-foreground">
                                  Found "{autoIdentifiedStudent.handwrittenName}" but no matching student in roster
                                </p>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!finalImage || !singleScanClassId || singleScanStudents.length === 0) {
                                  toast.error('Cannot re-identify without an image and class selected');
                                  return;
                                }
                                setAutoIdentifiedStudent(null);
                                setSingleScanStudentId(null);
                                toast.info('Re-analyzing handwritten name...', {
                                  icon: <RotateCcw className="h-4 w-4" />,
                                });
                                const identResult = await identifyStudent(finalImage, singleScanStudents);
                                
                                // Check learned corrections again
                                const learnedMatch = findLearnedMatch(identResult?.handwrittenName, singleScanStudents);
                                
                                if (learnedMatch) {
                                  setAutoIdentifiedStudent({
                                    studentId: learnedMatch.studentId,
                                    studentName: learnedMatch.studentName,
                                    confidence: 'learned',
                                    handwrittenName: identResult?.handwrittenName,
                                  });
                                  setSingleScanStudentId(learnedMatch.studentId);
                                } else if (identResult?.matchedStudentId) {
                                  setAutoIdentifiedStudent({
                                    studentId: identResult.matchedStudentId,
                                    studentName: identResult.matchedStudentName || 'Unknown',
                                    confidence: identResult.confidence,
                                    handwrittenName: identResult.handwrittenName,
                                  });
                                  setSingleScanStudentId(identResult.matchedStudentId);
                                  if (identResult.matchedQuestionId) {
                                    setSelectedQuestionIds([identResult.matchedQuestionId]);
                                  }
                                } else if (identResult?.handwrittenName) {
                                  setAutoIdentifiedStudent({
                                    studentId: '',
                                    studentName: identResult.handwrittenName,
                                    confidence: 'none',
                                    handwrittenName: identResult.handwrittenName,
                                  });
                                } else {
                                  toast.warning('Could not identify student from the scan');
                                }
                              }}
                              disabled={isIdentifying}
                              className="text-xs"
                            >
                              <RotateCcw className={`h-3.5 w-3.5 mr-1 ${isIdentifying ? 'animate-spin' : ''}`} />
                              Re-identify
                            </Button>
                            <Badge 
                              variant="secondary" 
                              className={
                                autoIdentifiedStudent.confidence === 'learned'
                                  ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                                  : autoIdentifiedStudent.confidence === 'high'
                                  ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                                  : autoIdentifiedStudent.confidence === 'medium'
                                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300'
                                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                              }
                            >
                              {autoIdentifiedStudent.confidence === 'learned' ? 'Learned'
                                : autoIdentifiedStudent.confidence === 'high' ? 'High confidence' 
                                : autoIdentifiedStudent.confidence === 'medium' ? 'Verify match'
                                : 'Manual select'}
                            </Badge>
                          </div>
                        </div>
                        {autoIdentifiedStudent.confidence !== 'high' && autoIdentifiedStudent.confidence !== 'learned' && (
                          <div className="mt-2 pt-2 border-t border-dashed">
                            <p className="text-xs text-muted-foreground">
                              Please verify the student selection is correct before proceeding. Your correction will improve future matches.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Identifying in progress */}
                  {isIdentifying && (
                    <Card className="border-primary/50 bg-primary/5">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/20">
                            <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-primary">Identifying Student...</p>
                            <p className="text-sm text-muted-foreground">
                              Analyzing handwritten name from the scan
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <GradingModeSelector
                    studentImage={finalImage}
                    isAnalyzing={isAnalyzing}
                    onSelectAI={handleChooseAI}
                    onSelectTeacherGuided={handleChooseTeacherGuided}
                    onSelectTeacherManual={handleChooseTeacherManual}
                    onRunBothAnalyses={handleRunBothAnalyses}
                    onCancel={() => {
                      cancelAnalysis();
                      toast.info('Analysis cancelled');
                      setScanState('choose-method');
                    }}
                  />
                </div>
              )}

              {/* Comparison View - Side by Side AI vs Teacher-Guided */}
              {scanState === 'comparison' && result && teacherGuidedResult && finalImage && answerGuideImage && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Compare Analysis Results</h2>
                    <Button variant="outline" size="sm" onClick={startNewScan}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start Over
                    </Button>
                  </div>
                  
                  <GradingComparisonView
                    aiResult={result}
                    teacherGuidedResult={teacherGuidedResult}
                    studentImage={finalImage}
                    answerGuideImage={answerGuideImage}
                    onSelectResult={handleSelectComparisonResult}
                    onRerunWithGuide={() => {
                      if (answerGuideImage) {
                        handleRunBothAnalyses(answerGuideImage);
                      }
                    }}
                  />
                </div>
              )}

              {/* Analysis Results - AI or Manual */}
              {scanState === 'analyzed' && (result || teacherGuidedResult || manualResult || Object.keys(multiQuestionResults).length > 0) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {manualResult 
                          ? 'Teacher Scoring Results' 
                          : Object.keys(multiQuestionResults).length > 0
                            ? `AI Grading Results (${Object.keys(multiQuestionResults).length} Questions)`
                            : selectedAnalysisResult === 'teacher-guided' || (teacherGuidedResult && !result)
                            ? 'Teacher-Guided Results'
                            : 'AI Grading Results'
                        }
                      </h2>
                      {selectedAnalysisResult && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedAnalysisResult === 'ai' ? 'AI Selected' : 'Teacher-Guided Selected'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Save to Database button - only show for multi-question with student assigned */}
                      {Object.keys(multiQuestionResults).length > 0 && analyzingScanStudentId && (
                        <Button 
                          variant={resultsSaved ? "outline" : "default"}
                          size="sm" 
                          onClick={handleSaveResults}
                          disabled={isSaving || resultsSaved}
                        >
                          {resultsSaved ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Saved
                            </>
                          ) : isSaving ? (
                            'Saving...'
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save to Reports
                            </>
                          )}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={startNewScan}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        New Scan
                      </Button>
                    </div>
                  </div>
                  
                  <Card>
                    <CardContent className="p-4">
                      <img 
                        src={finalImage!} 
                        alt="Analyzed student work" 
                        className="w-full object-contain max-h-48 rounded-md" 
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Multi-question results */}
                  {Object.keys(multiQuestionResults).length > 0 && (
                    <div className="space-y-4">
                      {Object.entries(multiQuestionResults).map(([questionId, questionResult], index) => (
                        <div key={questionId} className="space-y-2">
                          <h3 className="text-sm font-medium text-muted-foreground">
                            Question {index + 1}
                          </h3>
                          <AnalysisResults result={questionResult} />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Single result - show either AI or Teacher-Guided based on selection */}
                  {(() => {
                    const displayResult = selectedAnalysisResult === 'teacher-guided' 
                      ? teacherGuidedResult 
                      : selectedAnalysisResult === 'ai' 
                      ? result 
                      : (result || teacherGuidedResult);
                    
                    if (!displayResult || manualResult || Object.keys(multiQuestionResults).length > 0) {
                      return null;
                    }
                    
                    return (
                      <>
                        {/* Question Selector - show when no question is pre-selected */}
                        {!selectedQuestionIds.length && !detectedQR?.questionId && (
                          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <FileQuestion className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div className="flex-1 space-y-3">
                                  <div>
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                      Select a Question to Save Analytics
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                      Associate this scan with a question from your library to track student progress
                                    </p>
                                  </div>
                                  <ScanQuestionSelector
                                    selectedQuestionId={selectedQuestionIds[0] || null}
                                    onQuestionChange={(questionId) => {
                                      if (questionId) {
                                        setSelectedQuestionIds([questionId]);
                                      } else {
                                        setSelectedQuestionIds([]);
                                      }
                                    }}
                                    disabled={isSaving}
                                    compact
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Show selected question badge if one is selected */}
                        {(selectedQuestionIds.length > 0 || detectedQR?.questionId) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="secondary" className="gap-1">
                              <FileQuestion className="h-3 w-3" />
                              Question linked
                            </Badge>
                            {detectedQR?.questionId && (
                              <Badge variant="outline" className="gap-1">
                                <QrCode className="h-3 w-3" />
                                Auto-detected
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <AnalysisResults 
                          result={displayResult} 
                          rawAnalysis={rawAnalysis}
                          onSaveAnalytics={currentStudentId && (selectedQuestionIds.length > 0 || detectedQR?.questionId) && !resultsSaved ? () => setShowSaveConfirm(true) : undefined}
                          onAssociateStudent={() => setShowStudentPicker(true)}
                          isSaving={isSaving}
                          studentName={studentName}
                          studentId={currentStudentId}
                          classId={singleScanClassId}
                          topicName={displayResult.problemIdentified}
                        />
                        
                        {/* Sync Status Indicator - shown after save */}
                        {resultsSaved && (
                          <SyncStatusIndicator status={syncStatus} className="mt-2" />
                        )}
                        
                        <SaveAnalyticsConfirmDialog
                          open={showSaveConfirm}
                          onOpenChange={setShowSaveConfirm}
                          onConfirm={async () => {
                            await handleSaveSingleResult();
                            setShowSaveConfirm(false);
                          }}
                          studentName={studentName}
                          totalScore={displayResult.totalScore}
                          rubricScores={displayResult.rubricScores}
                          questionCount={1}
                          isSaving={isSaving}
                        />
                      </>
                    );
                  })()}
                  
                  {manualResult && (
                    <>
                      {/* Question Selector for manual results */}
                      {!selectedQuestionIds.length && !detectedQR?.questionId && (
                        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <FileQuestion className="h-5 w-5 text-amber-600 mt-0.5" />
                              <div className="flex-1 space-y-3">
                                <div>
                                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                    Select a Question to Save Analytics
                                  </p>
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Associate this scan with a question from your library
                                  </p>
                                </div>
                                <ScanQuestionSelector
                                  selectedQuestionId={selectedQuestionIds[0] || null}
                                  onQuestionChange={(questionId) => {
                                    if (questionId) {
                                      setSelectedQuestionIds([questionId]);
                                    } else {
                                      setSelectedQuestionIds([]);
                                    }
                                  }}
                                  disabled={isSaving}
                                  compact
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      <AnalysisResults 
                        result={{
                          ocrText: '',
                          problemIdentified: '',
                          approachAnalysis: '',
                          rubricScores: manualResult.rubricScores,
                          misconceptions: manualResult.misconceptions,
                          totalScore: manualResult.totalScore,
                          feedback: manualResult.feedback,
                        }} 
                        onSaveAnalytics={currentStudentId && (selectedQuestionIds.length > 0 || detectedQR?.questionId) && !resultsSaved ? () => setShowSaveConfirm(true) : undefined}
                        onAssociateStudent={() => setShowStudentPicker(true)}
                        isSaving={isSaving}
                        studentName={studentName}
                        studentId={currentStudentId}
                        classId={singleScanClassId}
                      />
                      
                      {/* Sync Status Indicator - shown after save */}
                      {resultsSaved && (
                        <SyncStatusIndicator status={syncStatus} className="mt-2" />
                      )}
                      
                      <SaveAnalyticsConfirmDialog
                        open={showSaveConfirm}
                        onOpenChange={setShowSaveConfirm}
                        onConfirm={async () => {
                          await handleSaveSingleResult();
                          setShowSaveConfirm(false);
                        }}
                        studentName={studentName}
                        totalScore={manualResult.totalScore}
                        rubricScores={manualResult.rubricScores}
                        questionCount={1}
                        isSaving={isSaving}
                      />
                    </>
                  )}

                  {/* Student Picker Dialog */}
                  <Dialog open={showStudentPicker} onOpenChange={setShowStudentPicker}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Associate with Student</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <ScanClassStudentPicker
                          selectedClassId={singleScanClassId}
                          selectedStudentId={singleScanStudentId || currentStudentId}
                          onClassChange={setSingleScanClassId}
                          onStudentChange={async (id) => {
                            const previousStudentId = singleScanStudentId || autoIdentifiedStudent?.studentId;
                            setSingleScanStudentId(id);
                            
                            if (id) {
                              // Check if this is a correction (AI identified a different student or no student)
                              const isCorrection = autoIdentifiedStudent?.handwrittenName && 
                                autoIdentifiedStudent.confidence !== 'learned' &&
                                id !== previousStudentId;
                              
                              if (isCorrection) {
                                // Save the correction for learning
                                await saveCorrection(autoIdentifiedStudent.handwrittenName!, id);
                              }
                              
                              setShowStudentPicker(false);
                              toast.success(isCorrection 
                                ? 'Student corrected & saved for future matching!' 
                                : 'Student associated. You can now save analytics.'
                              );
                            }
                          }}
                        />
                        {autoIdentifiedStudent?.handwrittenName && (
                          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                            <GraduationCap className="h-3.5 w-3.5 inline mr-1" />
                            Selecting a different student will teach the system to recognize "{autoIdentifiedStudent.handwrittenName}" correctly next time.
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* Main scan card - only show in idle state */}
              {scanState === 'idle' && (
                <div className="space-y-4">
                  {/* Class/Student Picker */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Class & Student (Optional)</label>
                        <ScanClassStudentPicker
                          selectedClassId={singleScanClassId}
                          selectedStudentId={singleScanStudentId}
                          onClassChange={setSingleScanClassId}
                          onStudentChange={setSingleScanStudentId}
                        />
                        <p className="text-xs text-muted-foreground">
                          Pre-selecting a student allows you to save analytics directly after scanning
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`overflow-hidden transition-all duration-200 ${
                      isDragging 
                        ? 'ring-2 ring-primary ring-offset-2 border-primary bg-primary/5' 
                        : ''
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <CardContent className="p-0">
                      <div className="p-8 sm:p-12 relative">
                        {/* Drag overlay */}
                        {isDragging && (
                          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                            <div className="text-center space-y-3">
                              <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                <Upload className="h-10 w-10 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold text-primary">Drop files here</p>
                                <p className="text-sm text-muted-foreground">Images or PDF files</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="text-center space-y-6">
                          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${cameraStatus === 'denied' ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                            {cameraStatus === 'denied' ? (
                              <AlertTriangle className="h-12 w-12 text-destructive" />
                            ) : (
                              <Camera className="h-12 w-12 text-primary" />
                            )}
                          </div>

                          <div>
                            <h2 className="text-lg font-semibold mb-1">
                              {cameraStatus === 'denied' ? 'Camera Access Blocked' : 'Ready to Scan'}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              {cameraStatus === 'denied' 
                                ? 'Enable camera in browser settings or upload an image' 
                                : 'Take a photo, upload files, or drag & drop images/PDFs here'}
                            </p>
                          </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <input
                            ref={nativeInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleNativeCapture}
                            className="hidden"
                          />
                          
                          {isNativeContext ? (
                            <Button 
                              variant="scan" 
                              size="lg" 
                              className="min-w-[180px]"
                              onClick={() => nativeInputRef.current?.click()}
                            >
                              <Camera className="h-5 w-5 mr-2" />
                              Open Camera
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="scan" 
                                size="lg" 
                                className="min-w-[180px]"
                                onClick={async () => {
                                  if (cameraStatus === 'denied') {
                                    toast.error('Camera access denied. Please enable it in your browser settings.', {
                                      icon: <AlertTriangle className="h-4 w-4" />,
                                      duration: 5000,
                                    });
                                    return;
                                  }
                                  if (!hasCamera) {
                                    toast.error('No camera found on this device. Please upload an image instead.');
                                    return;
                                  }
                                  if (cameraStatus === 'prompt') {
                                    const granted = await requestPermission();
                                    if (!granted) {
                                      return;
                                    }
                                  }
                                  setScanState('camera');
                                }}
                                disabled={!hasCamera}
                              >
                                <Camera className="h-5 w-5 mr-2" />
                                {cameraStatus === 'denied' ? 'Camera Blocked' : 'Open Camera'}
                              </Button>
                              {/* Batch capture button */}
                              <Button 
                                variant="outline" 
                                size="lg"
                                className="border-primary/50 hover:border-primary hover:bg-primary/5"
                                onClick={async () => {
                                  if (cameraStatus === 'denied') {
                                    toast.error('Camera access denied. Please enable it in your browser settings.', {
                                      icon: <AlertTriangle className="h-4 w-4" />,
                                      duration: 5000,
                                    });
                                    return;
                                  }
                                  if (!hasCamera) {
                                    toast.error('No camera found on this device. Please upload an image instead.');
                                    return;
                                  }
                                  if (cameraStatus === 'prompt') {
                                    const granted = await requestPermission();
                                    if (!granted) {
                                      return;
                                    }
                                  }
                                  setBatchCameraMode(true);
                                  setScanState('camera');
                                }}
                                disabled={!hasCamera || cameraStatus === 'denied'}
                              >
                                <Layers className="h-5 w-5 mr-2" />
                                Batch Capture
                              </Button>
                              <Button 
                                variant="outline" 
                                size="lg"
                                className="sm:hidden"
                                onClick={() => nativeInputRef.current?.click()}
                              >
                                <Camera className="h-5 w-5 mr-2" />
                                Use Device Camera
                              </Button>
                            </>
                          )}
                          
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf,application/pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button 
                            variant="outline" 
                            size="lg"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-5 w-5 mr-2" />
                            Upload Image/PDF
                          </Button>
                        </div>

                        {/* Drag and drop hint */}
                        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 mt-4">
                          <p className="text-sm text-muted-foreground">
                            <FileImage className="h-4 w-4 inline mr-1.5" />
                            Drag & drop images or PDFs here
                          </p>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                          <p>💡 <strong>Tip:</strong> For best results, ensure good lighting and capture the full response</p>
                          <p>📱 QR codes on printed assessments will auto-detect student & question</p>
                        </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Scanner Mode - Combined Batch + Scanner Import */}
            <TabsContent value="scanner" className="space-y-4 mt-4">
              {showBatchReport && batch.summary ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => setShowBatchReport(false)}>
                      ← Back to Queue
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      batch.clearAll();
                      setShowBatchReport(false);
                      setSelectedClassId(null);
                      setSelectedStudentIds([]);
                    }}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      New Batch
                    </Button>
                  </div>
                  <BatchReport 
                    items={batch.items} 
                    summary={batch.summary}
                    classId={selectedClassId || undefined}
                    questionId={selectedQuestionIds[0] || undefined}
                    onExport={exportPDF}
                    onSaveComplete={() => {
                      toast.success('All grades saved to gradebook');
                    }}
                    onUnlinkContinuation={batch.unlinkContinuation}
                  />
                </div>
              ) : (
                <>
                  {/* Class & Student Selector */}
                  <ClassStudentSelector
                    selectedClassId={selectedClassId}
                    selectedStudentIds={selectedStudentIds}
                    onClassChange={setSelectedClassId}
                    onStudentsChange={setSelectedStudentIds}
                    disabled={batch.isProcessing}
                  />

                  {/* Scanner Import Panel */}
                  <ScannerImportMode
                    onPagesReady={async (pages) => {
                      setScannerImportPages(pages);
                      // Add all pages to batch for processing (with filename for topic grouping)
                      pages.forEach(page => {
                        batch.addImage(page.dataUrl, undefined, undefined, page.filename);
                      });
                      toast.success(`${pages.length} pages added for analysis`);
                      
                      // Auto-group by worksheet topic if filenames indicate multi-page papers
                      if (pages.length >= 2) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        const topicResult = batch.groupPagesByWorksheetTopic();
                        if (topicResult.pagesLinked > 0) {
                          toast.success(`Auto-grouped ${topicResult.pagesLinked} pages by worksheet topic`, {
                            description: `${topicResult.topicsGrouped} multi-page papers detected`,
                            icon: <FileStack className="h-4 w-4" />,
                          });
                        }
                      }
                      
                      // Auto-run handwriting grouping if enabled and more than 1 page
                      if (qrScanSettings.autoHandwritingGroupingEnabled && pages.length >= 2) {
                        // Wait for state update
                        await new Promise(resolve => setTimeout(resolve, 100));
                        toast.info('Auto-grouping multi-page papers by handwriting...', { 
                          icon: <FileStack className="h-4 w-4" /> 
                        });
                        const result = await batch.detectMultiPageByHandwriting();
                        if (result.pagesLinked > 0) {
                          toast.success(`Auto-grouped ${result.pagesLinked} continuation pages`, {
                            description: `${result.groupsCreated} separate student papers detected`,
                            icon: <FileStack className="h-4 w-4" />,
                          });
                        }
                      }
                    }}
                    onClose={() => setScanMode('single')}
                  />

                  {/* Add images section */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                          <Layers className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">Add Student Papers</h2>
                          <p className="text-sm text-muted-foreground">
                            {selectedClassId 
                              ? `Papers will be auto-identified using QR codes or handwritten names`
                              : 'Select a class above to enable automatic student identification'}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <input
                            ref={batchInputRef}
                            type="file"
                            accept="image/*,.pdf,application/pdf"
                            multiple
                            onChange={handleBatchUpload}
                            className="hidden"
                          />
                          <Button 
                            variant="outline"
                            onClick={() => batchInputRef.current?.click()}
                            disabled={batch.isProcessing}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Multiple
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => setScanState('camera')}
                            disabled={batch.isProcessing}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Take Photo
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Queue with student assignment */}
                  <BatchQueue
                    items={batch.items}
                    students={students}
                    classId={selectedClassId}
                    onRemove={batch.removeImage}
                    onAssignStudent={batch.updateItemStudent}
                    onStudentCreated={async (studentId, studentName) => {
                      // Refresh the students list when a new student is added
                      toast.success(`${studentName} added to roster`);
                      // The useClassStudents hook should auto-refresh, but we can force a re-render
                    }}
                    onLinkContinuation={batch.linkContinuation}
                    onUnlinkContinuation={batch.unlinkContinuation}
                    onUnlinkAllPages={batch.unlinkAllPages}
                    onConvertToSeparate={batch.convertToSeparatePaper}
                    onReorder={batch.reorderItems}
                    onSaveToGradebook={handleBatchSaveToGradebook}
                    onOverrideGrade={batch.overrideGrade}
                    onSelectRunAsGrade={batch.selectRunAsGrade}
                    currentIndex={batch.currentIndex}
                    isProcessing={batch.isProcessing}
                    isIdentifying={batch.isIdentifying}
                    isRestoredFromStorage={batch.isRestoredFromStorage}
                    isSaving={batchSaving}
                    allSaved={allBatchSaved}
                  />

                  {/* Action buttons */}
                  {batch.items.length > 0 && (
                    <div className="space-y-3">
                      {/* QR Scan button - fast local scanning */}
                      {selectedClassId && students.length > 0 && batch.items.some(item => !item.identification?.qrCodeDetected) && (
                        <Button
                          variant="outline"
                          className="w-full border-green-500/50 text-green-700 dark:text-green-400 hover:bg-green-500/10"
                          onClick={async () => {
                            toast.info('Scanning all papers for QR codes...', { icon: <QrCode className="h-4 w-4" /> });
                            const result = await batch.scanAllQRCodes(students);
                            if (result.matched > 0) {
                              toast.success(`Found QR codes in ${result.matched} of ${result.total} papers!`, {
                                icon: <QrCode className="h-4 w-4" />,
                              });
                              // Auto-group pages by the same student (handles front/back automatically)
                              const groupResult = batch.groupPagesByStudent();
                              if (groupResult.pagesLinked > 0) {
                                toast.success(`Auto-linked ${groupResult.pagesLinked} front/back pages for ${groupResult.studentsGrouped} students`, {
                                  icon: <FileStack className="h-4 w-4" />,
                                });
                              }
                            } else {
                              toast.info('No QR codes detected. Try AI identification instead.');
                            }
                          }}
                          disabled={batch.isProcessing || batch.isIdentifying}
                        >
                          {batch.isIdentifying ? (
                            <>
                              <QrCode className="h-4 w-4 mr-2 animate-pulse" />
                              Scanning {batch.currentIndex + 1}/{batch.items.length}...
                            </>
                          ) : (
                            <>
                              <QrCode className="h-4 w-4 mr-2" />
                              Scan QR Codes (Fast)
                            </>
                          )}
                        </Button>
                      )}

                      {/* AI Auto-identify button - for papers without QR */}
                      {selectedClassId && students.length > 0 && batch.items.some(item => !item.studentId) && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={async () => {
                            toast.info('Auto-identifying students from handwritten names...');
                            await batch.autoIdentifyAll(students);
                            // Auto-group pages by the same student (handles front/back automatically)
                            const groupResult = batch.groupPagesByStudent();
                            if (groupResult.pagesLinked > 0) {
                              toast.success(`Auto-linked ${groupResult.pagesLinked} front/back pages for ${groupResult.studentsGrouped} students`, {
                                icon: <FileStack className="h-4 w-4" />,
                              });
                            }
                          }}
                          disabled={batch.isProcessing || batch.isIdentifying}
                        >
                          {batch.isIdentifying ? (
                            <>
                              <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                              Identifying {batch.currentIndex + 1}/{batch.items.length}...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              AI Identify Names (Slower)
                            </>
                          )}
                        </Button>
                      )}

                      {/* Manual grouping button - fallback if auto-grouping missed some */}
                      {batch.items.length >= 2 && batch.items.some(item => item.studentId) && batch.items.some(item => !item.pageType) && (
                        <Button
                          variant="outline"
                          className="w-full border-blue-500/50 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10"
                          onClick={async () => {
                            toast.info('Analyzing handwriting to group multi-page papers...', { 
                              description: 'Sequential pages with similar handwriting will be linked together',
                              icon: <FileStack className="h-4 w-4" /> 
                            });
                            const result = await batch.detectMultiPageByHandwriting();
                            if (result.pagesLinked > 0) {
                              toast.success(`Grouped ${result.pagesLinked} continuation pages with their primary papers`, {
                                description: `${result.groupsCreated} separate student papers detected`,
                                icon: <FileStack className="h-4 w-4" />,
                              });
                            } else {
                              toast.info('All pages appear to be from different students', {
                                description: 'No multi-page groupings detected',
                              });
                            }
                          }}
                          disabled={batch.isProcessing || batch.isIdentifying}
                        >
                          {batch.isIdentifying ? (
                            <>
                              <FileStack className="h-4 w-4 mr-2 animate-pulse" />
                              Comparing {batch.currentIndex + 1}/{batch.items.length}...
                            </>
                          ) : (
                            <>
                              <FileStack className="h-4 w-4 mr-2" />
                              Group Two-Sided Papers
                            </>
                          )}
                        </Button>
                      )}

                      {/* Summary of identified papers */}
                      {batch.items.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <QrCode className="h-3.5 w-3.5 text-green-600" />
                            {batch.items.filter(i => i.identification?.qrCodeDetected).length} QR matched
                          </span>
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            {batch.items.filter(i => i.autoAssigned && !i.identification?.qrCodeDetected).length} name matched
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {batch.items.filter(i => !i.studentId).length} unassigned
                          </span>
                          {batch.items.some(i => i.pageType === 'continuation') && (
                            <span className="flex items-center gap-1">
                              <FileStack className="h-3.5 w-3.5 text-blue-600" />
                              {batch.items.filter(i => i.pageType === 'continuation').length} linked pages
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={batch.clearAll}
                          disabled={batch.isProcessing || batch.isIdentifying}
                        >
                          Clear All
                        </Button>
                        <Button 
                          variant="hero" 
                          className="flex-1"
                          onClick={startBatchAnalysis}
                          disabled={batch.isProcessing || batch.isIdentifying || batch.items.length === 0}
                        >
                          {batch.isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              Analyzing {batch.currentIndex + 1}/{batch.items.length}
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Analyze All ({batch.items.length})
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Confidence Analysis Buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-blue-500/50 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10"
                          onClick={async () => {
                            toast.info('Running double analysis for higher confidence...', {
                              icon: <ShieldCheck className="h-4 w-4" />,
                              description: 'Each paper will be analyzed twice and grades averaged',
                            });
                            await batch.startConfidenceAnalysis(2, mockRubricSteps);
                            const summary = batch.generateSummary();
                            setShowBatchReport(true);
                            toast.success('Double analysis complete!', {
                              description: `Average score: ${summary.averageScore}%`,
                            });
                          }}
                          disabled={batch.isProcessing || batch.isIdentifying || batch.items.length === 0}
                        >
                          {batch.isProcessing ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              2x Analysis
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-purple-500/50 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10"
                          onClick={async () => {
                            toast.info('Running triple analysis for maximum confidence...', {
                              icon: <ShieldCheck className="h-4 w-4" />,
                              description: 'Each paper will be analyzed three times and grades averaged',
                            });
                            await batch.startConfidenceAnalysis(3, mockRubricSteps);
                            const summary = batch.generateSummary();
                            setShowBatchReport(true);
                            toast.success('Triple analysis complete!', {
                              description: `Average score: ${summary.averageScore}%`,
                            });
                          }}
                          disabled={batch.isProcessing || batch.isIdentifying || batch.items.length === 0}
                        >
                          {batch.isProcessing ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              3x Analysis
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Multi-analysis runs AI grading 2-3 times per paper, averages the grades, and shows confidence level
                      </p>
                    </div>
                  )}

                  {/* Show report button if analysis complete */}
                  {batch.items.length > 0 && 
                   batch.items.every(item => item.status === 'completed' || item.status === 'failed') &&
                   !batch.isProcessing && (
                    <Button 
                      variant="default" 
                      className="w-full"
                      onClick={() => {
                        batch.generateSummary();
                        setShowBatchReport(true);
                      }}
                    >
                      View Class Report
                    </Button>
                  )}
                </>
              )}
            </TabsContent>

            {/* Save for Later Mode */}
            <TabsContent value="saved" className="space-y-4 mt-4">
              <SaveForLaterTab
                pendingScans={pendingScans}
                onRefresh={refreshPendingScans}
                onAnalyzeScan={handleAnalyzeSavedScan}
              />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>

      {/* Full-screen camera modal */}
      <CameraModal 
        isOpen={scanState === 'camera'}
        onClose={() => {
          setScanState('idle');
          setBatchCameraMode(false);
        }}
        onCapture={handleCameraCapture}
        batchMode={batchCameraMode}
        onBatchComplete={handleBatchCameraComplete}
      />

      {/* Full-screen preview with crop/rotate */}
      {scanState === 'preview' && capturedImage && (
        <ImagePreview
          imageDataUrl={capturedImage}
          onConfirm={handlePreviewConfirm}
          onRetake={handlePreviewRetake}
        />
      )}

      {/* Multi-Student Scanner Modal */}
      {showMultiStudentScanner && (
        <Dialog open={showMultiStudentScanner} onOpenChange={setShowMultiStudentScanner}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <MultiStudentScanner 
              onClose={() => setShowMultiStudentScanner(false)}
              rubricSteps={mockRubricSteps}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Continuous QR Scanner */}
      <ContinuousQRScanner
        isOpen={showContinuousQRScanner}
        onClose={() => setShowContinuousQRScanner(false)}
        studentRoster={singleScanStudents}
        onScanComplete={(scannedStudents) => {
          if (scannedStudents.length > 0) {
            toast.success(`Scanned ${scannedStudents.length} student papers!`, {
              description: 'Students identified and ready for batch processing',
            });
          }
        }}
      />

      {/* Batch Grading Mode Selector Dialog */}
      <Dialog open={showBatchGradingModeSelector} onOpenChange={setShowBatchGradingModeSelector}>
        <DialogContent className="max-w-md">
          <BatchGradingModeSelector
            itemCount={batch.items.length}
            onSelectMode={handleBatchGradingModeSelect}
            onCancel={() => setShowBatchGradingModeSelector(false)}
            isProcessing={batch.isProcessing}
          />
        </DialogContent>
      </Dialog>

      {/* Teacher Answer Key Dialog */}
      <TeacherAnswerKeyDialog
        open={showAnswerKeyDialog}
        onOpenChange={setShowAnswerKeyDialog}
        classId={singleScanClassId || selectedClassId || undefined}
      />

      {/* AI Training Wizard */}
      <AITrainingWizard
        open={showAITrainingWizard}
        onOpenChange={setShowAITrainingWizard}
        onTrainingComplete={() => {
          toast.success('AI training complete! The AI is now calibrated to your grading style.');
        }}
      />

      {/* Google Classroom Import */}
      <GoogleClassroomImport
        open={showGoogleClassroomImport}
        onOpenChange={setShowGoogleClassroomImport}
        onImportComplete={(submissions) => {
          // Add imported submissions to batch queue
          setScanMode('batch');
          submissions.forEach(sub => {
            if (sub.attachments.length > 0) {
              // For each attachment, show info in toast
              sub.attachments.forEach(att => {
                toast.info(`${sub.studentName}: ${att.title}`, {
                  description: 'Open the link to download and add to batch',
                  action: {
                    label: 'Open',
                    onClick: () => window.open(att.url, '_blank'),
                  },
                });
              });
            }
          });
        }}
      />
    </>
  );
}
