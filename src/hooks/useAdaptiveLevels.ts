import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type AdvancementLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

interface StudentPerformance {
  studentId: string;
  topicName: string;
  averageScore: number;
  attemptCount: number;
  recentTrend: 'improving' | 'stable' | 'declining';
  lastAttemptDate: string;
  currentDiagnosticLevel: AdvancementLevel | null;
  recommendedLevel: AdvancementLevel;
  confidenceScore: number; // 0-100, how confident we are in the recommendation
}

interface AdaptiveLevelResult {
  studentId: string;
  firstName: string;
  lastName: string;
  topicPerformance: Record<string, StudentPerformance>;
  overallRecommendedLevel: AdvancementLevel;
  hasPerformanceData: boolean;
}

interface UseAdaptiveLevelsOptions {
  classId?: string;
  topicName?: string;
}

// Level progression values for calculations
const LEVEL_VALUES: Record<AdvancementLevel, number> = {
  'A': 6, 'B': 5, 'C': 4, 'D': 3, 'E': 2, 'F': 1
};

const VALUE_TO_LEVEL: Record<number, AdvancementLevel> = {
  6: 'A', 5: 'B', 4: 'C', 3: 'D', 2: 'E', 1: 'F'
};

// Thresholds for level recommendations based on score percentage
const LEVEL_THRESHOLDS = {
  A: 90, // 90%+ = Level A
  B: 80, // 80-89% = Level B
  C: 70, // 70-79% = Level C
  D: 60, // 60-69% = Level D
  E: 50, // 50-59% = Level E
  F: 0,  // Below 50% = Level F
};

function calculateRecommendedLevel(
  averageScore: number,
  recentTrend: 'improving' | 'stable' | 'declining',
  currentLevel: AdvancementLevel | null
): AdvancementLevel {
  // Base level from score
  let baseLevel: AdvancementLevel;
  if (averageScore >= LEVEL_THRESHOLDS.A) baseLevel = 'A';
  else if (averageScore >= LEVEL_THRESHOLDS.B) baseLevel = 'B';
  else if (averageScore >= LEVEL_THRESHOLDS.C) baseLevel = 'C';
  else if (averageScore >= LEVEL_THRESHOLDS.D) baseLevel = 'D';
  else if (averageScore >= LEVEL_THRESHOLDS.E) baseLevel = 'E';
  else baseLevel = 'F';

  // Adjust based on trend
  let adjustedValue = LEVEL_VALUES[baseLevel];
  
  if (recentTrend === 'improving') {
    // If improving, consider bumping up one level for challenge
    adjustedValue = Math.min(6, adjustedValue + 1);
  } else if (recentTrend === 'declining') {
    // If declining, consider dropping down one level for support
    adjustedValue = Math.max(1, adjustedValue - 1);
  }

  // Don't jump more than 2 levels from current
  if (currentLevel) {
    const currentValue = LEVEL_VALUES[currentLevel];
    const diff = adjustedValue - currentValue;
    if (Math.abs(diff) > 2) {
      adjustedValue = currentValue + (diff > 0 ? 2 : -2);
    }
  }

  return VALUE_TO_LEVEL[Math.max(1, Math.min(6, adjustedValue))];
}

function calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
  if (scores.length < 2) return 'stable';
  
  // Compare first half average to second half average
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

export function useAdaptiveLevels({ classId, topicName }: UseAdaptiveLevelsOptions = {}) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<AdaptiveLevelResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !classId) return;
    
    fetchAdaptiveLevels();
  }, [user, classId, topicName]);

  const fetchAdaptiveLevels = async () => {
    if (!user || !classId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch students in class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', classId)
        .order('last_name');

      if (studentsError) throw studentsError;

      if (!studentsData?.length) {
        setStudents([]);
        return;
      }

      const studentIds = studentsData.map(s => s.id);

      // 2. Fetch grade history for performance data
      const { data: gradeHistory, error: gradeError } = await supabase
        .from('grade_history')
        .select('student_id, topic_name, grade, raw_score_earned, raw_score_possible, created_at')
        .in('student_id', studentIds)
        .order('created_at', { ascending: true });

      if (gradeError) throw gradeError;

      // 3. Fetch diagnostic results for current levels
      let diagnosticQuery = supabase
        .from('diagnostic_results')
        .select('student_id, topic_name, recommended_level, created_at')
        .in('student_id', studentIds)
        .eq('teacher_id', user.id);

      if (topicName) {
        diagnosticQuery = diagnosticQuery.eq('topic_name', topicName);
      }

      const { data: diagnosticResults, error: diagnosticError } = await diagnosticQuery;

      if (diagnosticError) throw diagnosticError;

      // 4. Fetch scores from attempts for additional data
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('attempts')
        .select(`
          id,
          student_id,
          created_at,
          questions!inner(id, prompt_text),
          scores(points_earned)
        `)
        .in('student_id', studentIds)
        .eq('status', 'analyzed')
        .order('created_at', { ascending: true });

      // Process data for each student
      const adaptiveResults: AdaptiveLevelResult[] = studentsData.map(student => {
        const studentGrades = (gradeHistory || []).filter(g => g.student_id === student.id);
        const studentDiagnostics = (diagnosticResults || []).filter(d => d.student_id === student.id);
        const studentAttempts = (attemptsData || []).filter(a => a.student_id === student.id);

        // Group by topic
        const topicPerformance: Record<string, StudentPerformance> = {};
        
        // Get unique topics from grades
        const topicsFromGrades = [...new Set(studentGrades.map(g => g.topic_name))];
        
        for (const topic of topicsFromGrades) {
          const topicGrades = studentGrades
            .filter(g => g.topic_name === topic)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          if (topicGrades.length === 0) continue;

          // Calculate average score as percentage
          const scores = topicGrades.map(g => {
            if (g.raw_score_possible && g.raw_score_possible > 0) {
              return (Number(g.raw_score_earned) / Number(g.raw_score_possible)) * 100;
            }
            return g.grade;
          });

          const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          const trend = calculateTrend(scores);

          // Get current diagnostic level for this topic
          const topicDiagnostics = studentDiagnostics
            .filter(d => d.topic_name === topic)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          const currentDiagnosticLevel = topicDiagnostics[0]?.recommended_level as AdvancementLevel | null;

          const recommendedLevel = calculateRecommendedLevel(averageScore, trend, currentDiagnosticLevel);

          // Calculate confidence based on number of attempts
          const confidenceScore = Math.min(100, topicGrades.length * 20); // 5 attempts = 100% confidence

          topicPerformance[topic] = {
            studentId: student.id,
            topicName: topic,
            averageScore,
            attemptCount: topicGrades.length,
            recentTrend: trend,
            lastAttemptDate: topicGrades[topicGrades.length - 1].created_at,
            currentDiagnosticLevel,
            recommendedLevel,
            confidenceScore,
          };
        }

        // Calculate overall recommended level
        const performanceValues = Object.values(topicPerformance);
        let overallRecommendedLevel: AdvancementLevel = 'C'; // Default

        if (performanceValues.length > 0) {
          // Weight by confidence score
          const weightedSum = performanceValues.reduce((sum, p) => {
            return sum + (LEVEL_VALUES[p.recommendedLevel] * p.confidenceScore);
          }, 0);
          const totalWeight = performanceValues.reduce((sum, p) => sum + p.confidenceScore, 0);
          
          if (totalWeight > 0) {
            const weightedAvg = Math.round(weightedSum / totalWeight);
            overallRecommendedLevel = VALUE_TO_LEVEL[Math.max(1, Math.min(6, weightedAvg))];
          }
        } else {
          // Fall back to most recent diagnostic
          const latestDiagnostic = studentDiagnostics
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          
          if (latestDiagnostic?.recommended_level) {
            overallRecommendedLevel = latestDiagnostic.recommended_level as AdvancementLevel;
          }
        }

        return {
          studentId: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          topicPerformance,
          overallRecommendedLevel,
          hasPerformanceData: performanceValues.length > 0,
        };
      });

      setStudents(adaptiveResults);
    } catch (err) {
      console.error('Error fetching adaptive levels:', err);
      setError('Failed to load student performance data');
    } finally {
      setIsLoading(false);
    }
  };

  // Get recommended level for a specific student and optional topic
  const getRecommendedLevel = (studentId: string, topic?: string): AdvancementLevel => {
    const student = students.find(s => s.studentId === studentId);
    if (!student) return 'C';

    if (topic && student.topicPerformance[topic]) {
      return student.topicPerformance[topic].recommendedLevel;
    }

    return student.overallRecommendedLevel;
  };

  // Get a map of student IDs to their recommended levels
  const studentLevelMap = useMemo(() => {
    const map: Record<string, AdvancementLevel> = {};
    for (const student of students) {
      map[student.studentId] = topicName && student.topicPerformance[topicName]
        ? student.topicPerformance[topicName].recommendedLevel
        : student.overallRecommendedLevel;
    }
    return map;
  }, [students, topicName]);

  return {
    students,
    isLoading,
    error,
    getRecommendedLevel,
    studentLevelMap,
    refetch: fetchAdaptiveLevels,
  };
}

export type { AdvancementLevel, StudentPerformance, AdaptiveLevelResult };
