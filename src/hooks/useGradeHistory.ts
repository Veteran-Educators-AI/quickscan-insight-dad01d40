import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GradeHistoryEntry {
  id: string;
  student_id: string;
  topic_id: string | null;
  topic_name: string;
  grade: number;
  grade_justification: string | null;
  raw_score_earned: number | null;
  raw_score_possible: number | null;
  attempt_id: string | null;
  teacher_id: string;
  created_at: string;
}

interface SaveGradeHistoryParams {
  studentId: string;
  topicId?: string | null;
  topicName: string;
  grade: number;
  gradeJustification?: string;
  rawScoreEarned?: number;
  rawScorePossible?: number;
  attemptId?: string;
}

export function useGradeHistory(studentId?: string, topicId?: string) {
  const queryClient = useQueryClient();

  const { data: gradeHistory, isLoading } = useQuery({
    queryKey: ['gradeHistory', studentId, topicId],
    queryFn: async () => {
      let query = supabase
        .from('grade_history')
        .select('*')
        .order('created_at', { ascending: true });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      if (topicId) {
        query = query.eq('topic_id', topicId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching grade history:', error);
        throw error;
      }

      return data as GradeHistoryEntry[];
    },
    enabled: !!studentId,
  });

  const saveGradeHistory = useMutation({
    mutationFn: async (params: SaveGradeHistoryParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('grade_history')
        .insert({
          student_id: params.studentId,
          topic_id: params.topicId || null,
          topic_name: params.topicName,
          grade: params.grade,
          grade_justification: params.gradeJustification || null,
          raw_score_earned: params.rawScoreEarned || null,
          raw_score_possible: params.rawScorePossible || null,
          attempt_id: params.attemptId || null,
          teacher_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving grade history:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradeHistory'] });
    },
  });

  return {
    gradeHistory,
    isLoading,
    saveGradeHistory: saveGradeHistory.mutate,
    isSaving: saveGradeHistory.isPending,
  };
}

export function useStudentGradesByTopic(studentId?: string) {
  return useQuery({
    queryKey: ['gradeHistoryByTopic', studentId],
    queryFn: async () => {
      if (!studentId) return {};

      const { data, error } = await supabase
        .from('grade_history')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching grade history:', error);
        throw error;
      }

      // Group by topic
      const byTopic: Record<string, GradeHistoryEntry[]> = {};
      for (const entry of data) {
        const key = entry.topic_name;
        if (!byTopic[key]) {
          byTopic[key] = [];
        }
        byTopic[key].push(entry as GradeHistoryEntry);
      }

      return byTopic;
    },
    enabled: !!studentId,
  });
}
