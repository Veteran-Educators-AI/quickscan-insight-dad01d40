-- Add parent_ai_notifications column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS parent_ai_notifications boolean DEFAULT true;