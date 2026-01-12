import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  grade?: number;
  topic_name?: string;
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
