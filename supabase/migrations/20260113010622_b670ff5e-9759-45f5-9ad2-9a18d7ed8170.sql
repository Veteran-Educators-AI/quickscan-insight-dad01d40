-- Create table to store name corrections for learning
CREATE TABLE public.name_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  handwritten_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  correct_student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  times_used INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id, normalized_name)
);

-- Enable RLS
ALTER TABLE public.name_corrections ENABLE ROW LEVEL SECURITY;

-- Teachers can only manage their own corrections
CREATE POLICY "Teachers can view their own name corrections"
ON public.name_corrections
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own name corrections"
ON public.name_corrections
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own name corrections"
ON public.name_corrections
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own name corrections"
ON public.name_corrections
FOR DELETE
USING (auth.uid() = teacher_id);

-- Add trigger for updated_at
CREATE TRIGGER update_name_corrections_updated_at
BEFORE UPDATE ON public.name_corrections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_name_corrections_lookup ON public.name_corrections(teacher_id, class_id, normalized_name);