-- Add visual_theme column to store presentation theme settings
ALTER TABLE public.nycologic_presentations 
ADD COLUMN IF NOT EXISTS visual_theme JSONB DEFAULT NULL;