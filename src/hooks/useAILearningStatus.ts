import { useAILearningStats } from './useAILearningStats';

interface AILearningStatus {
  correctionCount: number;
  verificationCount: number;
  isReady: boolean; // Has enough data to use learned grading
  readinessPercent: number;
  isLoading: boolean;
}

const MIN_CORRECTIONS_FOR_LEARNING = 10;

/**
 * AI Learning Status hook - now uses unified stats to avoid duplicate API calls
 * Previously made 2 separate API calls (grading_corrections count + interpretation_verifications count)
 * Now uses the unified AI learning stats hook which consolidates all AI learning data
 */
export function useAILearningStatus(): AILearningStatus {
  const { stats, isLoading } = useAILearningStats();

  const correctionCount = stats?.gradingCorrections.count || 0;
  const verificationCount = stats?.interpretationVerifications.totalCount || 0;
  const isReady = correctionCount >= MIN_CORRECTIONS_FOR_LEARNING;
  const readinessPercent = Math.min(100, Math.round((correctionCount / MIN_CORRECTIONS_FOR_LEARNING) * 100));

  return {
    correctionCount,
    verificationCount,
    isReady,
    readinessPercent,
    isLoading,
  };
}
