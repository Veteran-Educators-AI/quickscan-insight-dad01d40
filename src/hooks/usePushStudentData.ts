import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface PushDataParams {
  eventType: 'scan_analysis' | 'diagnostic_results';
  studentId: string;
  studentName: string;
  classId?: string;
  className?: string;
  data: Record<string, unknown>;
}

export function usePushStudentData() {
  const { user } = useAuth();

  const pushData = useCallback(async (params: PushDataParams) => {
    if (!user) {
      console.log('No user, skipping webhook push');
      return;
    }

    try {
      const response = await supabase.functions.invoke('push-student-data', {
        body: {
          ...params,
          teacherId: user.id,
        },
      });

      if (response.error) {
        console.error('Webhook push error:', response.error);
      } else {
        console.log('Webhook push result:', response.data);
      }
    } catch (error) {
      // Silent failure - don't interrupt the main flow
      console.error('Failed to push data to webhook:', error);
    }
  }, [user]);

  return { pushData };
}
