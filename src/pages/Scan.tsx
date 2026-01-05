import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, Users, FileText, RotateCcw, Layers, Play, Plus, Sparkles, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { CameraModal } from '@/components/scan/CameraModal';
import { ImagePreview } from '@/components/scan/ImagePreview';
import { AnalysisResults } from '@/components/scan/AnalysisResults';
import { BatchQueue } from '@/components/scan/BatchQueue';
import { BatchReport } from '@/components/scan/BatchReport';
import { ClassStudentSelector, useClassStudents } from '@/components/scan/ClassStudentSelector';
import { useAnalyzeStudentWork } from '@/hooks/useAnalyzeStudentWork';
import { useBatchAnalysis } from '@/hooks/useBatchAnalysis';
import { ManualScoringForm } from '@/components/scan/ManualScoringForm';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type ScanState = 'idle' | 'camera' | 'preview' | 'analyzed' | 'manual-scoring';
type ScanMode = 'single' | 'batch';
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
  const [showBatchReport, setShowBatchReport] = useState(false);
  const [gradingMethod, setGradingMethod] = useState<GradingMethod>('ai');
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);

  // Class & student selection for batch mode
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const { students } = useClassStudents(selectedClassId);

  const { analyze, isAnalyzing, error, result, rawAnalysis } = useAnalyzeStudentWork();
  const batch = useBatchAnalysis();

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

  const handlePreviewConfirm = useCallback((finalImageDataUrl: string) => {
    if (scanMode === 'batch') {
      batch.addImage(finalImageDataUrl);
      toast.success('Image added to batch');
    } else {
      setFinalImage(finalImageDataUrl);
      toast.success('Photo captured successfully!');
    }
    setCapturedImage(null);
    setScanState('idle');
  }, [scanMode, batch]);

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

  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        batch.addImage(dataUrl);
      };
      reader.readAsDataURL(file);
    });
    
    toast.success(`Added ${files.length} image(s) to batch`);
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

    if (gradingMethod === 'teacher') {
      setScanState('manual-scoring');
      return;
    }

    const analysisResult = await analyze(finalImage, undefined, mockRubricSteps);
    
    if (analysisResult) {
      setScanState('analyzed');
      toast.success('Analysis complete!', {
        description: `Score: ${analysisResult.totalScore.earned}/${analysisResult.totalScore.possible} (${analysisResult.totalScore.percentage}%)`,
      });
    } else if (error) {
      toast.error('Analysis failed', { description: error });
    }
  };

  const handleManualScoreSubmit = (manualScoreResult: ManualResult) => {
    setManualResult(manualScoreResult);
    setScanState('analyzed');
    toast.success('Score saved!', {
      description: `Score: ${manualScoreResult.totalScore.earned}/${manualScoreResult.totalScore.possible} (${manualScoreResult.totalScore.percentage}%)`,
    });
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
    setScanState('idle');
  };

  const startNewScan = () => {
    setFinalImage(null);
    setCapturedImage(null);
    setScanState('idle');
    setShowBatchReport(false);
    setManualResult(null);
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

          {/* Grading Method Selection */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Grading Method</Label>
                <RadioGroup
                  value={gradingMethod}
                  onValueChange={(v) => setGradingMethod(v as GradingMethod)}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ai" id="ai" />
                    <Label htmlFor="ai" className="flex items-center gap-2 cursor-pointer">
                      <Bot className="h-4 w-4 text-primary" />
                      <span>AI Analysis</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="teacher" id="teacher" />
                    <Label htmlFor="teacher" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Teacher Input</span>
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  {gradingMethod === 'ai' 
                    ? 'AI will automatically analyze and grade student work based on the rubric.'
                    : 'You will manually input scores and feedback for each student.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mode Toggle */}
          <Tabs value={scanMode} onValueChange={(v) => {
            setScanMode(v as ScanMode);
            startNewScan();
            batch.clearAll();
            setSelectedClassId(null);
            setSelectedStudentIds([]);
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="gap-2">
                <Camera className="h-4 w-4" />
                Single Scan
              </TabsTrigger>
              <TabsTrigger value="batch" className="gap-2">
                <Layers className="h-4 w-4" />
                Batch Mode
              </TabsTrigger>
            </TabsList>

            {/* Single Scan Mode */}
            <TabsContent value="single" className="space-y-4 mt-4">
              {/* Manual Scoring Form */}
              {scanState === 'manual-scoring' && finalImage && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Manual Scoring</h2>
                  </div>
                  <ManualScoringForm
                    rubricSteps={mockRubricSteps}
                    imageUrl={finalImage}
                    onSubmit={handleManualScoreSubmit}
                    onCancel={() => setScanState('idle')}
                  />
                </div>
              )}

              {/* Analysis Results - AI or Manual */}
              {scanState === 'analyzed' && (result || manualResult) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                      {manualResult ? 'Teacher Scoring Results' : 'AI Grading Results'}
                    </h2>
                    <Button variant="outline" size="sm" onClick={startNewScan}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      New Scan
                    </Button>
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
                  
                  {result && !manualResult && (
                    <AnalysisResults result={result} rawAnalysis={rawAnalysis} />
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
                </div>
              )}

              {/* Main scan card */}
              {scanState !== 'analyzed' && scanState !== 'manual-scoring' && (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    {finalImage ? (
                      <div className="p-6 space-y-4">
                        <div className="relative rounded-lg overflow-hidden border bg-muted">
                          <img 
                            src={finalImage} 
                            alt="Captured student work" 
                            className="w-full object-contain max-h-[50vh]" 
                          />
                          {isAnalyzing && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                                <p className="font-medium">Analyzing with AI...</p>
                                <p className="text-sm text-muted-foreground">Running OCR and auto-grading</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                            <Users className="h-5 w-5" />
                            <span className="text-xs">Select Student</span>
                          </Button>
                          <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                            <FileText className="h-5 w-5" />
                            <span className="text-xs">Select Question</span>
                          </Button>
                        </div>

                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={clearImage}
                            disabled={isAnalyzing}
                          >
                            Retake
                          </Button>
                          <Button 
                            variant="hero" 
                            className="flex-1"
                            onClick={analyzeImage}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing ? 'Analyzing...' : gradingMethod === 'ai' ? 'Analyze with AI' : 'Score Manually'}
                          </Button>
                        </div>
                      </div>
                    ) : (
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
                    )}
                  </CardContent>
                </Card>
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
                              ? `Upload papers and assign to students from your class`
                              : 'Select a class above, then add papers'}
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
