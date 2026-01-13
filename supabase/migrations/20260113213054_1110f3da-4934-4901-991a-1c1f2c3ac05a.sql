-- Create table for Nycologic Presentations
CREATE TABLE public.nycologic_presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  topic TEXT NOT NULL,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.nycologic_presentations ENABLE ROW LEVEL SECURITY;

-- Create policies for teacher access
CREATE POLICY "Teachers can view their own presentations" 
ON public.nycologic_presentations 
FOR SELECT 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own presentations" 
ON public.nycologic_presentations 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own presentations" 
ON public.nycologic_presentations 
FOR UPDATE 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own presentations" 
ON public.nycologic_presentations 
FOR DELETE 
USING (auth.uid() = teacher_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_nycologic_presentations_updated_at
BEFORE UPDATE ON public.nycologic_presentations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_nycologic_presentations_teacher_id ON public.nycologic_presentations(teacher_id);
CREATE INDEX idx_nycologic_presentations_created_at ON public.nycologic_presentations(created_at DESC);