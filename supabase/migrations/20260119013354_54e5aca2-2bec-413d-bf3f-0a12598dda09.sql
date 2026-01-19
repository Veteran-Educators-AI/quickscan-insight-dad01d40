-- Create table for teacher answer samples
CREATE TABLE public.teacher_answer_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  nys_standard TEXT,
  question_context TEXT,
  image_url TEXT NOT NULL,
  ocr_text TEXT,
  key_steps TEXT[],
  grading_emphasis TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_answer_samples ENABLE ROW LEVEL SECURITY;

-- Teachers can only see their own samples
CREATE POLICY "Teachers can view their own answer samples"
ON public.teacher_answer_samples
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can create their own samples
CREATE POLICY "Teachers can create their own answer samples"
ON public.teacher_answer_samples
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own samples
CREATE POLICY "Teachers can update their own answer samples"
ON public.teacher_answer_samples
FOR UPDATE
USING (auth.uid() = teacher_id);

-- Teachers can delete their own samples
CREATE POLICY "Teachers can delete their own answer samples"
ON public.teacher_answer_samples
FOR DELETE
USING (auth.uid() = teacher_id);

-- Create storage bucket for teacher answer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-answers', 'teacher-answers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for teacher answer images
CREATE POLICY "Teachers can upload their own answer images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'teacher-answers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view teacher answer images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'teacher-answers');

CREATE POLICY "Teachers can update their own answer images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'teacher-answers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can delete their own answer images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'teacher-answers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updating timestamps
CREATE TRIGGER update_teacher_answer_samples_updated_at
BEFORE UPDATE ON public.teacher_answer_samples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();