import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface GradeHistoryStats {
  totalStudents: number;
  classAverage: number;
  topicsTracked: number;
  totalEntries: number;
  isLoading: boolean;
  error: Error | null;
}

// Extract clean topic name from verbose text for counting unique topics
function extractCleanTopic(text: string): string {
  if (!text) return 'unknown';

  const topicKeywords: Record<string, string> = {
    'credit card': 'credit_card',
    'interest charge': 'interest_charges',
    'minimum payment': 'minimum_payments',
    'apr': 'apr',
    'annual fee': 'annual_fees',
    'finance charge': 'finance_charges',
    'composite figure': 'composite_figures',
    'composite area': 'composite_figures',
    'triangle': 'triangles',
    'circle': 'circles',
    'rectangle': 'rectangles',
    'volume': 'volume',
    'surface area': 'surface_area',
    'proof': 'proofs',
    'congruent': 'congruence',
    'similar': 'similarity',
    'parallel': 'parallel_lines',
    'angle': 'angles',
    'coordinate': 'coordinate_geometry',
    'transformation': 'transformations',
    'debt': 'debt_management',
    'payoff': 'loan_payoff',
  };

  const lowerText = text.toLowerCase();
  
  for (const [keyword, topic] of Object.entries(topicKeywords)) {
    if (lowerText.includes(keyword)) {
      return topic;
    }
  }

  return 'general';
}

export function useGradeHistoryStats(classId?: string): GradeHistoryStats {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['grade-history-stats', user?.id, classId],
    queryFn: async () => {
      if (!user) return { totalStudents: 0, classAverage: 0, topicsTracked: 0, totalEntries: 0 };

      let query = supabase
        .from('grade_history')
        .select(`
          id,
          grade,
          topic_name,
          student_id,
          students!inner(
            id,
            class_id,
            classes!inner(teacher_id)
          )
        `)
        .eq('students.classes.teacher_id', user.id);

      if (classId) {
        query = query.eq('students.class_id', classId);
      }

      const { data: grades, error } = await query;
      if (error) throw error;

      if (!grades || grades.length === 0) {
        return { totalStudents: 0, classAverage: 0, topicsTracked: 0, totalEntries: 0 };
      }

      // Calculate stats
      const uniqueStudents = new Set(grades.map(g => g.student_id));
      const totalGrade = grades.reduce((sum, g) => sum + (g.grade || 0), 0);
      const classAverage = Math.round(totalGrade / grades.length);
      
      // Count unique topics by extracting clean topic names
      const uniqueTopics = new Set(
        grades.map(g => extractCleanTopic(g.topic_name || ''))
      );

      return {
        totalStudents: uniqueStudents.size,
        classAverage,
        topicsTracked: uniqueTopics.size,
        totalEntries: grades.length,
      };
    },
    enabled: !!user,
  });

  return {
    totalStudents: data?.totalStudents || 0,
    classAverage: data?.classAverage || 0,
    topicsTracked: data?.topicsTracked || 0,
    totalEntries: data?.totalEntries || 0,
    isLoading,
    error: error as Error | null,
  };
}
