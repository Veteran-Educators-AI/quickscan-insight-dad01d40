import { useState, useEffect, useCallback } from 'react';
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

export function useVerificationStats(days: number = 30): VerificationStats {
  const { user } = useAuth();
  const [stats, setStats] = useState<VerificationStats>({
    totalApproved: 0,
    totalRejected: 0,
    totalVerifications: 0,
    accuracyRate: 0,
    dailyStats: [],
    recentTrend: 'stable',
    isLoading: true,
  });

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setStats(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Fetch all verifications for this teacher
      const { data: verifications, error } = await supabase
        .from('interpretation_verifications')
        .select('decision, created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!verifications || verifications.length === 0) {
        setStats({
          totalApproved: 0,
          totalRejected: 0,
          totalVerifications: 0,
          accuracyRate: 0,
          dailyStats: [],
          recentTrend: 'stable',
          isLoading: false,
        });
        return;
      }

      // Calculate totals
      const totalApproved = verifications.filter(v => v.decision === 'approved').length;
      const totalRejected = verifications.filter(v => v.decision === 'rejected').length;
      const totalVerifications = verifications.length;
      const accuracyRate = totalVerifications > 0 
        ? Math.round((totalApproved / totalVerifications) * 100) 
        : 0;

      // Group by date for daily stats
      const dailyMap = new Map<string, { approved: number; rejected: number }>();
      
      // Initialize last N days
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, { approved: 0, rejected: 0 });
      }

      // Populate with actual data
      verifications.forEach(v => {
        const dateStr = new Date(v.created_at).toISOString().split('T')[0];
        if (dailyMap.has(dateStr)) {
          const current = dailyMap.get(dateStr)!;
          if (v.decision === 'approved') {
            current.approved++;
          } else {
            current.rejected++;
          }
        }
      });

      // Convert to array
      const dailyStats: DailyStats[] = Array.from(dailyMap.entries()).map(([date, counts]) => {
        const total = counts.approved + counts.rejected;
        return {
          date,
          approved: counts.approved,
          rejected: counts.rejected,
          total,
          accuracy: total > 0 ? Math.round((counts.approved / total) * 100) : 0,
        };
      });

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

      setStats({
        totalApproved,
        totalRejected,
        totalVerifications,
        accuracyRate,
        dailyStats,
        recentTrend,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching verification stats:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id, days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return stats;
}
