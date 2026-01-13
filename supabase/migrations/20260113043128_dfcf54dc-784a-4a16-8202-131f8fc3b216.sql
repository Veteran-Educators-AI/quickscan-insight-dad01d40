-- Add parent notification setting for low Regents scores
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS low_regents_parent_alerts_enabled boolean DEFAULT true;