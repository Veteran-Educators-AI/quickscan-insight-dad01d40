-- Create worksheets table for saving compiled worksheets
CREATE TABLE public.worksheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  teacher_name TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own worksheets
CREATE POLICY "Teachers can view their own worksheets"
ON public.worksheets
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can create worksheets
CREATE POLICY "Teachers can create worksheets"
ON public.worksheets
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own worksheets
CREATE POLICY "Teachers can update their own worksheets"
ON public.worksheets
FOR UPDATE
USING (auth.uid() = teacher_id);

-- Teachers can delete their own worksheets
CREATE POLICY "Teachers can delete their own worksheets"
ON public.worksheets
FOR DELETE
USING (auth.uid() = teacher_id);

-- Add trigger for updated_at
CREATE TRIGGER update_worksheets_updated_at
BEFORE UPDATE ON public.worksheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();