import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface AILearningStats {
  gradingCorrections: {
    count: number;
    avgAdjustment: number;
    dominantStyle: string | null;
  };
  interpretationVerifications: {
    totalCount: number;
    approvedCount: number;
    rejectedCount: number;
    accuracyRate: number;
  };
  nameCorrections: {
    totalCount: number;
  };
}

/**
 * Unified AI Learning Stats hook
 * 
 * Consolidates 4-5 separate API calls into a single RPC function call:
 * - grading_corrections (count + stats)
 * - interpretation_verifications (total count)
 * - interpretation_verifications (approved count)
 * - name_corrections (count)
 * 
 * Uses React Query for automatic caching and deduplication
 */
export function useAILearningStats() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-learning-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .rpc('get_ai_learning_stats', { teacher_uuid: user.id });

      if (error) throw error;

      // Type assertion for RPC response
      const response = data as any;

      // Map RPC response to our interface
      const stats: AILearningStats = {
        gradingCorrections: {
          count: response.grading_corrections?.count || 0,
          avgAdjustment: response.grading_corrections?.avg_adjustment || 0,
          dominantStyle: response.grading_corrections?.dominant_style || null,
        },
        interpretationVerifications: {
          totalCount: response.interpretation_verifications?.total_count || 0,
          approvedCount: response.interpretation_verifications?.approved_count || 0,
          rejectedCount: response.interpretation_verifications?.rejected_count || 0,
          accuracyRate: response.interpretation_verifications?.accuracy_rate || 0,
        },
        nameCorrections: {
          totalCount: response.name_corrections?.total_count || 0,
        },
      };

      return stats;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  return {
    stats: data,
    isLoading,
    error,
    refetch,
  };
}
