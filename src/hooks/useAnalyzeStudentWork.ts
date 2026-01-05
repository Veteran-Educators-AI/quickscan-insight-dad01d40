import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

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

interface UseAnalyzeStudentWorkReturn {
  analyze: (
    imageDataUrl: string, 
    questionId?: string, 
    rubricSteps?: RubricStep[], 
    studentName?: string,
    assessmentMode?: 'teacher' | 'ai',
    promptText?: string
  ) => Promise<AnalysisResult | null>;
  isAnalyzing: boolean;
  error: string | null;
  result: AnalysisResult | null;
  rawAnalysis: string | null;
}

export function useAnalyzeStudentWork(): UseAnalyzeStudentWorkReturn {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
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
        throw new Error(fnError.message || 'Failed to analyze image');
      }

      if (data?.error) {
        throw new Error(data.error);
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

  return { analyze, isAnalyzing, error, result, rawAnalysis };
}
