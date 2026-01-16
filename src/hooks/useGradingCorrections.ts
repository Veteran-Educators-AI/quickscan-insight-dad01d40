import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface GradingCorrectionData {
  studentId?: string;
  attemptId?: string;
  topicName: string;
  aiGrade: number;
  aiRegentsScore?: number;
  aiJustification?: string;
  correctedGrade: number;
  correctedRegentsScore?: number;
  correctionReason?: string;
  gradingFocus?: string[];
}

export function useGradingCorrections() {
  const { user } = useAuth();

  const saveCorrection = async (data: GradingCorrectionData) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    // Determine strictness indicator
    const gradeDiff = data.correctedGrade - data.aiGrade;
    let strictnessIndicator: 'more_lenient' | 'as_expected' | 'more_strict' | null = null;
    
    if (gradeDiff > 5) {
      strictnessIndicator = 'more_lenient';
    } else if (gradeDiff < -5) {
      strictnessIndicator = 'more_strict';
    } else if (Math.abs(gradeDiff) <= 5) {
      strictnessIndicator = 'as_expected';
    }

    try {
      const { error } = await supabase
        .from('grading_corrections')
        .insert({
          teacher_id: user.id,
          student_id: data.studentId || null,
          attempt_id: data.attemptId || null,
          topic_name: data.topicName,
          ai_grade: data.aiGrade,
          ai_regents_score: data.aiRegentsScore || null,
          ai_justification: data.aiJustification || null,
          corrected_grade: data.correctedGrade,
          corrected_regents_score: data.correctedRegentsScore || null,
          correction_reason: data.correctionReason || null,
          grading_focus: data.gradingFocus || null,
          strictness_indicator: strictnessIndicator,
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error saving grading correction:', error);
      return { success: false, error: 'Failed to save correction' };
    }
  };

  const getTrainingStats = async () => {
    if (!user) return null;

    try {
      const { data, error, count } = await supabase
        .from('grading_corrections')
        .select('ai_grade, corrected_grade, strictness_indicator', { count: 'exact' })
        .eq('teacher_id', user.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          totalCorrections: 0,
          avgAdjustment: 0,
          dominantStyle: null,
          isFullyTrained: false,
        };
      }

      const avgAdjustment = data.reduce((sum, c) => sum + (c.corrected_grade - c.ai_grade), 0) / data.length;
      
      const strictnessCounts = data.reduce((acc: Record<string, number>, c) => {
        if (c.strictness_indicator) {
          acc[c.strictness_indicator] = (acc[c.strictness_indicator] || 0) + 1;
        }
        return acc;
      }, {});

      const dominantStyle = Object.entries(strictnessCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return {
        totalCorrections: count || 0,
        avgAdjustment,
        dominantStyle,
        isFullyTrained: (count || 0) >= 50,
      };
    } catch (error) {
      console.error('Error fetching training stats:', error);
      return null;
    }
  };

  return {
    saveCorrection,
    getTrainingStats,
  };
}
