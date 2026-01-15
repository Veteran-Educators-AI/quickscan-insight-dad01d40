-- Create table for storing teacher verification decisions on AI interpretations
CREATE TABLE public.interpretation_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  original_text TEXT NOT NULL,
  interpretation TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  correct_interpretation TEXT,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interpretation_verifications ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own verifications
CREATE POLICY "Teachers can view their own verifications"
ON public.interpretation_verifications
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can insert their own verifications
CREATE POLICY "Teachers can insert their own verifications"
ON public.interpretation_verifications
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Create index for faster lookups when training
CREATE INDEX idx_interpretation_verifications_teacher ON public.interpretation_verifications(teacher_id);
CREATE INDEX idx_interpretation_verifications_decision ON public.interpretation_verifications(decision);

-- Add to realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.interpretation_verifications;