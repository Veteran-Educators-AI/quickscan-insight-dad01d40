import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { handleApiError, checkResponseForApiError } from '@/lib/apiErrorHandler';
import { useBlankPageSettings } from '@/hooks/useBlankPageSettings';

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
  teacherGuidedResult: AnalysisResult | null;
  comparisonResult: ComparisonResult | null;
  rawAnalysis: string | null;
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
      // --- Blank page pre-check (client-side, Phase 1: text-based) ---
      // The edge function also does OCR and returns text, but we pass
      // the setting so the server can skip LLM grading for blank pages.

      const { data, error: fnError } = await supabase.functions.invoke('analyze-student-work', {
        body: {
          imageBase64: imageDataUrl,
          questionId,
          rubricSteps,
          studentName,
          teacherId: user?.id,
          assessmentMode: assessmentMode || 'ai',
          promptText,
          standardCode,
          topicName,
          customRubric,
          // Pass blank page settings so the server can short-circuit
          blankPageSettings: blankPageSettings.autoScoreBlankPages ? {
            enabled: true,
            score: blankPageSettings.blankPageScore,
            comment: blankPageSettings.blankPageComment,
          } : undefined,
        },
      });

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
      const { data, error: fnError } = await supabase.functions.invoke('analyze-student-work', {
        body: {
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
        },
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
      // Run both analyses in parallel
      const [aiResponse, teacherGuidedResponse] = await Promise.all([
        supabase.functions.invoke('analyze-student-work', {
          body: {
            imageBase64: imageDataUrl,
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
          },
        }),
        supabase.functions.invoke('analyze-student-work', {
          body: {
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
          },
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
      const { data, error: fnError } = await supabase.functions.invoke('analyze-student-work', {
        body: {
          imageBase64: studentImage,
          solutionBase64: solutionImage,
          rubricSteps,
          compareMode: true,
        },
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
    teacherGuidedResult,
    comparisonResult, 
    rawAnalysis 
  };
}
