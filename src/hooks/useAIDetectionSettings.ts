import { useSettings } from './useSettings';

interface AIDetectionSettings {
  ai_detection_enabled: boolean;
  ai_detection_threshold: number;
  ai_auto_reject_enabled: boolean;
  parent_ai_notifications: boolean;
}

const DEFAULT_SETTINGS: AIDetectionSettings = {
  ai_detection_enabled: true,
  ai_detection_threshold: 80,
  ai_auto_reject_enabled: true,
  parent_ai_notifications: true,
};

/**
 * AI Detection settings hook - now uses unified settings to avoid duplicate API calls
 * Previously made a separate API call to the settings table
 * Now shares the unified settings query with other hooks
 */
export function useAIDetectionSettings() {
  const { settings: unifiedSettings, isLoading } = useSettings();

  const settings: AIDetectionSettings = {
    ai_detection_enabled: unifiedSettings.aiDetectionEnabled,
    ai_detection_threshold: unifiedSettings.aiDetectionThreshold,
    ai_auto_reject_enabled: unifiedSettings.aiAutoRejectEnabled,
    parent_ai_notifications: unifiedSettings.parentAiNotifications,
  };

  return { settings, isLoading };
}
