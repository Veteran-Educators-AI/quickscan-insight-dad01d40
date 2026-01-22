-- ============================================================================
-- AI TRAINING & FEEDBACK MIGRATION
-- Interpretation verifications, misconceptions, grading corrections, AI feedback
-- Consolidated from: 20260113010622, 20260115124535, 20260115151514, 20260116161926,
--                    20260116162300, 20260120025132
-- ============================================================================

-- ============================================================================
-- NAME CORRECTIONS TABLE (for handwriting recognition learning)
-- ============================================================================

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

ALTER TABLE public.name_corrections ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER update_name_corrections_updated_at
BEFORE UPDATE ON public.name_corrections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_name_corrections_lookup ON public.name_corrections(teacher_id, class_id, normalized_name);

-- ============================================================================
-- INTERPRETATION VERIFICATIONS TABLE
-- ============================================================================

CREATE TABLE public.interpretation_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  original_text TEXT NOT NULL,
  interpretation TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  correct_interpretation TEXT,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interpretation_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own verifications"
ON public.interpretation_verifications
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own verifications"
ON public.interpretation_verifications
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE INDEX idx_interpretation_verifications_teacher ON public.interpretation_verifications(teacher_id);
CREATE INDEX idx_interpretation_verifications_decision ON public.interpretation_verifications(decision);

ALTER PUBLICATION supabase_realtime ADD TABLE public.interpretation_verifications;

-- ============================================================================
-- ANALYSIS MISCONCEPTIONS TABLE
-- ============================================================================

CREATE TABLE public.analysis_misconceptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.attempts(id) ON DELETE SET NULL,
  grade_history_id uuid REFERENCES public.grade_history(id) ON DELETE CASCADE,
  topic_name text NOT NULL,
  misconception_text text NOT NULL,
  suggested_remedies text[] DEFAULT '{}',
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  grade_impact integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_misconceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view student misconceptions"
ON public.analysis_misconceptions
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert misconceptions"
ON public.analysis_misconceptions
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete misconceptions"
ON public.analysis_misconceptions
FOR DELETE
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view their own misconceptions"
ON public.analysis_misconceptions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.id = analysis_misconceptions.student_id
  AND s.user_id = auth.uid()
));

CREATE INDEX idx_analysis_misconceptions_student ON public.analysis_misconceptions(student_id);
CREATE INDEX idx_analysis_misconceptions_teacher ON public.analysis_misconceptions(teacher_id);
CREATE INDEX idx_analysis_misconceptions_grade_history ON public.analysis_misconceptions(grade_history_id);

-- ============================================================================
-- GRADING CORRECTIONS TABLE (AI Training)
-- ============================================================================

CREATE TABLE public.grading_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
  topic_name TEXT NOT NULL,
  ai_grade INTEGER NOT NULL,
  ai_regents_score INTEGER,
  ai_justification TEXT,
  corrected_grade INTEGER NOT NULL,
  corrected_regents_score INTEGER,
  correction_reason TEXT,
  grading_focus TEXT[],
  strictness_indicator TEXT CHECK (strictness_indicator IN ('more_lenient', 'as_expected', 'more_strict')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grading_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own grading corrections"
  ON public.grading_corrections FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own grading corrections"
  ON public.grading_corrections FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own grading corrections"
  ON public.grading_corrections FOR DELETE
  USING (auth.uid() = teacher_id);

CREATE INDEX idx_grading_corrections_teacher_recent ON public.grading_corrections(teacher_id, created_at DESC);

-- ============================================================================
-- AI ANALYSIS FEEDBACK TABLE
-- ============================================================================

CREATE TABLE public.ai_analysis_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
  grade_history_id UUID REFERENCES public.grade_history(id) ON DELETE SET NULL,
  topic_name TEXT NOT NULL,
  ai_grade INTEGER,
  ai_justification TEXT,
  ai_misconceptions TEXT[],
  ai_feedback TEXT,
  critique_type TEXT NOT NULL CHECK (critique_type IN ('grade_too_high', 'grade_too_low', 'missed_work', 'wrong_misconception', 'good_analysis', 'other')),
  critique_text TEXT NOT NULL,
  what_ai_missed TEXT,
  what_ai_got_wrong TEXT,
  preferred_approach TEXT,
  corrected_grade INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.ai_analysis_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own feedback"
  ON public.ai_analysis_feedback FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own feedback"
  ON public.ai_analysis_feedback FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own feedback"
  ON public.ai_analysis_feedback FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own feedback"
  ON public.ai_analysis_feedback FOR DELETE
  USING (auth.uid() = teacher_id);

CREATE INDEX idx_ai_analysis_feedback_teacher ON public.ai_analysis_feedback(teacher_id);
CREATE INDEX idx_ai_analysis_feedback_topic ON public.ai_analysis_feedback(topic_name);
CREATE INDEX idx_ai_analysis_feedback_type ON public.ai_analysis_feedback(critique_type);

-- ============================================================================
-- AI TRAINING MODE SETTING
-- ============================================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS ai_training_mode TEXT DEFAULT 'learning' CHECK (ai_training_mode IN ('off', 'learning', 'trained'));

-- ============================================================================
-- AI FEEDBACK VERBOSITY SETTING
-- ============================================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS ai_feedback_verbosity TEXT DEFAULT 'concise' CHECK (ai_feedback_verbosity IN ('concise', 'detailed'));
