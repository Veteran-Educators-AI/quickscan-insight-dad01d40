-- Create table to store diagnostic worksheet results
CREATE TABLE public.diagnostic_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  worksheet_id UUID REFERENCES public.worksheets(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  standard TEXT,
  level_a_score INTEGER DEFAULT 0,
  level_a_total INTEGER DEFAULT 0,
  level_b_score INTEGER DEFAULT 0,
  level_b_total INTEGER DEFAULT 0,
  level_c_score INTEGER DEFAULT 0,
  level_c_total INTEGER DEFAULT 0,
  level_d_score INTEGER DEFAULT 0,
  level_d_total INTEGER DEFAULT 0,
  level_e_score INTEGER DEFAULT 0,
  level_e_total INTEGER DEFAULT 0,
  level_f_score INTEGER DEFAULT 0,
  level_f_total INTEGER DEFAULT 0,
  recommended_level TEXT CHECK (recommended_level IN ('A', 'B', 'C', 'D', 'E', 'F')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own diagnostic results
CREATE POLICY "Teachers can view their own diagnostic results"
ON public.diagnostic_results
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can create diagnostic results
CREATE POLICY "Teachers can create diagnostic results"
ON public.diagnostic_results
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own diagnostic results
CREATE POLICY "Teachers can update their own diagnostic results"
ON public.diagnostic_results
FOR UPDATE
USING (auth.uid() = teacher_id);

-- Teachers can delete their own diagnostic results
CREATE POLICY "Teachers can delete their own diagnostic results"
ON public.diagnostic_results
FOR DELETE
USING (auth.uid() = teacher_id);

-- Add trigger for updated_at
CREATE TRIGGER update_diagnostic_results_updated_at
BEFORE UPDATE ON public.diagnostic_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_diagnostic_results_student ON public.diagnostic_results(student_id);
CREATE INDEX idx_diagnostic_results_teacher ON public.diagnostic_results(teacher_id);
CREATE INDEX idx_diagnostic_results_topic ON public.diagnostic_results(topic_name);