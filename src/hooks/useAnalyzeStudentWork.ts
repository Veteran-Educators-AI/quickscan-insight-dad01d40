import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { handleApiError, checkResponseForApiError } from '@/lib/apiErrorHandler';

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

interface AnalysisResult {
  ocrText: string;
  problemIdentified: string;
  approachAnalysis: string;
  rubricScores: RubricScore[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  feedback: string;
}

interface ComparisonResult {
  suggestedScores: RubricScore[];
  totalScore: { earned: number; possible: number; percentage: number };
  misconceptions: string[];
  feedback: string;
  correctnessAnalysis: string;
  rawComparison: string;
}

interface UseAnalyzeStudentWorkReturn {
  analyze: (
    imageDataUrl: string, 
    questionId?: string, 
    rubricSteps?: RubricStep[], 
    studentName?: string,
    assessmentMode?: 'teacher' | 'ai',
    promptText?: string
  ) => Promise<AnalysisResult | null>;
  compareWithSolution: (
    studentImage: string,
    solutionImage: string,
    rubricSteps?: RubricStep[]
  ) => Promise<ComparisonResult | null>;
  isAnalyzing: boolean;
  isComparing: boolean;
  error: string | null;
  result: AnalysisResult | null;
  comparisonResult: ComparisonResult | null;
  rawAnalysis: string | null;
}

export function useAnalyzeStudentWork(): UseAnalyzeStudentWorkReturn {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [rawAnalysis, setRawAnalysis] = useState<string | null>(null);

  const analyze = async (
    imageDataUrl: string, 
    questionId?: string, 
    rubricSteps?: RubricStep[],
    studentName?: string,
    assessmentMode?: 'teacher' | 'ai',
    promptText?: string
  ): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setRawAnalysis(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-student-work', {
        body: {
          imageBase64: imageDataUrl,
          questionId,
          rubricSteps,
          studentName,
          teacherId: user?.id,
          assessmentMode: assessmentMode || 'teacher',
          promptText,
        },
      });

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

      setResult(data.analysis);
      setRawAnalysis(data.rawAnalysis);
      return data.analysis;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      return null;
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

  return { analyze, compareWithSolution, isAnalyzing, isComparing, error, result, comparisonResult, rawAnalysis };
}
