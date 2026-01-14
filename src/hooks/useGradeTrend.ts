import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TrendDirection = 'improving' | 'declining' | 'stable' | 'new';

interface GradeTrendResult {
  direction: TrendDirection;
  previousGrade: number | null;
  currentGrade: number;
  change: number;
  recentGrades: number[];
}

export function useGradeTrend(studentId?: string, currentGrade?: number) {
  return useQuery({
    queryKey: ['gradeTrend', studentId],
    queryFn: async (): Promise<GradeTrendResult | null> => {
      if (!studentId || currentGrade === undefined) return null;

      const { data, error } = await supabase
        .from('grade_history')
        .select('grade, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching grade trend:', error);
        return null;
      }

      // Get the last 5 grades (excluding current)
      const recentGrades = data?.map(d => d.grade) || [];
      
      if (recentGrades.length === 0) {
        return {
          direction: 'new',
          previousGrade: null,
          currentGrade,
          change: 0,
          recentGrades: [],
        };
      }

      const previousGrade = recentGrades[0];
      const change = currentGrade - previousGrade;
      
      // Determine trend based on comparison with previous grade
      let direction: TrendDirection;
      if (change > 5) {
        direction = 'improving';
      } else if (change < -5) {
        direction = 'declining';
      } else {
        direction = 'stable';
      }

      return {
        direction,
        previousGrade,
        currentGrade,
        change,
        recentGrades,
      };
    },
    enabled: !!studentId && currentGrade !== undefined,
  });
}

export function useMultipleGradeTrends(studentIds: string[]) {
  return useQuery({
    queryKey: ['gradeTrends', studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return {};

      const { data, error } = await supabase
        .from('grade_history')
        .select('student_id, grade, created_at')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching grade trends:', error);
        return {};
      }

      // Group by student and get their most recent grades
      const byStudent: Record<string, number[]> = {};
      for (const entry of data || []) {
        if (!byStudent[entry.student_id]) {
          byStudent[entry.student_id] = [];
        }
        if (byStudent[entry.student_id].length < 5) {
          byStudent[entry.student_id].push(entry.grade);
        }
      }

      return byStudent;
    },
    enabled: studentIds.length > 0,
  });
}
