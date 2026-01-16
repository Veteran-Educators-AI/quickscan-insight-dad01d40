import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type AdvancementLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface StudentWeakness {
  topicName: string;
  standard: string | null;
  averageScore: number;
  attemptCount: number;
  misconceptions: string[];
  lastAttemptDate: string;
  severityScore: number; // 0-100, higher = more severe weakness
}

export interface StudentPerformanceProfile {
  studentId: string;
  firstName: string;
  lastName: string;
  weakTopics: StudentWeakness[];
  strongTopics: StudentWeakness[];
  overallLevel: AdvancementLevel;
  trend: 'improving' | 'stable' | 'declining';
  totalAttempts: number;
  averageGrade: number;
  misconceptions: { text: string; topic: string; count: number }[];
  lastAssessmentDate: string | null;
  diagnosticHistory: {
    topicName: string;
    recommendedLevel: string;
    date: string;
    levelScores: Record<string, { score: number; total: number }>;
  }[];
}

interface UseStudentWeaknessesOptions {
  classId: string;
  studentIds?: string[];
}

// Level thresholds
const LEVEL_THRESHOLDS = {
  A: 90, B: 80, C: 70, D: 60, E: 50, F: 0,
};

function scoreToLevel(score: number): AdvancementLevel {
  if (score >= LEVEL_THRESHOLDS.A) return 'A';
  if (score >= LEVEL_THRESHOLDS.B) return 'B';
  if (score >= LEVEL_THRESHOLDS.C) return 'C';
  if (score >= LEVEL_THRESHOLDS.D) return 'D';
  if (score >= LEVEL_THRESHOLDS.E) return 'E';
  return 'F';
}

function calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
  if (scores.length < 2) return 'stable';
  const midpoint = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, midpoint);
  const secondHalf = scores.slice(midpoint);
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const diff = secondAvg - firstAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

export function useStudentWeaknesses({ classId, studentIds }: UseStudentWeaknessesOptions) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<StudentPerformanceProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !classId) return;
    fetchProfiles();
  }, [user, classId, studentIds?.join(',')]);

  const fetchProfiles = async () => {
    if (!user || !classId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch students
      let studentsQuery = supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', classId)
        .order('last_name');

      if (studentIds?.length) {
        studentsQuery = studentsQuery.in('id', studentIds);
      }

      const { data: studentsData, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;
      if (!studentsData?.length) {
        setProfiles([]);
        return;
      }

      const ids = studentsData.map(s => s.id);

      // 2. Fetch grade history
      const { data: gradeHistory, error: gradeError } = await supabase
        .from('grade_history')
        .select('student_id, topic_name, nys_standard, grade, raw_score_earned, raw_score_possible, created_at')
        .in('student_id', ids)
        .order('created_at', { ascending: true });

      if (gradeError) throw gradeError;

      // 3. Fetch misconceptions
      const { data: misconceptions, error: miscError } = await supabase
        .from('analysis_misconceptions')
        .select('student_id, topic_name, misconception_text, created_at')
        .in('student_id', ids)
        .eq('teacher_id', user.id);

      if (miscError) throw miscError;

      // 4. Fetch diagnostic results
      const { data: diagnostics, error: diagError } = await supabase
        .from('diagnostic_results')
        .select('student_id, topic_name, standard, recommended_level, level_a_score, level_a_total, level_b_score, level_b_total, level_c_score, level_c_total, level_d_score, level_d_total, level_e_score, level_e_total, level_f_score, level_f_total, created_at')
        .in('student_id', ids)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (diagError) throw diagError;

      // Process each student
      const studentProfiles: StudentPerformanceProfile[] = studentsData.map(student => {
        const studentGrades = (gradeHistory || []).filter(g => g.student_id === student.id);
        const studentMisconceptions = (misconceptions || []).filter(m => m.student_id === student.id);
        const studentDiagnostics = (diagnostics || []).filter(d => d.student_id === student.id);

        // Group grades by topic
        const topicMap: Record<string, { scores: number[]; standard: string | null; dates: string[] }> = {};
        for (const g of studentGrades) {
          const score = g.raw_score_possible && g.raw_score_possible > 0
            ? (Number(g.raw_score_earned) / Number(g.raw_score_possible)) * 100
            : g.grade;
          
          if (!topicMap[g.topic_name]) {
            topicMap[g.topic_name] = { scores: [], standard: g.nys_standard, dates: [] };
          }
          topicMap[g.topic_name].scores.push(score);
          topicMap[g.topic_name].dates.push(g.created_at);
        }

        // Calculate topic weaknesses
        const topicWeaknesses: StudentWeakness[] = [];
        const topicStrengths: StudentWeakness[] = [];

        for (const [topicName, data] of Object.entries(topicMap)) {
          const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
          const topicMisconceptions = studentMisconceptions
            .filter(m => m.topic_name === topicName)
            .map(m => m.misconception_text);

          const weakness: StudentWeakness = {
            topicName,
            standard: data.standard,
            averageScore: Math.round(avg),
            attemptCount: data.scores.length,
            misconceptions: [...new Set(topicMisconceptions)],
            lastAttemptDate: data.dates[data.dates.length - 1],
            severityScore: Math.round(100 - avg + topicMisconceptions.length * 5),
          };

          if (avg < 70) {
            topicWeaknesses.push(weakness);
          } else {
            topicStrengths.push(weakness);
          }
        }

        // Sort by severity
        topicWeaknesses.sort((a, b) => b.severityScore - a.severityScore);
        topicStrengths.sort((a, b) => b.averageScore - a.averageScore);

        // Calculate overall metrics
        const allScores = studentGrades.map(g => 
          g.raw_score_possible && g.raw_score_possible > 0
            ? (Number(g.raw_score_earned) / Number(g.raw_score_possible)) * 100
            : g.grade
        );
        const averageGrade = allScores.length > 0 
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : 70;
        const trend = calculateTrend(allScores);
        const overallLevel = scoreToLevel(averageGrade);

        // Group misconceptions by text
        const miscMap: Record<string, { text: string; topic: string; count: number }> = {};
        for (const m of studentMisconceptions) {
          const key = m.misconception_text.toLowerCase().trim();
          if (!miscMap[key]) {
            miscMap[key] = { text: m.misconception_text, topic: m.topic_name, count: 0 };
          }
          miscMap[key].count++;
        }
        const groupedMisconceptions = Object.values(miscMap).sort((a, b) => b.count - a.count);

        // Process diagnostic history
        const diagnosticHistory = studentDiagnostics.map(d => ({
          topicName: d.topic_name,
          recommendedLevel: d.recommended_level || 'C',
          date: d.created_at,
          levelScores: {
            A: { score: d.level_a_score || 0, total: d.level_a_total || 0 },
            B: { score: d.level_b_score || 0, total: d.level_b_total || 0 },
            C: { score: d.level_c_score || 0, total: d.level_c_total || 0 },
            D: { score: d.level_d_score || 0, total: d.level_d_total || 0 },
            E: { score: d.level_e_score || 0, total: d.level_e_total || 0 },
            F: { score: d.level_f_score || 0, total: d.level_f_total || 0 },
          },
        }));

        return {
          studentId: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          weakTopics: topicWeaknesses,
          strongTopics: topicStrengths,
          overallLevel,
          trend,
          totalAttempts: studentGrades.length,
          averageGrade,
          misconceptions: groupedMisconceptions,
          lastAssessmentDate: studentGrades.length > 0 
            ? studentGrades[studentGrades.length - 1].created_at 
            : null,
          diagnosticHistory,
        };
      });

      setProfiles(studentProfiles);
    } catch (err) {
      console.error('Error fetching student weaknesses:', err);
      setError('Failed to load student performance data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get profile by student ID
  const getProfile = (studentId: string) => profiles.find(p => p.studentId === studentId);

  // Get students who need the most help
  const studentsNeedingHelp = useMemo(() => {
    return [...profiles]
      .filter(p => p.weakTopics.length > 0 || p.averageGrade < 70)
      .sort((a, b) => a.averageGrade - b.averageGrade);
  }, [profiles]);

  return {
    profiles,
    isLoading,
    error,
    getProfile,
    studentsNeedingHelp,
    refetch: fetchProfiles,
  };
}
