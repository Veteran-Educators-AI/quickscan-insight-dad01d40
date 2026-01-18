-- Create table for storing AI-generated images for teacher review and reuse
CREATE TABLE public.ai_generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  subject TEXT, -- math, science, history, language arts, etc.
  topic TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  source TEXT NOT NULL DEFAULT 'worksheet' CHECK (source IN ('worksheet', 'presentation', 'clipart', 'manual')),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

-- Create index for faster lookups
CREATE INDEX idx_ai_images_teacher_status ON public.ai_generated_images(teacher_id, status);
CREATE INDEX idx_ai_images_subject ON public.ai_generated_images(subject);
CREATE INDEX idx_ai_images_topic ON public.ai_generated_images(topic);

-- Enable Row Level Security
ALTER TABLE public.ai_generated_images ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own images
CREATE POLICY "Teachers can view their own images" 
ON public.ai_generated_images 
FOR SELECT 
USING (auth.uid() = teacher_id);

-- Teachers can insert their own images
CREATE POLICY "Teachers can insert their own images" 
ON public.ai_generated_images 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own images
CREATE POLICY "Teachers can update their own images" 
ON public.ai_generated_images 
FOR UPDATE 
USING (auth.uid() = teacher_id);

-- Teachers can delete their own images
CREATE POLICY "Teachers can delete their own images" 
ON public.ai_generated_images 
FOR DELETE 
USING (auth.uid() = teacher_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_ai_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_images_updated_at
BEFORE UPDATE ON public.ai_generated_images
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_images_updated_at();