import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface QRScanSettings {
  autoQRScanEnabled: boolean;
  autoHandwritingGroupingEnabled: boolean;
  gradeCurvePercent: number;
}

// Simple in-memory cache so multiple components using this hook
// don't all hit Supabase separately on initial load.
let cachedSettings: QRScanSettings | null = null;
let cachedUserId: string | null = null;
let inFlightPromise: Promise<QRScanSettings | null> | null = null;

export function useQRScanSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<QRScanSettings>({
    autoQRScanEnabled: true,
    autoHandwritingGroupingEnabled: false,
    gradeCurvePercent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Use cached settings if we already fetched them for this user
      if (cachedSettings && cachedUserId === user.id) {
        setSettings(cachedSettings);
        setIsLoading(false);
        return;
      }

      // Share in‑flight request across all hook instances
      if (!inFlightPromise || cachedUserId !== user.id) {
        cachedUserId = user.id;
        inFlightPromise = (async () => {
          const { data, error } = await supabase
            .from('settings')
            .select('auto_qr_scan_enabled, auto_handwriting_grouping_enabled, grade_curve_percent')
            .eq('teacher_id', user.id)
            .maybeSingle();

          if (error) throw error;

          const next: QRScanSettings = {
            autoQRScanEnabled: data?.auto_qr_scan_enabled ?? true,
            autoHandwritingGroupingEnabled: data?.auto_handwriting_grouping_enabled ?? false,
            gradeCurvePercent: data?.grade_curve_percent ?? 0,
          };
          cachedSettings = next;
          return next;
        })();
      }

      const next = await inFlightPromise;
      if (next) {
        setSettings(next);
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

      setSettings(prev => {
        const merged = { ...prev, ...newSettings };
        // Keep cache in sync for this user
        if (user?.id) {
          cachedUserId = user.id;
          cachedSettings = merged;
        }
        return merged;
      });
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
