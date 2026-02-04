-- Add due date and assignment tracking to worksheets
ALTER TABLE public.worksheets 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_assigned BOOLEAN DEFAULT false;

-- Create worksheet submissions table to track student work
CREATE TABLE IF NOT EXISTS public.worksheet_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worksheet_id UUID NOT NULL REFERENCES public.worksheets(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'late', 'missing')),
  score NUMERIC(5,2),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(worksheet_id, student_id)
);

-- Enable RLS
ALTER TABLE public.worksheet_submissions ENABLE ROW LEVEL SECURITY;

-- Teachers can view submissions for their classes
CREATE POLICY "Teachers can view submissions for their classes"
ON public.worksheet_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = worksheet_submissions.class_id
    AND c.teacher_id = auth.uid()
  )
);

-- Teachers can manage submissions for their classes
CREATE POLICY "Teachers can manage submissions for their classes"
ON public.worksheet_submissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = worksheet_submissions.class_id
    AND c.teacher_id = auth.uid()
  )
);

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions"
ON public.worksheet_submissions
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.students WHERE id = worksheet_submissions.student_id
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_worksheet_submissions_worksheet ON public.worksheet_submissions(worksheet_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_submissions_student ON public.worksheet_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_submissions_status ON public.worksheet_submissions(status);
CREATE INDEX IF NOT EXISTS idx_worksheets_class ON public.worksheets(class_id);
CREATE INDEX IF NOT EXISTS idx_worksheets_due_date ON public.worksheets(due_date);

-- Trigger for updated_at
CREATE TRIGGER update_worksheet_submissions_updated_at
BEFORE UPDATE ON public.worksheet_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();