-- Create a table for storing misconceptions identified during analysis
CREATE TABLE public.analysis_misconceptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.attempts(id) ON DELETE SET NULL,
  grade_history_id uuid REFERENCES public.grade_history(id) ON DELETE CASCADE,
  topic_name text NOT NULL,
  misconception_text text NOT NULL,
  suggested_remedies text[] DEFAULT '{}',
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  grade_impact integer, -- how much the grade was affected
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analysis_misconceptions ENABLE ROW LEVEL SECURITY;

-- Teachers can view misconceptions for their students
CREATE POLICY "Teachers can view student misconceptions"
ON public.analysis_misconceptions
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can insert misconceptions
CREATE POLICY "Teachers can insert misconceptions"
ON public.analysis_misconceptions
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can delete misconceptions
CREATE POLICY "Teachers can delete misconceptions"
ON public.analysis_misconceptions
FOR DELETE
USING (auth.uid() = teacher_id);

-- Students can view their own misconceptions
CREATE POLICY "Students can view their own misconceptions"
ON public.analysis_misconceptions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.id = analysis_misconceptions.student_id
  AND s.user_id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_analysis_misconceptions_student ON public.analysis_misconceptions(student_id);
CREATE INDEX idx_analysis_misconceptions_teacher ON public.analysis_misconceptions(teacher_id);
CREATE INDEX idx_analysis_misconceptions_grade_history ON public.analysis_misconceptions(grade_history_id);