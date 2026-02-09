import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParticipantResult {
  student_id: string;
  student_name: string;
  total_questions_answered: number;
  correct_answers: number;
  accuracy: number;
  credit_awarded: number;
  participated: boolean;
  answers: {
    selected_answer: string;
    is_correct: boolean | null;
    time_taken_seconds: number | null;
  }[];
}

interface PushToSisterAppParams {
  class_id: string;
  title: string;
  description?: string;
  due_at?: string;
  standard_code?: string;
  xp_reward?: number;
  coin_reward?: number;
  printable_url?: string;
  student_id?: string;
  student_name?: string;
  student_email?: string;
  first_name?: string;
  last_name?: string;
  class_name?: string;
  grade?: number;
  topic_name?: string;
  questions?: any[];
  type?: 'ping' | 'grade' | 'behavior' | 'student_created' | 'student_updated' | 'roster_sync' | 'live_session_completed' | 'assignment_push';
  source?: 'scan_genius' | 'scan_analysis' | 'assignment_push';  // Source identifier for sister app
  remediation_recommendations?: string[];  // Recommended topics for remediation
  difficulty_level?: string;  // A, B, C, D, E, or F difficulty
  // Behavior deduction fields
  xp_deduction?: number;
  coin_deduction?: number;
  reason?: string;
  notes?: string;
  // Live session fields
  session_code?: string;
  participation_mode?: string;
  credit_for_participation?: number;
  deduction_for_non_participation?: number;
  total_participants?: number;
  active_participants?: number;
  participant_results?: ParticipantResult[];
}

export function usePushToSisterApp() {
  const pushToSisterApp = useCallback(async (params: PushToSisterAppParams) => {
    try {
      console.log('Pushing to sister app:', params);
      
      const response = await supabase.functions.invoke('push-to-sister-app', {
        body: params,
      });

      if (response.error) {
        console.error('Push to sister app error:', response.error);
        return { success: false, error: response.error.message };
      }

      if (response.data?.success === false) {
        console.error('Push to sister app failed:', response.data);
        return { success: false, error: response.data.error || 'Sister app rejected the request' };
      }

      console.log('Push to sister app result:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to push to sister app:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, []);

  return { pushToSisterApp };
}
