import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { StudentMastery, TopicMastery } from '@/components/reports/MasteryHeatMap';

interface UseMasteryDataOptions {
  classId?: string;
}

interface MasteryDataResult {
  students: StudentMastery[];
  topics: { id: string; name: string }[];
  isLoading: boolean;
  error: Error | null;
}

export function useMasteryData(options: UseMasteryDataOptions = {}): MasteryDataResult {
  const { user } = useAuth();
  const { classId } = options;

  const { data, isLoading, error } = useQuery({
    queryKey: ['mastery-data', user?.id, classId],
    queryFn: async () => {
      if (!user) return { students: [], topics: [] };

      // Fetch all students for the teacher's classes
      let studentsQuery = supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          class_id,
          classes!inner(teacher_id)
        `)
        .eq('classes.teacher_id', user.id);

      if (classId) {
        studentsQuery = studentsQuery.eq('class_id', classId);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        return { students: [], topics: [] };
      }

      const studentIds = students.map(s => s.id);

      // Fetch all attempts for these students
      const { data: attempts, error: attemptsError } = await supabase
        .from('attempts')
        .select(`
          id,
          student_id,
          question_id,
          status
        `)
        .in('student_id', studentIds);

      if (attemptsError) throw attemptsError;

      if (!attempts || attempts.length === 0) {
        // Return students with empty mastery data
        const { data: topics } = await supabase
          .from('topics')
          .select('id, name')
          .or(`is_default.eq.true,teacher_id.eq.${user.id}`);

        return {
          students: students.map(s => ({
            studentId: s.id,
            studentName: `${s.first_name} ${s.last_name}`,
            topics: [],
            overallMastery: 0,
          })),
          topics: topics || [],
        };
      }

      const attemptIds = attempts.map(a => a.id);
      const questionIds = [...new Set(attempts.map(a => a.question_id))];

      // Fetch scores for these attempts
      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select(`
          attempt_id,
          points_earned,
          rubric_id,
          rubrics(points, question_id)
        `)
        .in('attempt_id', attemptIds);

      if (scoresError) throw scoresError;

      // Fetch question topics mapping
      const { data: questionTopics, error: qtError } = await supabase
        .from('question_topics')
        .select(`
          question_id,
          topic_id,
          topics(id, name)
        `)
        .in('question_id', questionIds);

      if (qtError) throw qtError;

      // Fetch all relevant topics
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, name')
        .or(`is_default.eq.true,teacher_id.eq.${user.id}`);

      if (topicsError) throw topicsError;

      // Build a map of question -> topics
      const questionToTopics: Record<string, string[]> = {};
      questionTopics?.forEach(qt => {
        if (!questionToTopics[qt.question_id]) {
          questionToTopics[qt.question_id] = [];
        }
        questionToTopics[qt.question_id].push(qt.topic_id);
      });

      // Build a map of attempt -> score percentage
      const attemptScores: Record<string, { earned: number; possible: number }> = {};
      scores?.forEach(score => {
        const attemptId = score.attempt_id;
        if (!attemptScores[attemptId]) {
          attemptScores[attemptId] = { earned: 0, possible: 0 };
        }
        attemptScores[attemptId].earned += Number(score.points_earned) || 0;
        // Get max points from rubric
        const maxPoints = (score.rubrics as any)?.points || 1;
        attemptScores[attemptId].possible += maxPoints;
      });

      // Calculate mastery per student per topic
      const studentMasteryMap: Record<string, Record<string, { total: number; count: number; attempts: number }>> = {};

      attempts.forEach(attempt => {
        const studentId = attempt.student_id;
        const questionId = attempt.question_id;
        const topicIds = questionToTopics[questionId] || [];
        const scoreData = attemptScores[attempt.id];

        if (!studentMasteryMap[studentId]) {
          studentMasteryMap[studentId] = {};
        }

        // Calculate score percentage for this attempt
        let scorePercent = 0;
        if (scoreData && scoreData.possible > 0) {
          scorePercent = Math.round((scoreData.earned / scoreData.possible) * 100);
        } else if (attempt.status === 'reviewed' || attempt.status === 'analyzed') {
          // If attempt is reviewed but no scores, treat as 0%
          scorePercent = 0;
        } else {
          // Pending attempts - don't count
          return;
        }

        topicIds.forEach(topicId => {
          if (!studentMasteryMap[studentId][topicId]) {
            studentMasteryMap[studentId][topicId] = { total: 0, count: 0, attempts: 0 };
          }
          studentMasteryMap[studentId][topicId].total += scorePercent;
          studentMasteryMap[studentId][topicId].count += 1;
          studentMasteryMap[studentId][topicId].attempts += 1;
        });
      });

      // Convert to StudentMastery format
      const studentMasteryData: StudentMastery[] = students.map(student => {
        const masteryByTopic = studentMasteryMap[student.id] || {};
        
        const topicsMastery: TopicMastery[] = (topics || []).map(topic => {
          const data = masteryByTopic[topic.id];
          return {
            topicId: topic.id,
            topicName: topic.name,
            totalAttempts: data?.attempts || 0,
            correctPercentage: data && data.count > 0 ? Math.round(data.total / data.count) : 0,
            avgScore: data && data.count > 0 ? Math.round(data.total / data.count) : 0,
          };
        });

        // Calculate overall mastery
        const topicsWithData = topicsMastery.filter(t => t.totalAttempts > 0);
        const overallMastery = topicsWithData.length > 0
          ? Math.round(topicsWithData.reduce((sum, t) => sum + t.avgScore, 0) / topicsWithData.length)
          : 0;

        return {
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          topics: topicsMastery,
          overallMastery,
        };
      });

      return {
        students: studentMasteryData,
        topics: topics || [],
      };
    },
    enabled: !!user,
  });

  return {
    students: data?.students || [],
    topics: data?.topics || [],
    isLoading,
    error: error as Error | null,
  };
}
