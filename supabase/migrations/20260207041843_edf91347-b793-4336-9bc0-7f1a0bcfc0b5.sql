-- Add blank page detection settings to the settings table
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS blank_page_auto_score boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS blank_page_score integer DEFAULT 55,
  ADD COLUMN IF NOT EXISTS blank_page_comment text DEFAULT 'No work shown on this page; score assigned per no-response policy.';