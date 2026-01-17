import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface PerformanceDropSettings {
  enabled: boolean;
  threshold: number;
  parentAlerts: boolean;
  includeRemediation: boolean;
}

interface SendAlertParams {
  studentId: string;
  studentName: string;
  previousGrade: number;
  currentGrade: number;
  topicName: string;
  nysStandard?: string;
  parentEmail?: string;
  weakTopics?: string[];
}

export function usePerformanceDropAlert() {
  const { user } = useAuth();

  const getSettings = useCallback((): PerformanceDropSettings => {
    if (!user) return { enabled: false, threshold: 15, parentAlerts: true, includeRemediation: true };
    
    const stored = localStorage.getItem(`performance_drop_settings_${user.id}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through to defaults
      }
    }
    return { enabled: false, threshold: 15, parentAlerts: true, includeRemediation: true };
  }, [user]);

  const checkAndSendAlert = useCallback(async (params: SendAlertParams): Promise<{ sent: boolean; reason?: string }> => {
    if (!user) return { sent: false, reason: 'No authenticated user' };

    const settings = getSettings();
    if (!settings.enabled) {
      return { sent: false, reason: 'Performance drop alerts disabled' };
    }

    const dropAmount = params.previousGrade - params.currentGrade;
    if (dropAmount < settings.threshold) {
      return { sent: false, reason: `Drop of ${dropAmount}% is below threshold of ${settings.threshold}%` };
    }

    // Get teacher info
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.email) {
      return { sent: false, reason: 'Teacher email not found' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-performance-drop-alert', {
        body: {
          studentId: params.studentId,
          studentName: params.studentName,
          previousGrade: params.previousGrade,
          currentGrade: params.currentGrade,
          dropAmount,
          topicName: params.topicName,
          nysStandard: params.nysStandard,
          teacherEmail: profile.email,
          teacherName: profile.full_name || 'Teacher',
          threshold: settings.threshold,
          parentEmail: params.parentEmail,
          sendToParent: settings.parentAlerts && !!params.parentEmail,
          includeRemediation: settings.includeRemediation,
          remediationTopics: params.weakTopics || [],
        },
      });

      if (error) {
        console.error('Error sending performance drop alert:', error);
        return { sent: false, reason: error.message };
      }

      return { 
        sent: data?.success || false,
        reason: data?.success ? 'Alert sent successfully' : 'Alert failed to send'
      };
    } catch (error) {
      console.error('Error invoking performance drop alert function:', error);
      return { sent: false, reason: 'Failed to send alert' };
    }
  }, [user, getSettings]);

  const getPreviousGrade = useCallback(async (studentId: string, topicName: string): Promise<number | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('grade_history')
      .select('grade')
      .eq('student_id', studentId)
      .eq('topic_name', topicName)
      .order('created_at', { ascending: false })
      .limit(2);

    if (error || !data || data.length < 2) {
      return null; // Need at least 2 entries to compare
    }

    // Return the second-most-recent grade (the previous one)
    return data[1].grade;
  }, [user]);

  return {
    getSettings,
    checkAndSendAlert,
    getPreviousGrade,
  };
}
