import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type MisconceptionDecision = 'confirmed' | 'dismissed';

interface MisconceptionFeedback {
  misconceptionText: string;
  decision: MisconceptionDecision;
  errorIndex: number;
  location?: { vertical: string; horizontal: string };
}

interface SaveFeedbackParams {
  studentId?: string;
  attemptId?: string;
  topicName: string;
  feedback: MisconceptionFeedback[];
  aiGrade?: number;
  noErrorsConfirmed?: boolean;
}

export function useMisconceptionFeedback() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [decisions, setDecisions] = useState<Record<number, MisconceptionDecision>>({});

  const confirmError = useCallback((errorId: number) => {
    setDecisions(prev => ({ ...prev, [errorId]: 'confirmed' }));
  }, []);

  const dismissError = useCallback((errorId: number) => {
    setDecisions(prev => ({ ...prev, [errorId]: 'dismissed' }));
  }, []);

  const clearDecision = useCallback((errorId: number) => {
    setDecisions(prev => {
      const next = { ...prev };
      delete next[errorId];
      return next;
    });
  }, []);

  const resetDecisions = useCallback(() => {
    setDecisions({});
  }, []);

  const saveFeedback = useCallback(async (params: SaveFeedbackParams) => {
    if (!user) {
      toast.error('Not authenticated');
      return { success: false };
    }

    // Handle "no errors confirmed" case - teacher confirms AI correctly found no errors
    if (params.noErrorsConfirmed && params.feedback.length === 0) {
      try {
        const { error } = await supabase.from('ai_analysis_feedback').insert({
          teacher_id: user.id,
          student_id: params.studentId || null,
          attempt_id: params.attemptId || null,
          topic_name: params.topicName,
          ai_grade: params.aiGrade || null,
          ai_misconceptions: [],
          critique_type: 'good_analysis',
          critique_text: 'Teacher confirmed AI correctly identified no errors in the student work.',
          is_processed: false,
        });

        if (error) throw error;

        toast.success('Feedback saved! AI confirmed as accurate.', {
          description: 'No errors analysis verified',
        });

        return { success: true };
      } catch (error) {
        console.error('Error saving no-error confirmation:', error);
        toast.error('Failed to save feedback');
        return { success: false };
      }
    }

    if (params.feedback.length === 0) {
      return { success: true };
    }

    setIsSaving(true);
    try {
      // Separate confirmed and dismissed misconceptions
      const confirmed = params.feedback.filter(f => f.decision === 'confirmed');
      const dismissed = params.feedback.filter(f => f.decision === 'dismissed');

      // If there are dismissed misconceptions, save as "wrong_misconception" feedback
      if (dismissed.length > 0) {
        const dismissedText = dismissed
          .map((d, i) => `Error #${d.errorIndex}: "${d.misconceptionText.slice(0, 100)}..."`)
          .join('\n');

        const { error } = await supabase.from('ai_analysis_feedback').insert({
          teacher_id: user.id,
          student_id: params.studentId || null,
          attempt_id: params.attemptId || null,
          topic_name: params.topicName,
          ai_grade: params.aiGrade || null,
          ai_misconceptions: params.feedback.map(f => f.misconceptionText),
          critique_type: 'wrong_misconception',
          critique_text: `Teacher dismissed ${dismissed.length} misconception(s) as incorrect.`,
          what_ai_got_wrong: dismissedText,
          is_processed: false,
        });

        if (error) throw error;
      }

      // If there are confirmed misconceptions, optionally log as positive feedback
      if (confirmed.length > 0 && dismissed.length === 0) {
        // All confirmed = good analysis
        const { error } = await supabase.from('ai_analysis_feedback').insert({
          teacher_id: user.id,
          student_id: params.studentId || null,
          attempt_id: params.attemptId || null,
          topic_name: params.topicName,
          ai_grade: params.aiGrade || null,
          ai_misconceptions: params.feedback.map(f => f.misconceptionText),
          critique_type: 'good_analysis',
          critique_text: `Teacher confirmed all ${confirmed.length} misconception(s) as correct.`,
          is_processed: false,
        });

        if (error) throw error;
      }

      // If mixed feedback, save with details
      if (confirmed.length > 0 && dismissed.length > 0) {
        const { error } = await supabase.from('ai_analysis_feedback').insert({
          teacher_id: user.id,
          student_id: params.studentId || null,
          attempt_id: params.attemptId || null,
          topic_name: params.topicName,
          ai_grade: params.aiGrade || null,
          ai_misconceptions: params.feedback.map(f => f.misconceptionText),
          critique_type: 'wrong_misconception',
          critique_text: `Teacher confirmed ${confirmed.length} and dismissed ${dismissed.length} misconception(s).`,
          what_ai_got_wrong: dismissed
            .map((d) => `Error #${d.errorIndex}: "${d.misconceptionText.slice(0, 100)}..."`)
            .join('\n'),
          is_processed: false,
        });

        if (error) throw error;
      }

      toast.success('Feedback saved! AI will learn from your input.', {
        description: `${confirmed.length} confirmed, ${dismissed.length} dismissed`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving misconception feedback:', error);
      toast.error('Failed to save feedback');
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const hasDecisions = Object.keys(decisions).length > 0;

  return {
    decisions,
    confirmError,
    dismissError,
    clearDecision,
    resetDecisions,
    saveFeedback,
    isSaving,
    hasDecisions,
  };
}
