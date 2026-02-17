import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface UnifiedSettings {
  // QR Scan Settings
  autoQRScanEnabled: boolean;
  autoHandwritingGroupingEnabled: boolean;
  gradeCurvePercent: number;
  
  // Blank Page Settings
  autoScoreBlankPages: boolean;
  blankPageScore: number;
  blankPageComment: string;
  
  // Auto Push Settings
  autoPushEnabled: boolean;
  autoPushThreshold: number;
  autoPushRegentsThreshold: number;
  autoPushWorksheetCount: number;
  
  // Grade Floor Settings
  gradeFloor: number;
  gradeFloorWithEffort: number;
  
  // AI Detection Settings
  aiDetectionEnabled: boolean;
  aiDetectionThreshold: number;
  aiAutoRejectEnabled: boolean;
  parentAiNotifications: boolean;
}

const DEFAULT_SETTINGS: UnifiedSettings = {
  // QR Scan defaults
  autoQRScanEnabled: true,
  autoHandwritingGroupingEnabled: false,
  gradeCurvePercent: 0,
  
  // Blank Page defaults
  autoScoreBlankPages: true,
  blankPageScore: 0,
  blankPageComment: 'No work shown on this page; score assigned per no-response policy.',
  
  // Auto Push defaults
  autoPushEnabled: false,
  autoPushThreshold: 70,
  autoPushRegentsThreshold: 3,
  autoPushWorksheetCount: 3,
  
  // Grade Floor defaults
  gradeFloor: 0,
  gradeFloorWithEffort: 0,
  
  // AI Detection defaults
  aiDetectionEnabled: true,
  aiDetectionThreshold: 80,
  aiAutoRejectEnabled: true,
  parentAiNotifications: true,
};

/**
 * Unified settings hook that fetches ALL settings in a single query
 * This replaces multiple individual settings hooks that were each making separate API calls
 * 
 * Benefits:
 * - 5+ API calls reduced to 1
 * - Automatic deduplication via React Query
 * - Shared cache across all components
 * - Automatic refetching and cache invalidation
 */
export function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS, isLoading, error } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('teacher_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Map database columns to our unified settings interface
      const unifiedSettings: UnifiedSettings = {
        // QR Scan Settings
        autoQRScanEnabled: data?.auto_qr_scan_enabled ?? DEFAULT_SETTINGS.autoQRScanEnabled,
        autoHandwritingGroupingEnabled: data?.auto_handwriting_grouping_enabled ?? DEFAULT_SETTINGS.autoHandwritingGroupingEnabled,
        gradeCurvePercent: data?.grade_curve_percent ?? DEFAULT_SETTINGS.gradeCurvePercent,
        
        // Blank Page Settings
        autoScoreBlankPages: data?.blank_page_auto_score ?? DEFAULT_SETTINGS.autoScoreBlankPages,
        blankPageScore: data?.blank_page_score ?? DEFAULT_SETTINGS.blankPageScore,
        blankPageComment: data?.blank_page_comment ?? DEFAULT_SETTINGS.blankPageComment,
        
        // Auto Push Settings
        autoPushEnabled: data?.auto_push_enabled ?? DEFAULT_SETTINGS.autoPushEnabled,
        autoPushThreshold: data?.auto_push_threshold ?? DEFAULT_SETTINGS.autoPushThreshold,
        autoPushRegentsThreshold: data?.auto_push_regents_threshold ?? DEFAULT_SETTINGS.autoPushRegentsThreshold,
        autoPushWorksheetCount: data?.auto_push_worksheet_count ?? DEFAULT_SETTINGS.autoPushWorksheetCount,
        
        // Grade Floor Settings
        gradeFloor: data?.grade_floor ?? DEFAULT_SETTINGS.gradeFloor,
        gradeFloorWithEffort: data?.grade_floor_with_effort ?? DEFAULT_SETTINGS.gradeFloorWithEffort,
        
        // AI Detection Settings
        aiDetectionEnabled: data?.ai_detection_enabled ?? DEFAULT_SETTINGS.aiDetectionEnabled,
        aiDetectionThreshold: data?.ai_detection_threshold ?? DEFAULT_SETTINGS.aiDetectionThreshold,
        aiAutoRejectEnabled: data?.ai_auto_reject_enabled ?? DEFAULT_SETTINGS.aiAutoRejectEnabled,
        parentAiNotifications: data?.parent_ai_notifications ?? DEFAULT_SETTINGS.parentAiNotifications,
      };

      return unifiedSettings;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UnifiedSettings>) => {
      if (!user) throw new Error('User not authenticated');

      // Merge with current settings
      const merged = { ...settings, ...updates };

      // Map back to database columns
      const { error } = await supabase
        .from('settings')
        .upsert({
          teacher_id: user.id,
          // QR Scan
          auto_qr_scan_enabled: merged.autoQRScanEnabled,
          auto_handwriting_grouping_enabled: merged.autoHandwritingGroupingEnabled,
          grade_curve_percent: merged.gradeCurvePercent,
          // Blank Page
          blank_page_auto_score: merged.autoScoreBlankPages,
          blank_page_score: merged.blankPageScore,
          blank_page_comment: merged.blankPageComment,
          // Auto Push
          auto_push_enabled: merged.autoPushEnabled,
          auto_push_threshold: merged.autoPushThreshold,
          auto_push_regents_threshold: merged.autoPushRegentsThreshold,
          auto_push_worksheet_count: merged.autoPushWorksheetCount,
          // Grade Floor
          grade_floor: merged.gradeFloor,
          grade_floor_with_effort: merged.gradeFloorWithEffort,
          // AI Detection
          ai_detection_enabled: merged.aiDetectionEnabled,
          ai_detection_threshold: merged.aiDetectionThreshold,
          ai_auto_reject_enabled: merged.aiAutoRejectEnabled,
          parent_ai_notifications: merged.parentAiNotifications,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'teacher_id',
        });

      if (error) throw error;

      return merged;
    },
    onSuccess: (updatedSettings) => {
      // Update the cache with the new settings
      queryClient.setQueryData(['settings', user?.id], updatedSettings);
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
