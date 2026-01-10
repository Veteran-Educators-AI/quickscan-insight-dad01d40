import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { usePushStudentData } from './usePushStudentData';

interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface AnalysisResult {
  ocrText: string;
  problemIdentified: string;
  approachAnalysis: string;
  rubricScores: RubricScore[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  grade?: number;
  gradeJustification?: string;
  feedback: string;
}

interface SaveAnalysisParams {
  studentId: string;
  studentName?: string;
  className?: string;
  questionId: string;
  imageUrl: string;
  result: AnalysisResult;
  pendingScanId?: string;
  topicName?: string;
  topicId?: string;
  classId?: string;
}

export function useSaveAnalysisResults() {
  const { user } = useAuth();
  const { pushData } = usePushStudentData();
  const [isSaving, setIsSaving] = useState(false);

  const saveResults = async (params: SaveAnalysisParams): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to save results');
      return null;
    }

    setIsSaving(true);

    try {
      // 1. Create attempt record
      const { data: attempt, error: attemptError } = await supabase
        .from('attempts')
        .insert({
          student_id: params.studentId,
          question_id: params.questionId,
          status: 'analyzed',
        })
        .select('id')
        .single();

      if (attemptError) throw attemptError;

      // 2. Create attempt_image record
      const { error: imageError } = await supabase
        .from('attempt_images')
        .insert({
          attempt_id: attempt.id,
          image_url: params.imageUrl,
          ocr_text: params.result.ocrText,
        });

      if (imageError) throw imageError;

      // 3. Create score records for each rubric item
      const scoreInserts = params.result.rubricScores.map((rubricScore, index) => ({
        attempt_id: attempt.id,
        points_earned: rubricScore.score,
        notes: rubricScore.feedback,
        is_auto_scored: true,
        teacher_override: false,
      }));

      // Insert a summary score with total
      const { error: scoreError } = await supabase
        .from('scores')
        .insert({
          attempt_id: attempt.id,
          points_earned: params.result.totalScore.earned,
          notes: params.result.feedback,
          is_auto_scored: true,
          teacher_override: false,
        });

      if (scoreError) throw scoreError;

      // 4. Save grade history if we have grade info
      // Calculate grade: minimum 55, but only if no standards met
      // If they earned any points, minimum should be 60
      const hasAnyPoints = params.result.totalScore.earned > 0;
      const baseGrade = hasAnyPoints ? 60 : 55;
      const calculatedGrade = hasAnyPoints 
        ? Math.round(baseGrade + (params.result.totalScore.percentage / 100) * (100 - baseGrade))
        : 55;
      const grade = params.result.grade ?? calculatedGrade;
      
      // Ensure grade is never below 55
      const finalGrade = Math.max(55, Math.min(100, grade));
      
      if (params.topicName) {
        const { error: gradeHistoryError } = await supabase
          .from('grade_history')
          .insert({
            student_id: params.studentId,
            topic_id: params.topicId || null,
            topic_name: params.topicName,
            grade: finalGrade,
            grade_justification: params.result.gradeJustification || null,
            raw_score_earned: params.result.totalScore.earned,
            raw_score_possible: params.result.totalScore.possible,
            attempt_id: attempt.id,
            teacher_id: user.id,
          });

        if (gradeHistoryError) {
          console.error('Error saving grade history:', gradeHistoryError);
          // Don't throw - grade history is secondary
        }
      }

      // 5. Delete the pending scan if provided
      if (params.pendingScanId) {
        await supabase
          .from('pending_scans')
          .delete()
          .eq('id', params.pendingScanId);
      }

      // 6. Push data to webhook (sister app integration)
      pushData({
        eventType: 'scan_analysis',
        studentId: params.studentId,
        studentName: params.studentName || 'Unknown Student',
        classId: params.classId,
        className: params.className,
        data: {
          attemptId: attempt.id,
          topicName: params.topicName,
          topicId: params.topicId,
          totalScore: params.result.totalScore,
          grade: finalGrade,
          gradeJustification: params.result.gradeJustification,
          misconceptions: params.result.misconceptions,
          rubricScores: params.result.rubricScores,
          feedback: params.result.feedback,
        },
      });

      return attempt.id;
    } catch (err) {
      console.error('Error saving analysis results:', err);
      toast.error('Failed to save analysis results');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const saveMultiQuestionResults = async (
    studentId: string,
    imageUrl: string,
    results: Record<string, AnalysisResult>,
    pendingScanId?: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to save results');
      return false;
    }

    setIsSaving(true);

    try {
      const questionIds = Object.keys(results);
      
      for (const questionId of questionIds) {
        const result = results[questionId];
        
        // Create attempt record
        const { data: attempt, error: attemptError } = await supabase
          .from('attempts')
          .insert({
            student_id: studentId,
            question_id: questionId,
            status: 'analyzed',
          })
          .select('id')
          .single();

        if (attemptError) throw attemptError;

        // Create attempt_image record
        await supabase
          .from('attempt_images')
          .insert({
            attempt_id: attempt.id,
            image_url: imageUrl,
            ocr_text: result.ocrText,
          });

        // Create score record
        await supabase
          .from('scores')
          .insert({
            attempt_id: attempt.id,
            points_earned: result.totalScore.earned,
            notes: result.feedback,
            is_auto_scored: true,
            teacher_override: false,
          });
      }

      // Delete the pending scan if provided
      if (pendingScanId) {
        await supabase
          .from('pending_scans')
          .delete()
          .eq('id', pendingScanId);
      }

      toast.success(`Saved ${questionIds.length} question results to database`);
      return true;
    } catch (err) {
      console.error('Error saving multi-question results:', err);
      toast.error('Failed to save analysis results');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveResults,
    saveMultiQuestionResults,
    isSaving,
  };
}
