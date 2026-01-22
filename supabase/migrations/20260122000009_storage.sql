-- ============================================================================
-- STORAGE MIGRATION
-- AI-generated images, teacher answer samples, storage buckets
-- Consolidated from: 20260118180239, 20260119013354
-- ============================================================================

-- ============================================================================
-- AI GENERATED IMAGES TABLE
-- ============================================================================

CREATE TABLE public.ai_generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  subject TEXT,
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

CREATE INDEX idx_ai_images_teacher_status ON public.ai_generated_images(teacher_id, status);
CREATE INDEX idx_ai_images_subject ON public.ai_generated_images(subject);
CREATE INDEX idx_ai_images_topic ON public.ai_generated_images(topic);

ALTER TABLE public.ai_generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own images"
ON public.ai_generated_images
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own images"
ON public.ai_generated_images
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own images"
ON public.ai_generated_images
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own images"
ON public.ai_generated_images
FOR DELETE
USING (auth.uid() = teacher_id);

-- Trigger function for AI images timestamp
CREATE OR REPLACE FUNCTION public.update_ai_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ai_images_updated_at
BEFORE UPDATE ON public.ai_generated_images
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_images_updated_at();

-- ============================================================================
-- TEACHER ANSWER SAMPLES TABLE
-- ============================================================================

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

ALTER TABLE public.teacher_answer_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own answer samples"
ON public.teacher_answer_samples
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own answer samples"
ON public.teacher_answer_samples
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own answer samples"
ON public.teacher_answer_samples
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own answer samples"
ON public.teacher_answer_samples
FOR DELETE
USING (auth.uid() = teacher_id);

CREATE TRIGGER update_teacher_answer_samples_updated_at
BEFORE UPDATE ON public.teacher_answer_samples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for teacher answer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-answers', 'teacher-answers', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

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
