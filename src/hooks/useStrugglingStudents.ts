import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface StrugglingStudent {
  id: string;
  firstName: string;
  lastName: string;
  classId: string;
  className: string;
  averageGrade: number;
  weakTopicCount: number;
  weakTopics?: string[];
  trend: 'improving' | 'stable' | 'declining';
  lastAssessmentDate: string | null;
  email?: string;
  parentEmail?: string;
}

/**
 * Optimized hook to fetch struggling students using a single RPC call
 * Replaces multiple sequential queries with a single database function
 */
export function useStrugglingStudents(limit: number = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['struggling-students', user?.id, limit],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      const { data, error } = await supabase.rpc('get_struggling_students', {
        teacher_uuid: user.id,
        student_limit: limit,
      });

      if (error) {
        console.error('Error fetching struggling students:', error);
        throw error;
      }

      // Type assertion for the JSON response
      return (data as unknown as StrugglingStudent[]) || [];
    },
    enabled: !!user,
    staleTime: 60000, // Consider data fresh for 1 minute
  });
}
