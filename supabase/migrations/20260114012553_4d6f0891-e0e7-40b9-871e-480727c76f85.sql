-- Add auto-push settings columns to the settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS auto_push_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_push_threshold integer DEFAULT 70,
ADD COLUMN IF NOT EXISTS auto_push_regents_threshold integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS auto_push_worksheet_count integer DEFAULT 3;

-- Add comment for documentation
COMMENT ON COLUMN public.settings.auto_push_enabled IS 'Enable automatic push of remediation worksheets to sister app';
COMMENT ON COLUMN public.settings.auto_push_threshold IS 'Grade threshold below which to auto-push (0-100)';
COMMENT ON COLUMN public.settings.auto_push_regents_threshold IS 'Regents score threshold below which to auto-push (0-4)';
COMMENT ON COLUMN public.settings.auto_push_worksheet_count IS 'Number of worksheets to auto-push per student';