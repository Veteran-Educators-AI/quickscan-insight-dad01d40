import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface BlankPageSettings {
  autoScoreBlankPages: boolean;
  blankPageScore: number;
  blankPageComment: string;
}

const DEFAULTS: BlankPageSettings = {
  autoScoreBlankPages: true,
  blankPageScore: 0,
  blankPageComment: 'No work shown on this page; score assigned per no-response policy.',
};

export function useBlankPageSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BlankPageSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('blank_page_auto_score, blank_page_score, blank_page_comment')
        .eq('teacher_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          autoScoreBlankPages: data.blank_page_auto_score ?? DEFAULTS.autoScoreBlankPages,
          blankPageScore: data.blank_page_score ?? DEFAULTS.blankPageScore,
          blankPageComment: data.blank_page_comment ?? DEFAULTS.blankPageComment,
        });
      }
    } catch (err) {
      console.error('Error fetching blank page settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<BlankPageSettings>) => {
    if (!user) return false;
    try {
      const merged = { ...settings, ...newSettings };
      const { error } = await supabase
        .from('settings')
        .upsert({
          teacher_id: user.id,
          blank_page_auto_score: merged.autoScoreBlankPages,
          blank_page_score: merged.blankPageScore,
          blank_page_comment: merged.blankPageComment,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'teacher_id' });

      if (error) throw error;
      setSettings(merged);
      return true;
    } catch (err) {
      console.error('Error updating blank page settings:', err);
      return false;
    }
  }, [user, settings]);

  return { settings, isLoading, updateSettings, refetch: fetchSettings };
}
