-- Create shared assignments table for cross-app access
CREATE TABLE public.shared_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  worksheet_id UUID REFERENCES public.worksheets(id) ON DELETE SET NULL,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  coin_reward INTEGER NOT NULL DEFAULT 25,
  due_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  source_app TEXT NOT NULL DEFAULT 'nyclogic_ai',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own assignments
CREATE POLICY "Teachers can create shared assignments"
ON public.shared_assignments
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their own shared assignments"
ON public.shared_assignments
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own shared assignments"
ON public.shared_assignments
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own shared assignments"
ON public.shared_assignments
FOR DELETE
USING (auth.uid() = teacher_id);

-- Students can view assignments for their class (for NYClogic Scholar Ai access)
CREATE POLICY "Students can view class assignments"
ON public.shared_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.class_id = shared_assignments.class_id
    AND s.user_id = auth.uid()
  )
);

-- Create index for efficient queries
CREATE INDEX idx_shared_assignments_class ON public.shared_assignments(class_id);
CREATE INDEX idx_shared_assignments_teacher ON public.shared_assignments(teacher_id);
CREATE INDEX idx_shared_assignments_status ON public.shared_assignments(status);

-- Add trigger for updated_at
CREATE TRIGGER update_shared_assignments_updated_at
BEFORE UPDATE ON public.shared_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();