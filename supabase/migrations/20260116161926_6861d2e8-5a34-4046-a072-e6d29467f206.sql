-- Add AI feedback verbosity setting to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS ai_feedback_verbosity TEXT DEFAULT 'concise' CHECK (ai_feedback_verbosity IN ('concise', 'detailed'));