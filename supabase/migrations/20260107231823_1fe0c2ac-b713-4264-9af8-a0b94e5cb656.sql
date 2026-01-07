-- Add AI detection settings columns to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS ai_detection_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_detection_threshold integer DEFAULT 80,
ADD COLUMN IF NOT EXISTS ai_auto_reject_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS level_drop_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS level_a_notifications boolean DEFAULT true;