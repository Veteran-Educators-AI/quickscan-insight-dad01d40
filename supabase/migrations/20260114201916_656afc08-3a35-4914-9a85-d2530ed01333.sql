-- Add auto handwriting grouping setting and grade curve settings to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS auto_handwriting_grouping_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS grade_curve_percent integer DEFAULT 0;