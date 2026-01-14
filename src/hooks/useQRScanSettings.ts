import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface QRScanSettings {
  autoQRScanEnabled: boolean;
  autoHandwritingGroupingEnabled: boolean;
  gradeCurvePercent: number;
}

export function useQRScanSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<QRScanSettings>({
    autoQRScanEnabled: true,
    autoHandwritingGroupingEnabled: false,
    gradeCurvePercent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('auto_qr_scan_enabled, auto_handwriting_grouping_enabled, grade_curve_percent')
        .eq('teacher_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          autoQRScanEnabled: data.auto_qr_scan_enabled ?? true,
          autoHandwritingGroupingEnabled: data.auto_handwriting_grouping_enabled ?? false,
          gradeCurvePercent: data.grade_curve_percent ?? 0,
        });
      }
    } catch (err) {
      console.error('Error fetching QR scan settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<QRScanSettings>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          teacher_id: user.id,
          auto_qr_scan_enabled: newSettings.autoQRScanEnabled ?? settings.autoQRScanEnabled,
          auto_handwriting_grouping_enabled: newSettings.autoHandwritingGroupingEnabled ?? settings.autoHandwritingGroupingEnabled,
          grade_curve_percent: newSettings.gradeCurvePercent ?? settings.gradeCurvePercent,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'teacher_id',
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...newSettings }));
      return true;
    } catch (err) {
      console.error('Error updating QR scan settings:', err);
      return false;
    }
  }, [user, settings]);

  return {
    settings,
    isLoading,
    updateSettings,
    refetch: fetchSettings,
  };
}
