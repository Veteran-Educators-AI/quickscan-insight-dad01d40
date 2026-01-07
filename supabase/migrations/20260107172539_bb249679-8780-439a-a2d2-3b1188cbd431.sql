-- Create a table for pending scans (saved for later)
CREATE TABLE public.pending_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pending_scans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - teachers can only see their own pending scans
CREATE POLICY "Teachers can view their own pending scans" 
ON public.pending_scans 
FOR SELECT 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own pending scans" 
ON public.pending_scans 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own pending scans" 
ON public.pending_scans 
FOR UPDATE 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own pending scans" 
ON public.pending_scans 
FOR DELETE 
USING (auth.uid() = teacher_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pending_scans_updated_at
BEFORE UPDATE ON public.pending_scans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_pending_scans_teacher_id ON public.pending_scans(teacher_id);
CREATE INDEX idx_pending_scans_status ON public.pending_scans(status);