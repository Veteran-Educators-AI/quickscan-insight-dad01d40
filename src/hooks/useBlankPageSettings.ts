import { useCallback } from 'react';
import { useSettings } from './useSettings';

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

/**
 * Blank Page settings hook - now uses unified settings to avoid duplicate API calls
 * Previously made a separate API call to the settings table
 * Now shares the unified settings query with other hooks
 */
export function useBlankPageSettings() {
  const { settings: unifiedSettings, isLoading, updateSettings, isUpdating } = useSettings();

  const settings: BlankPageSettings = {
    autoScoreBlankPages: unifiedSettings.autoScoreBlankPages,
    blankPageScore: unifiedSettings.blankPageScore,
    blankPageComment: unifiedSettings.blankPageComment,
  };

  const updateBlankPageSettings = useCallback(async (newSettings: Partial<BlankPageSettings>) => {
    try {
      await updateSettings(newSettings);
      return true;
    } catch (err) {
      console.error('Error updating blank page settings:', err);
      return false;
    }
  }, [updateSettings]);

  return {
    settings,
    isLoading,
    updateSettings: updateBlankPageSettings,
    refetch: () => {}, // No longer needed - React Query handles refetching
  };
}
