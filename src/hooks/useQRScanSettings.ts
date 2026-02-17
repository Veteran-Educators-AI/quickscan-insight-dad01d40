import { useCallback } from 'react';
import { useSettings } from './useSettings';

interface QRScanSettings {
  autoQRScanEnabled: boolean;
  autoHandwritingGroupingEnabled: boolean;
  gradeCurvePercent: number;
}

/**
 * QR Scan settings hook - now uses unified settings to avoid duplicate API calls
 * Previously made a separate API call to the settings table
 * Now shares the unified settings query with other hooks
 */
export function useQRScanSettings() {
  const { settings: unifiedSettings, isLoading, updateSettings, isUpdating } = useSettings();

  const settings: QRScanSettings = {
    autoQRScanEnabled: unifiedSettings.autoQRScanEnabled,
    autoHandwritingGroupingEnabled: unifiedSettings.autoHandwritingGroupingEnabled,
    gradeCurvePercent: unifiedSettings.gradeCurvePercent,
  };

  const updateQRSettings = useCallback(async (newSettings: Partial<QRScanSettings>) => {
    try {
      await updateSettings(newSettings);
      return true;
    } catch (err) {
      console.error('Error updating QR scan settings:', err);
      return false;
    }
  }, [updateSettings]);

  return {
    settings,
    isLoading,
    updateSettings: updateQRSettings,
    refetch: () => {}, // No longer needed - React Query handles refetching
  };
}
