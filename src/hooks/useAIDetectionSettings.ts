import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface AIDetectionSettings {
  ai_detection_enabled: boolean;
  ai_detection_threshold: number;
  ai_auto_reject_enabled: boolean;
}

const DEFAULT_SETTINGS: AIDetectionSettings = {
  ai_detection_enabled: true,
  ai_detection_threshold: 80,
  ai_auto_reject_enabled: true,
};

export function useAIDetectionSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AIDetectionSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('ai_detection_enabled, ai_detection_threshold, ai_auto_reject_enabled')
        .eq('teacher_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ai_detection_enabled: data.ai_detection_enabled ?? true,
          ai_detection_threshold: data.ai_detection_threshold ?? 80,
          ai_auto_reject_enabled: data.ai_auto_reject_enabled ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching AI detection settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { settings, isLoading };
}
