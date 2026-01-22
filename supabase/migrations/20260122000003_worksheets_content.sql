-- ============================================================================
-- WORKSHEETS & CONTENT MIGRATION
-- Worksheets, lesson plans, and presentations
-- Consolidated from: 20260105224504, 20260105225106, 20260113130006, 20260113213054, 20260117182950
-- ============================================================================

-- ============================================================================
-- WORKSHEETS TABLE
-- ============================================================================

CREATE TABLE public.worksheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  teacher_name TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  share_code TEXT UNIQUE,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own worksheets"
ON public.worksheets
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create worksheets"
ON public.worksheets
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own worksheets"
ON public.worksheets
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own worksheets"
ON public.worksheets
FOR DELETE
USING (auth.uid() = teacher_id);

CREATE POLICY "Anyone can view shared worksheets"
ON public.worksheets
FOR SELECT
USING (is_shared = true AND share_code IS NOT NULL);

CREATE INDEX idx_worksheets_share_code ON public.worksheets(share_code) WHERE share_code IS NOT NULL;

CREATE TRIGGER update_worksheets_updated_at
BEFORE UPDATE ON public.worksheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- LESSON PLANS TABLE
-- ============================================================================

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

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER update_lesson_plans_updated_at
BEFORE UPDATE ON public.lesson_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lesson_plans_teacher_id ON public.lesson_plans(teacher_id);
CREATE INDEX idx_lesson_plans_subject ON public.lesson_plans(subject);
CREATE INDEX idx_lesson_plans_standard ON public.lesson_plans(standard);

-- ============================================================================
-- NYCOLOGIC PRESENTATIONS TABLE
-- ============================================================================

CREATE TABLE public.nycologic_presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  topic TEXT NOT NULL,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  visual_theme JSONB DEFAULT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nycologic_presentations ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER update_nycologic_presentations_updated_at
BEFORE UPDATE ON public.nycologic_presentations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_nycologic_presentations_teacher_id ON public.nycologic_presentations(teacher_id);
CREATE INDEX idx_nycologic_presentations_created_at ON public.nycologic_presentations(created_at DESC);
