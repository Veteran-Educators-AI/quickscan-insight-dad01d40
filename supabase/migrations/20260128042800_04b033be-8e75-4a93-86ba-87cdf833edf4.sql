-- Create table for daily suggestions
CREATE TABLE public.simple_mode_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  suggested_topic TEXT NOT NULL,
  suggested_standard TEXT,
  reason TEXT NOT NULL,
  source_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approval_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  lesson_plan_id UUID REFERENCES public.lesson_plans(id) ON DELETE SET NULL,
  worksheet_id UUID REFERENCES public.worksheets(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.simple_mode_suggestions ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own suggestions
CREATE POLICY "Teachers can view their own suggestions"
ON public.simple_mode_suggestions
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can update their own suggestions
CREATE POLICY "Teachers can update their own suggestions"
ON public.simple_mode_suggestions
FOR UPDATE
USING (auth.uid() = teacher_id);

-- Teachers can insert their own suggestions
CREATE POLICY "Teachers can insert their own suggestions"
ON public.simple_mode_suggestions
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Create index for faster lookups
CREATE INDEX idx_simple_mode_suggestions_teacher ON public.simple_mode_suggestions(teacher_id);
CREATE INDEX idx_simple_mode_suggestions_token ON public.simple_mode_suggestions(approval_token) WHERE approval_token IS NOT NULL;
CREATE INDEX idx_simple_mode_suggestions_status ON public.simple_mode_suggestions(status, created_at DESC);