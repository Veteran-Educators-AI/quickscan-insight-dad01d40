import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface AutoPushSettings {
  autoPushEnabled: boolean;
  autoPushThreshold: number;
  autoPushRegentsThreshold: number;
  autoPushWorksheetCount: number;
}

const DEFAULT_SETTINGS: AutoPushSettings = {
  autoPushEnabled: false,
  autoPushThreshold: 70,
  autoPushRegentsThreshold: 3,
  autoPushWorksheetCount: 3,
};

export function useAutoPushSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AutoPushSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('auto_push_enabled, auto_push_threshold, auto_push_regents_threshold, auto_push_worksheet_count')
        .eq('teacher_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching auto-push settings:', error);
        return;
      }

      if (data) {
        setSettings({
          autoPushEnabled: data.auto_push_enabled ?? false,
          autoPushThreshold: data.auto_push_threshold ?? 70,
          autoPushRegentsThreshold: data.auto_push_regents_threshold ?? 3,
          autoPushWorksheetCount: data.auto_push_worksheet_count ?? 3,
        });
      }
    } catch (err) {
      console.error('Failed to fetch auto-push settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<AutoPushSettings>) => {
    if (!user?.id) return false;

    const updatedSettings = { ...settings, ...newSettings };

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          teacher_id: user.id,
          auto_push_enabled: updatedSettings.autoPushEnabled,
          auto_push_threshold: updatedSettings.autoPushThreshold,
          auto_push_regents_threshold: updatedSettings.autoPushRegentsThreshold,
          auto_push_worksheet_count: updatedSettings.autoPushWorksheetCount,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'teacher_id',
        });

      if (error) {
        console.error('Error updating auto-push settings:', error);
        return false;
      }

      setSettings(updatedSettings);
      return true;
    } catch (err) {
      console.error('Failed to update auto-push settings:', err);
      return false;
    }
  };

  // Check if auto-push should trigger based on grade/regents score
  const shouldAutoPush = useCallback((grade?: number, regentsScore?: number): boolean => {
    if (!settings.autoPushEnabled) return false;
    
    // Check grade threshold
    if (grade !== undefined && grade < settings.autoPushThreshold) {
      return true;
    }
    
    // Check regents threshold
    if (regentsScore !== undefined && regentsScore < settings.autoPushRegentsThreshold) {
      return true;
    }
    
    return false;
  }, [settings]);

  return {
    ...settings,
    isLoading,
    updateSettings,
    shouldAutoPush,
    refetch: fetchSettings,
  };
}
