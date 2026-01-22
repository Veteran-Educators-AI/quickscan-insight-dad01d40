import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type FeatureCategory = 
  | 'scanning'
  | 'worksheets'
  | 'lessons'
  | 'reports'
  | 'classes'
  | 'settings'
  | 'integrations'
  | 'ai'
  | 'general';

export interface TrackFeatureOptions {
  featureName: string;
  category: FeatureCategory;
  action?: string;
  metadata?: Record<string, unknown>;
}

export function useFeatureTracking() {
  const { user } = useAuth();

  const trackFeature = useCallback(async ({
    featureName,
    category,
    action = 'used',
    metadata = {}
  }: TrackFeatureOptions) => {
    if (!user) return;

    try {
      const insertData = {
        teacher_id: user.id,
        feature_name: featureName,
        feature_category: category,
        action,
        metadata: JSON.parse(JSON.stringify(metadata))
      };
      
      await supabase
        .from('feature_usage_log')
        .insert([insertData]);
    } catch (error) {
      // Silently fail - tracking should not break the app
      console.error('Feature tracking error:', error);
    }
  }, [user]);

  return { trackFeature };
}
