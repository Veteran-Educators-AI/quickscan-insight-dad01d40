import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface RemediationCompletion {
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
  student?: {
    first_name: string;
    last_name: string;
  };
}

export function useRemediationCompletions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['remediation-completions', user?.id],
    queryFn: async () => {
      if (!user) return { count: 0, completions: [] };

      // Fetch unprocessed completions from sister app
      // Note: sister_app_sync_log has no FK to students table,
      // so we cannot use a Supabase join. Student names come from the data JSONB field.
      const { data: completions, error, count } = await supabase
        .from('sister_app_sync_log')
        .select(`
          id,
          student_id,
          action,
          data,
          created_at
        `, { count: 'exact' })
        .eq('teacher_id', user.id)
        .eq('processed', false)
        .in('action', ['activity_completed', 'grade_completed'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching remediation completions:', error);
        throw error;
      }

      const formattedCompletions: RemediationCompletion[] = (completions || []).map((c: any) => ({
        id: c.id,
        student_id: c.student_id,
        action: c.action,
        data: c.data as RemediationCompletion['data'],
        created_at: c.created_at,
        // Student name comes from the data JSONB field (no FK join available)
        student: c.data?.student_name ? {
          first_name: c.data.student_name.split(' ')[0] || '',
          last_name: c.data.student_name.split(' ').slice(1).join(' ') || '',
        } : undefined,
      }));

      return {
        count: count || 0,
        completions: formattedCompletions,
      };
    },
    enabled: !!user,
    staleTime: 30000, // Refresh every 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute
  });

  const markAsViewed = async (completionIds?: string[]) => {
    if (!user) return;

    const query = supabase
      .from('sister_app_sync_log')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('teacher_id', user.id);

    if (completionIds && completionIds.length > 0) {
      await query.in('id', completionIds);
    } else {
      // Mark all as viewed
      await query
        .eq('processed', false)
        .in('action', ['activity_completed', 'grade_completed']);
    }

    // Invalidate the query to refresh the count
    queryClient.invalidateQueries({ queryKey: ['remediation-completions', user?.id] });
  };

  return {
    count: data?.count || 0,
    completions: data?.completions || [],
    isLoading,
    error,
    markAsViewed,
  };
}
