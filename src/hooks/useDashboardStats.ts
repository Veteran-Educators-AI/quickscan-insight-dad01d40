import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface DashboardStats {
  profile: {
    full_name: string;
  } | null;
  class_count: number;
  question_count: number;
  student_count: number;
  unread_comments_count: number;
  recent_lessons: Array<{
    id: string;
    title: string;
    topic_name: string;
    standard: string;
    subject: string | null;
    created_at: string;
  }>;
  pending_scholar_data_count: number;
  remediation_completions: {
    count: number;
    items: Array<{
      id: string;
      student_id: string | null;
      action: string;
      data: {
        activity_name?: string;
        topic_name?: string;
        score?: number;
        xp_earned?: number;
        coins_earned?: number;
        student_name?: string;
      };
      created_at: string;
    }>;
  };
}

/**
 * Unified hook to fetch all dashboard statistics in a single API call
 * This replaces multiple individual queries and significantly reduces API overhead
 */
export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        teacher_uuid: user.id,
      });

      if (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }

      // Type assertion for the JSON response
      const rawData = data as any;

      // Ensure we have default values for all fields
      const stats: DashboardStats = {
        profile: rawData?.profile || null,
        class_count: rawData?.class_count || 0,
        question_count: rawData?.question_count || 0,
        student_count: rawData?.student_count || 0,
        unread_comments_count: rawData?.unread_comments_count || 0,
        recent_lessons: rawData?.recent_lessons || [],
        pending_scholar_data_count: rawData?.pending_scholar_data_count || 0,
        remediation_completions: {
          count: rawData?.remediation_completions?.count || 0,
          items: rawData?.remediation_completions?.items || [],
        },
      };

      return stats;
    },
    enabled: !!user,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute for real-time updates
  });
}
