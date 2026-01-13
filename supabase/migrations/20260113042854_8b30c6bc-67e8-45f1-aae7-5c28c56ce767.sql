-- Add low Regents score alert settings to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS low_regents_alerts_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS low_regents_threshold integer DEFAULT 2;