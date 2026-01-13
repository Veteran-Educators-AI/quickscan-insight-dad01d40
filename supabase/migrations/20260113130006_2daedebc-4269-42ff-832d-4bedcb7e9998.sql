-- Create lesson_plans table for storing saved lesson plans
CREATE TABLE public.lesson_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  standard TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  subject TEXT,
  objective TEXT NOT NULL,
  duration TEXT NOT NULL,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_worksheets JSONB NOT NULL DEFAULT '[]'::jsonb,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own lesson plans" 
ON public.lesson_plans 
FOR SELECT 
USING (auth.uid() = teacher_id);

CREATE POLICY "Users can create their own lesson plans" 
ON public.lesson_plans 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Users can update their own lesson plans" 
ON public.lesson_plans 
FOR UPDATE 
USING (auth.uid() = teacher_id);

CREATE POLICY "Users can delete their own lesson plans" 
ON public.lesson_plans 
FOR DELETE 
USING (auth.uid() = teacher_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lesson_plans_updated_at
BEFORE UPDATE ON public.lesson_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_lesson_plans_teacher_id ON public.lesson_plans(teacher_id);
CREATE INDEX idx_lesson_plans_subject ON public.lesson_plans(subject);
CREATE INDEX idx_lesson_plans_standard ON public.lesson_plans(standard);