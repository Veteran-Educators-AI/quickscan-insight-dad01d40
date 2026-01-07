import { useRef, useState, useCallback } from 'react';
import { Camera, Upload, RotateCcw, Layers, Play, Plus, Sparkles, User, Bot, Wand2, Clock, Save, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SaveAnalyticsConfirmDialog } from '@/components/scan/SaveAnalyticsConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { CameraModal } from '@/components/scan/CameraModal';
import { ImagePreview } from '@/components/scan/ImagePreview';
import { AnalysisResults } from '@/components/scan/AnalysisResults';
import { BatchQueue } from '@/components/scan/BatchQueue';
import { BatchReport } from '@/components/scan/BatchReport';
import { ClassStudentSelector, useClassStudents } from '@/components/scan/ClassStudentSelector';
import { ScanClassStudentPicker, useStudentName } from '@/components/scan/ScanClassStudentPicker';
import { SaveForLaterTab } from '@/components/scan/SaveForLaterTab';
import { useAnalyzeStudentWork } from '@/hooks/useAnalyzeStudentWork';
import { useBatchAnalysis } from '@/hooks/useBatchAnalysis';
import { usePendingScans } from '@/hooks/usePendingScans';
import { useSaveAnalysisResults } from '@/hooks/useSaveAnalysisResults';
import { ManualScoringForm } from '@/components/scan/ManualScoringForm';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

type ScanState = 'idle' | 'camera' | 'preview' | 'choose-method' | 'upload-solution' | 'analyzed' | 'manual-scoring' | 'analyze-saved';
type ScanMode = 'single' | 'batch' | 'saved';
type GradingMethod = 'ai' | 'teacher';

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
  const [gradingMethod, setGradingMethod] = useState<GradingMethod>('ai');
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);
  
  const solutionInputRef = useRef<HTMLInputElement>(null);

  // Class & student selection for batch mode
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const { students } = useClassStudents(selectedClassId);
  
  // Single scan class/student selection
  const [singleScanClassId, setSingleScanClassId] = useState<string | null>(null);
  const [singleScanStudentId, setSingleScanStudentId] = useState<string | null>(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  const { analyze, compareWithSolution, isAnalyzing, isComparing, error, result, rawAnalysis, comparisonResult } = useAnalyzeStudentWork();
  const batch = useBatchAnalysis();
  const { pendingScans, refresh: refreshPendingScans, updateScanStatus } = usePendingScans();
  const { saveResults, saveMultiQuestionResults, isSaving } = useSaveAnalysisResults();
  const [analyzingScanId, setAnalyzingScanId] = useState<string | null>(null);
  const [analyzingScanStudentId, setAnalyzingScanStudentId] = useState<string | null>(null);
  // Track question IDs for multi-question analysis
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [resultsSaved, setResultsSaved] = useState(false);
  const [multiQuestionResults, setMultiQuestionResults] = useState<Record<string, any>>({});
  
  // Get student name for display
  const currentStudentId = singleScanStudentId || analyzingScanStudentId;
  const studentName = useStudentName(currentStudentId);
  
  // Confirmation dialog state
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  // AI suggestions for manual scoring
  const [aiSuggestions, setAiSuggestions] = useState<{
    scores: { criterion: string; score: number; maxScore: number; feedback: string }[];
    misconceptions: string[];
    feedback: string;
  } | null>(null);

  // Mock rubric steps
  const mockRubricSteps = [
    { step_number: 1, description: 'Correctly identifies the problem type', points: 1 },
    { step_number: 2, description: 'Sets up equations/approach correctly', points: 2 },
    { step_number: 3, description: 'Shows clear work and reasoning', points: 2 },
    { step_number: 4, description: 'Arrives at correct answer', points: 1 },
  ];

  const handleCameraCapture = useCallback((imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setScanState('preview');
  }, []);

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
      setScanState('choose-method');
      toast.success('Image uploaded! Choose analysis method.');
    }
  }, [scanMode, batch, selectedClassId, students]);

  const handleSolutionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setSolutionImage(dataUrl);
        toast.success('Solution uploaded!');
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleChooseAI = () => {
    setGradingMethod('ai');
    analyzeImage();
  };

  const handleChooseTeacher = () => {
    setGradingMethod('teacher');
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setCapturedImage(dataUrl);
        setScanState('preview');
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileCount = files.length;
    toast.info(`Adding ${fileCount} image(s)...`);
    
    // Process files with auto-identification if class is selected
    const processFile = async (file: File) => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result as string;
          if (selectedClassId && students.length > 0) {
            await batch.addImageWithAutoIdentify(dataUrl, students);
          } else {
            batch.addImage(dataUrl);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    };

    // Process all files
    await Promise.all(Array.from(files).map(processFile));
    
    toast.success(`Added ${fileCount} image(s)${selectedClassId ? ' with auto-identification' : ''}`);
    e.target.value = '';
  };

  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setCapturedImage(dataUrl);
        setScanState('preview');
      };
      reader.readAsDataURL(file);
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

  const startBatchAnalysis = async () => {
    if (batch.items.length === 0) {
      toast.error('Add images to the batch first');
      return;
    }

    // Check if all items have students assigned
    const unassigned = batch.items.filter(item => !item.studentId);
    if (unassigned.length > 0 && selectedClassId) {
      toast.warning(`${unassigned.length} paper(s) don't have students assigned`);
    }

    toast.info(`Starting batch analysis of ${batch.items.length} papers...`);
    await batch.startBatchAnalysis(mockRubricSteps);
    
    const summary = batch.generateSummary();
    setShowBatchReport(true);
    
    toast.success('Batch analysis complete!', {
      description: `Average score: ${summary.averageScore}%`,
    });
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
    
    if (!studentId || !result || !finalImage) {
      toast.error('Missing student or results to save');
      return;
    }

    const attemptId = await saveResults({
      studentId,
      questionId: selectedQuestionIds[0] || 'unknown',
      imageUrl: finalImage,
      result,
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
              <TabsTrigger value="batch" className="gap-2">
                <Layers className="h-4 w-4" />
                Batch
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

                  <Card>
                    <CardContent className="p-4">
                      <img 
                        src={finalImage} 
                        alt="Student work" 
                        className="w-full object-contain max-h-48 rounded-md" 
                      />
                    </CardContent>
                  </Card>

                  {isAnalyzing ? (
                    <Card>
                      <CardContent className="p-8">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                          <p className="font-medium">Analyzing with AI...</p>
                          <p className="text-sm text-muted-foreground">Running OCR and auto-grading</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        variant="outline" 
                        className="h-auto py-6 flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5"
                        onClick={handleChooseAI}
                      >
                        <Bot className="h-10 w-10 text-primary" />
                        <div className="space-y-1">
                          <span className="font-semibold text-base">AI Analysis</span>
                          <p className="text-xs text-muted-foreground font-normal">
                            Automatic grading using AI
                          </p>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-auto py-6 flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5"
                        onClick={handleChooseTeacher}
                      >
                        <User className="h-10 w-10 text-muted-foreground" />
                        <div className="space-y-1">
                          <span className="font-semibold text-base">Teacher Analysis</span>
                          <p className="text-xs text-muted-foreground font-normal">
                            Upload solution to compare
                          </p>
                        </div>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Analysis Results - AI or Manual */}
              {scanState === 'analyzed' && (result || manualResult || Object.keys(multiQuestionResults).length > 0) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                      {manualResult 
                        ? 'Teacher Scoring Results' 
                        : Object.keys(multiQuestionResults).length > 0
                          ? `AI Grading Results (${Object.keys(multiQuestionResults).length} Questions)`
                          : 'AI Grading Results'
                      }
                    </h2>
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
                  
                  {/* Single result (legacy) */}
                  {result && !manualResult && Object.keys(multiQuestionResults).length === 0 && (
                    <>
                      <AnalysisResults 
                        result={result} 
                        rawAnalysis={rawAnalysis}
                        onSaveAnalytics={currentStudentId && !resultsSaved ? () => setShowSaveConfirm(true) : undefined}
                        onAssociateStudent={() => setShowStudentPicker(true)}
                        isSaving={isSaving}
                        studentName={studentName}
                      />
                      
                      <SaveAnalyticsConfirmDialog
                        open={showSaveConfirm}
                        onOpenChange={setShowSaveConfirm}
                        onConfirm={async () => {
                          await handleSaveSingleResult();
                          setShowSaveConfirm(false);
                        }}
                        studentName={studentName}
                        totalScore={result.totalScore}
                        rubricScores={result.rubricScores}
                        questionCount={1}
                        isSaving={isSaving}
                      />
                    </>
                  )}
                  
                  {manualResult && (
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
                    />
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
                          onStudentChange={(id) => {
                            setSingleScanStudentId(id);
                            if (id) {
                              setShowStudentPicker(false);
                              toast.success('Student associated. You can now save analytics.');
                            }
                          }}
                        />
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

                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-8 sm:p-12">
                        <div className="text-center space-y-6">
                          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                            <Camera className="h-12 w-12 text-primary" />
                          </div>

                          <div>
                            <h2 className="text-lg font-semibold mb-1">Ready to Scan</h2>
                            <p className="text-sm text-muted-foreground">
                              Take a photo of student work or upload an existing image
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
                                onClick={() => setScanState('camera')}
                              >
                                <Camera className="h-5 w-5 mr-2" />
                                Open Camera
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
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button 
                            variant="outline" 
                            size="lg"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-5 w-5 mr-2" />
                            Upload Image
                          </Button>
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

            {/* Batch Mode */}
            <TabsContent value="batch" className="space-y-4 mt-4">
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
                    onExport={exportPDF}
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
                            accept="image/*"
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
                    onRemove={batch.removeImage}
                    onAssignStudent={batch.updateItemStudent}
                    currentIndex={batch.currentIndex}
                    isProcessing={batch.isProcessing}
                    isIdentifying={batch.isIdentifying}
                  />

                  {/* Action buttons */}
                  {batch.items.length > 0 && (
                    <div className="space-y-3">
                      {/* Auto-identify button */}
                      {selectedClassId && students.length > 0 && batch.items.some(item => !item.studentId) && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            toast.info('Auto-identifying students from papers...');
                            batch.autoIdentifyAll(students);
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
                              Auto-Identify Students (QR/Name)
                            </>
                          )}
                        </Button>
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
        onClose={() => setScanState('idle')}
        onCapture={handleCameraCapture}
      />

      {/* Full-screen preview with crop/rotate */}
      {scanState === 'preview' && capturedImage && (
        <ImagePreview
          imageDataUrl={capturedImage}
          onConfirm={handlePreviewConfirm}
          onRetake={handlePreviewRetake}
        />
      )}
    </>
  );
}
