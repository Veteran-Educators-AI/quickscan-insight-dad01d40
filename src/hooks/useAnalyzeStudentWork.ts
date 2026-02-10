import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { handleApiError, checkResponseForApiError } from '@/lib/apiErrorHandler';
import { useBlankPageSettings } from '@/hooks/useBlankPageSettings';
import { compressImage } from '@/lib/imageUtils';

// ── Resilient Edge Function Invocation for Single Analysis ──

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isPermanentError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || error.toString() || '').toLowerCase();
  return (
    msg.includes('unauthorized') || msg.includes('invalid token') ||
    msg.includes('401') || msg.includes('402') || msg.includes('403') ||
    msg.includes('payment') || msg.includes('credit') || msg.includes('quota') ||
    msg.includes('api key') || msg.includes('image data is required')
  );
}

async function compressForEdgeFunction(imageDataUrl: string): Promise<string> {
  try {
    if (imageDataUrl.length < 270000) return imageDataUrl;
    return await compressImage(imageDataUrl, 1600, 0.75);
  } catch {
    return imageDataUrl;
  }
}

async function invokeAnalyzeWithRetry(
  body: Record<string, any>,
  maxRetries = 1
): Promise<{ data: any; error: any }> {
  // Compress images in body
  const processedBody = { ...body };
  const imageKeys = ['imageBase64', 'answerGuideBase64', 'solutionBase64'];
  for (const key of imageKeys) {
    if (processedBody[key] && typeof processedBody[key] === 'string') {
      processedBody[key] = await compressForEdgeFunction(processedBody[key]);
    }
  }

  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = 2000 * Math.pow(2, attempt - 1);
      console.log(`[invokeAnalyzeWithRetry] Retry ${attempt}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }

    try {
      const { data, error } = await supabase.functions.invoke('analyze-student-work', {
        body: processedBody,
      });

      if (error) {
        lastError = error;
        if (isPermanentError(error)) return { data: null, error };
        console.warn(`[invokeAnalyzeWithRetry] Transient error (attempt ${attempt + 1}):`, error.message);
        continue;
      }

      return { data, error: null };
    } catch (err: any) {
      lastError = err;
      if (isPermanentError(err)) return { data: null, error: err };
      console.warn(`[invokeAnalyzeWithRetry] Exception (attempt ${attempt + 1}):`, err.message);
    }
  }

  return { data: null, error: lastError || new Error('All retry attempts failed') };
}

interface RubricStep {
  step_number: number;
  description: string;
  points: number;
}

interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface CustomRubric {
  id: string;
  name: string;
  totalPoints: number;
  passingThreshold: number;
  criteria: {
    id: string;
    name: string;
    weight: number;
    description: string;
    regentsAlignment: string;
  }[];
}

interface AnalysisResult {
  ocrText: string;
  problemIdentified: string;
  nysStandard?: string;
  approachAnalysis: string;
  strengthsAnalysis?: string[];
  areasForImprovement?: string[];
  rubricScores: RubricScore[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  regentsScore?: number;
  regentsScoreJustification?: string;
  grade?: number;
  gradeJustification?: string;
  feedback: string;
  gradingSource?: 'ai' | 'teacher-guided';
  noResponse?: boolean;
  noResponseReason?: string;
}

interface ComparisonResult {
  suggestedScores: RubricScore[];
  totalScore: { earned: number; possible: number; percentage: number };
  misconceptions: string[];
  feedback: string;
  correctnessAnalysis: string;
  rawComparison: string;
}

interface TeacherGuidedAnalysisOptions {
  answerGuideImage: string;
  runParallelAI?: boolean; // Also run standard AI for comparison
}

interface UseAnalyzeStudentWorkReturn {
  analyze: (
    imageDataUrl: string, 
    questionId?: string, 
    rubricSteps?: RubricStep[], 
    studentName?: string,
    assessmentMode?: 'teacher' | 'ai',
    promptText?: string,
    standardCode?: string,
    topicName?: string
  ) => Promise<AnalysisResult | null>;
  analyzeWithTeacherGuide: (
    imageDataUrl: string,
    answerGuideImage: string,
    options?: {
      questionId?: string;
      rubricSteps?: RubricStep[];
      studentName?: string;
      promptText?: string;
      standardCode?: string;
      topicName?: string;
    }
  ) => Promise<AnalysisResult | null>;
  runBothAnalyses: (
    imageDataUrl: string,
    answerGuideImage: string,
    options?: {
      questionId?: string;
      rubricSteps?: RubricStep[];
      studentName?: string;
      promptText?: string;
      standardCode?: string;
      topicName?: string;
    }
  ) => Promise<{ aiResult: AnalysisResult | null; teacherGuidedResult: AnalysisResult | null }>;
  compareWithSolution: (
    studentImage: string,
    solutionImage: string,
    rubricSteps?: RubricStep[]
  ) => Promise<ComparisonResult | null>;
  cancelAnalysis: () => void;
  isAnalyzing: boolean;
  isComparing: boolean;
  error: string | null;
  result: AnalysisResult | null;
  setResult: React.Dispatch<React.SetStateAction<AnalysisResult | null>>;
  teacherGuidedResult: AnalysisResult | null;
  setTeacherGuidedResult: React.Dispatch<React.SetStateAction<AnalysisResult | null>>;
  comparisonResult: ComparisonResult | null;
  rawAnalysis: string | null;
  setRawAnalysis: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useAnalyzeStudentWork(): UseAnalyzeStudentWorkReturn {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [teacherGuidedResult, setTeacherGuidedResult] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [rawAnalysis, setRawAnalysis] = useState<string | null>(null);
  const [customRubric, setCustomRubric] = useState<CustomRubric | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const { settings: blankPageSettings } = useBlankPageSettings();

  // Load custom rubric from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('custom-grading-rubric');
    if (saved) {
      try {
        setCustomRubric(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load custom rubric:', e);
      }
    }
  }, []);

  const cancelAnalysis = () => {
    setIsCancelled(true);
    setIsAnalyzing(false);
    setIsComparing(false);
    setError('Analysis cancelled');
  };

  const analyze = async (
    imageDataUrl: string, 
    questionId?: string, 
    rubricSteps?: RubricStep[],
    studentName?: string,
    assessmentMode?: 'teacher' | 'ai',
    promptText?: string,
    standardCode?: string,
    topicName?: string
  ): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setRawAnalysis(null);
    setIsCancelled(false);

    try {
      // STEP 1: Extract text via Google Cloud Vision API (fast, ~1-2s)
      let ocrText: string | null = null;
      try {
        const { data: ocrData, error: ocrError } = await supabase.functions.invoke('ocr-student-work', {
          body: { imageBase64: imageDataUrl },
        });
        if (!ocrError && ocrData?.success && ocrData?.ocrText) {
          ocrText = ocrData.ocrText;
          console.log(`[OCR] Single scan: extracted ${ocrText!.length} chars in ${ocrData.latencyMs}ms`);
        } else {
          console.warn('[OCR] Single scan failed, falling back to image-based:', ocrError?.message || ocrData?.error);
        }
      } catch (ocrErr: any) {
        console.warn('[OCR] Single scan exception, falling back:', ocrErr.message);
      }

      // STEP 2: Build request — use OCR text if available, else image
      const requestPayload: any = {
        questionId,
        rubricSteps,
        studentName,
        teacherId: user?.id,
        assessmentMode: assessmentMode || 'ai',
        promptText,
        standardCode,
        topicName,
        customRubric,
        blankPageSettings: blankPageSettings.autoScoreBlankPages ? {
          enabled: true,
          score: blankPageSettings.blankPageScore,
          comment: blankPageSettings.blankPageComment,
        } : undefined,
      };

      const ocrUsable = ocrText && ocrText.length > 30 && !ocrText.includes('[OCR FAILED');
      if (ocrUsable) {
        requestPayload.preExtractedOCR = ocrText;
        requestPayload.imageBase64 = imageDataUrl; // Always send real image as fallback
      } else {
        requestPayload.imageBase64 = imageDataUrl;
      }

      const { data, error: fnError } = await invokeAnalyzeWithRetry(requestPayload);

      // Check if cancelled before processing result
      if (isCancelled) {
        return null;
      }

      if (fnError) {
        handleApiError(fnError, 'Analysis');
        return null;
      }

      if (checkResponseForApiError(data)) {
        return null;
      }

      if (!data?.success || !data?.analysis) {
        throw new Error('Invalid response from analysis');
      }

      // Check again if cancelled
      if (isCancelled) {
        return null;
      }

      const analysisResult = { ...data.analysis, gradingSource: 'ai' as const };
      setResult(analysisResult);
      setRawAnalysis(data.rawAnalysis);
      return analysisResult;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeWithTeacherGuide = async (
    imageDataUrl: string,
    answerGuideImage: string,
    options?: {
      questionId?: string;
      rubricSteps?: RubricStep[];
      studentName?: string;
      promptText?: string;
      standardCode?: string;
      topicName?: string;
    }
  ): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    setTeacherGuidedResult(null);
    setIsCancelled(false);

    try {
      const { data, error: fnError } = await invokeAnalyzeWithRetry({
        imageBase64: imageDataUrl,
        answerGuideBase64: answerGuideImage,
        questionId: options?.questionId,
        rubricSteps: options?.rubricSteps,
        studentName: options?.studentName,
        teacherId: user?.id,
        assessmentMode: 'teacher-guided',
        promptText: options?.promptText,
        standardCode: options?.standardCode,
        topicName: options?.topicName,
        customRubric,
        blankPageSettings: blankPageSettings.autoScoreBlankPages ? {
          enabled: true,
          score: blankPageSettings.blankPageScore,
          comment: blankPageSettings.blankPageComment,
        } : undefined,
      });

      if (isCancelled) {
        return null;
      }

      if (fnError) {
        handleApiError(fnError, 'Teacher-Guided Analysis');
        return null;
      }

      if (checkResponseForApiError(data)) {
        return null;
      }

      if (!data?.success || !data?.analysis) {
        throw new Error('Invalid response from teacher-guided analysis');
      }

      if (isCancelled) {
        return null;
      }

      const analysisResult = { ...data.analysis, gradingSource: 'teacher-guided' as const };
      setTeacherGuidedResult(analysisResult);
      setRawAnalysis(data.rawAnalysis);
      return analysisResult;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runBothAnalyses = async (
    imageDataUrl: string,
    answerGuideImage: string,
    options?: {
      questionId?: string;
      rubricSteps?: RubricStep[];
      studentName?: string;
      promptText?: string;
      standardCode?: string;
      topicName?: string;
    }
  ): Promise<{ aiResult: AnalysisResult | null; teacherGuidedResult: AnalysisResult | null }> => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setTeacherGuidedResult(null);
    setIsCancelled(false);

    try {
      // Compress the image once (shared between both analyses)
      const compressedImage = await compressForEdgeFunction(imageDataUrl);
      const compressedGuide = answerGuideImage ? await compressForEdgeFunction(answerGuideImage) : undefined;

      // Run both analyses in parallel with retry
      const [aiResponse, teacherGuidedResponse] = await Promise.all([
        invokeAnalyzeWithRetry({
          imageBase64: compressedImage,
          questionId: options?.questionId,
          rubricSteps: options?.rubricSteps,
          studentName: options?.studentName,
          teacherId: user?.id,
          assessmentMode: 'ai',
          promptText: options?.promptText,
          standardCode: options?.standardCode,
          topicName: options?.topicName,
          customRubric,
          blankPageSettings: blankPageSettings.autoScoreBlankPages ? {
            enabled: true,
            score: blankPageSettings.blankPageScore,
            comment: blankPageSettings.blankPageComment,
          } : undefined,
        }),
        invokeAnalyzeWithRetry({
          imageBase64: compressedImage,
          answerGuideBase64: compressedGuide,
          questionId: options?.questionId,
          rubricSteps: options?.rubricSteps,
          studentName: options?.studentName,
          teacherId: user?.id,
          assessmentMode: 'teacher-guided',
          promptText: options?.promptText,
          standardCode: options?.standardCode,
          topicName: options?.topicName,
          customRubric,
          blankPageSettings: blankPageSettings.autoScoreBlankPages ? {
            enabled: true,
            score: blankPageSettings.blankPageScore,
            comment: blankPageSettings.blankPageComment,
          } : undefined,
        }),
      ]);

      if (isCancelled) {
        return { aiResult: null, teacherGuidedResult: null };
      }

      let aiResult: AnalysisResult | null = null;
      let teacherGuidedResultData: AnalysisResult | null = null;

      if (!aiResponse.error && aiResponse.data?.success && aiResponse.data?.analysis) {
        aiResult = { ...aiResponse.data.analysis, gradingSource: 'ai' as const };
        setResult(aiResult);
      }

      if (!teacherGuidedResponse.error && teacherGuidedResponse.data?.success && teacherGuidedResponse.data?.analysis) {
        teacherGuidedResultData = { ...teacherGuidedResponse.data.analysis, gradingSource: 'teacher-guided' as const };
        setTeacherGuidedResult(teacherGuidedResultData);
      }

      return { aiResult, teacherGuidedResult: teacherGuidedResultData };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      return { aiResult: null, teacherGuidedResult: null };
    } finally {
      setIsAnalyzing(false);
    }
  };

  const compareWithSolution = async (
    studentImage: string,
    solutionImage: string,
    rubricSteps?: RubricStep[]
  ): Promise<ComparisonResult | null> => {
    setIsComparing(true);
    setError(null);
    setComparisonResult(null);

    try {
      const { data, error: fnError } = await invokeAnalyzeWithRetry({
        imageBase64: studentImage,
        solutionBase64: solutionImage,
        rubricSteps,
        compareMode: true,
      });

      if (fnError) {
        handleApiError(fnError, 'Comparison');
        return null;
      }

      if (checkResponseForApiError(data)) {
        return null;
      }

      if (!data?.success || !data?.comparison) {
        throw new Error('Invalid response from comparison');
      }

      setComparisonResult(data.comparison);
      return data.comparison;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      return null;
    } finally {
      setIsComparing(false);
    }
  };

  return { 
    analyze, 
    analyzeWithTeacherGuide,
    runBothAnalyses,
    compareWithSolution, 
    cancelAnalysis, 
    isAnalyzing, 
    isComparing, 
    error, 
    result, 
    setResult,
    teacherGuidedResult,
    setTeacherGuidedResult,
    comparisonResult, 
    rawAnalysis,
    setRawAnalysis,
  };
}
