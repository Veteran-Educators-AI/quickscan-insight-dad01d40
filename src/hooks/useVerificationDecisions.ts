import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface VerificationDecision {
  id?: string;
  originalText: string;
  interpretation: string;
  decision: 'approved' | 'rejected';
  correctInterpretation?: string;
  context?: string;
  attemptId?: string;
  studentId?: string;
}

interface SavedVerification {
  id: string;
  teacher_id: string;
  attempt_id: string | null;
  student_id: string | null;
  original_text: string;
  interpretation: string;
  decision: string;
  correct_interpretation: string | null;
  context: string | null;
  created_at: string;
}

export function useVerificationDecisions() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const saveVerificationDecisions = useCallback(async (
    decisions: VerificationDecision[],
    attemptId?: string,
    studentId?: string
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error('You must be logged in to save verification decisions');
      return false;
    }

    if (decisions.length === 0) return true;

    setIsSaving(true);

    try {
      const records = decisions.map(d => ({
        teacher_id: user.id,
        attempt_id: attemptId || null,
        student_id: studentId || null,
        original_text: d.originalText,
        interpretation: d.interpretation,
        decision: d.decision,
        correct_interpretation: d.correctInterpretation || null,
        context: d.context || null,
      }));

      const { error } = await supabase
        .from('interpretation_verifications')
        .insert(records);

      if (error) throw error;

      toast.success(`Saved ${decisions.length} verification decision(s)`);
      return true;
    } catch (error) {
      console.error('Error saving verification decisions:', error);
      toast.error('Failed to save verification decisions');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);

  const fetchPastVerifications = useCallback(async (
    limit: number = 100
  ): Promise<SavedVerification[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('interpretation_verifications')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as SavedVerification[];
    } catch (error) {
      console.error('Error fetching past verifications:', error);
      return [];
    }
  }, [user?.id]);

  // Get verification patterns - useful for AI training context
  const getVerificationPatterns = useCallback(async (): Promise<{
    approved: { interpretation: string; count: number }[];
    rejected: { interpretation: string; correctInterpretation: string | null; count: number }[];
  }> => {
    if (!user?.id) return { approved: [], rejected: [] };

    try {
      const { data, error } = await supabase
        .from('interpretation_verifications')
        .select('interpretation, decision, correct_interpretation')
        .eq('teacher_id', user.id);

      if (error) throw error;

      const verifications = (data || []) as Pick<SavedVerification, 'interpretation' | 'decision' | 'correct_interpretation'>[];
      
      // Group by pattern
      const approvedMap = new Map<string, number>();
      const rejectedMap = new Map<string, { count: number; correctInterpretation: string | null }>();

      for (const v of verifications) {
        if (v.decision === 'approved') {
          const count = approvedMap.get(v.interpretation) || 0;
          approvedMap.set(v.interpretation, count + 1);
        } else {
          const existing = rejectedMap.get(v.interpretation);
          rejectedMap.set(v.interpretation, {
            count: (existing?.count || 0) + 1,
            correctInterpretation: v.correct_interpretation || existing?.correctInterpretation || null,
          });
        }
      }

      return {
        approved: Array.from(approvedMap.entries())
          .map(([interpretation, count]) => ({ interpretation, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 50),
        rejected: Array.from(rejectedMap.entries())
          .map(([interpretation, data]) => ({ 
            interpretation, 
            correctInterpretation: data.correctInterpretation,
            count: data.count 
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 50),
      };
    } catch (error) {
      console.error('Error fetching verification patterns:', error);
      return { approved: [], rejected: [] };
    }
  }, [user?.id]);

  return {
    saveVerificationDecisions,
    fetchPastVerifications,
    getVerificationPatterns,
    isSaving,
  };
}
