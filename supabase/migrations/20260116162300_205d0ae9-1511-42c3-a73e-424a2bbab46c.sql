-- Create table to track teacher grading corrections for AI training
CREATE TABLE public.grading_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
  topic_name TEXT NOT NULL,
  
  -- Original AI assessment
  ai_grade INTEGER NOT NULL,
  ai_regents_score INTEGER,
  ai_justification TEXT,
  
  -- Teacher's correction
  corrected_grade INTEGER NOT NULL,
  corrected_regents_score INTEGER,
  correction_reason TEXT,
  
  -- What the teacher focused on
  grading_focus TEXT[], -- e.g., ['work_shown', 'final_answer', 'methodology', 'partial_credit']
  strictness_indicator TEXT CHECK (strictness_indicator IN ('more_lenient', 'as_expected', 'more_strict')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grading_corrections ENABLE ROW LEVEL SECURITY;

-- Teachers can only see and manage their own corrections
CREATE POLICY "Teachers can view their own grading corrections"
  ON public.grading_corrections FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own grading corrections"
  ON public.grading_corrections FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own grading corrections"
  ON public.grading_corrections FOR DELETE
  USING (auth.uid() = teacher_id);

-- Add AI training mode setting to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS ai_training_mode TEXT DEFAULT 'learning' CHECK (ai_training_mode IN ('off', 'learning', 'trained'));

-- Index for efficient querying of recent corrections
CREATE INDEX idx_grading_corrections_teacher_recent ON public.grading_corrections(teacher_id, created_at DESC);