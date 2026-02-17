import { useCallback } from 'react';
import { useSettings } from './useSettings';

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

/**
 * Auto Push settings hook - now uses unified settings to avoid duplicate API calls
 * Previously made a separate API call to the settings table
 * Now shares the unified settings query with other hooks
 */
export function useAutoPushSettings() {
  const { settings: unifiedSettings, isLoading, updateSettings } = useSettings();

  const settings: AutoPushSettings = {
    autoPushEnabled: unifiedSettings.autoPushEnabled,
    autoPushThreshold: unifiedSettings.autoPushThreshold,
    autoPushRegentsThreshold: unifiedSettings.autoPushRegentsThreshold,
    autoPushWorksheetCount: unifiedSettings.autoPushWorksheetCount,
  };

  const updateAutoPushSettings = useCallback(async (newSettings: Partial<AutoPushSettings>) => {
    try {
      await updateSettings(newSettings);
      return true;
    } catch (err) {
      console.error('Error updating auto-push settings:', err);
      return false;
    }
  }, [updateSettings]);

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
    updateSettings: updateAutoPushSettings,
    shouldAutoPush,
    refetch: () => {}, // No longer needed - React Query handles refetching
  };
}
