import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface DailyStats {
  date: string;
  approved: number;
  rejected: number;
  total: number;
  accuracy: number; // percentage of approved interpretations
}

interface VerificationStats {
  totalApproved: number;
  totalRejected: number;
  totalVerifications: number;
  accuracyRate: number;
  dailyStats: DailyStats[];
  recentTrend: 'improving' | 'declining' | 'stable';
  isLoading: boolean;
}

/**
 * Verification Stats hook - now uses RPC function to consolidate queries
 * Previously made 1-2 separate API calls
 * Now uses a single RPC call with React Query caching
 */
export function useVerificationStats(days: number = 30): VerificationStats {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['verification-stats', user?.id, days],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .rpc('get_verification_stats', { 
          teacher_uuid: user.id,
          days_back: days 
        });

      if (error) throw error;

      // Type assertion for RPC response
      const response = data as any;
      const dailyStats: DailyStats[] = response.daily_stats || [];

      // Calculate trend from last 7 days vs previous 7 days
      const recentDays = dailyStats.slice(-7);
      const previousDays = dailyStats.slice(-14, -7);

      const recentAvg = recentDays.reduce((sum, d) => sum + d.accuracy, 0) / Math.max(recentDays.filter(d => d.total > 0).length, 1);
      const previousAvg = previousDays.reduce((sum, d) => sum + d.accuracy, 0) / Math.max(previousDays.filter(d => d.total > 0).length, 1);

      let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (recentAvg - previousAvg > 5) {
        recentTrend = 'improving';
      } else if (previousAvg - recentAvg > 5) {
        recentTrend = 'declining';
      }

      return {
        totalApproved: response.total_approved || 0,
        totalRejected: response.total_rejected || 0,
        totalVerifications: response.total_verifications || 0,
        accuracyRate: response.accuracy_rate || 0,
        dailyStats,
        recentTrend,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000,
  });

  return {
    totalApproved: data?.totalApproved || 0,
    totalRejected: data?.totalRejected || 0,
    totalVerifications: data?.totalVerifications || 0,
    accuracyRate: data?.accuracyRate || 0,
    dailyStats: data?.dailyStats || [],
    recentTrend: data?.recentTrend || 'stable',
    isLoading,
  };
}
