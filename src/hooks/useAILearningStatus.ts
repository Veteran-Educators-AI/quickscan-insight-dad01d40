import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface AILearningStatus {
  correctionCount: number;
  verificationCount: number;
  isReady: boolean; // Has enough data to use learned grading
  readinessPercent: number;
  isLoading: boolean;
}

const MIN_CORRECTIONS_FOR_LEARNING = 10;

export function useAILearningStatus(): AILearningStatus {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['ai-learning-status', user?.id],
    queryFn: async () => {
      if (!user) return { correctionCount: 0, verificationCount: 0 };

      const [correctionsResult, verificationsResult] = await Promise.all([
        supabase
          .from('grading_corrections')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_id', user.id),
        supabase
          .from('interpretation_verifications')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_id', user.id),
      ]);

      return {
        correctionCount: correctionsResult.count || 0,
        verificationCount: verificationsResult.count || 0,
      };
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  const correctionCount = data?.correctionCount || 0;
  const verificationCount = data?.verificationCount || 0;
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
