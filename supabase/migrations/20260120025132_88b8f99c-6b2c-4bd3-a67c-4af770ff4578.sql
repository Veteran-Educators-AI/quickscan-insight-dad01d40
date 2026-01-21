-- Create table for AI analysis feedback/critiques from teachers
-- This data will be used to improve AI grading accuracy over time
CREATE TABLE public.ai_analysis_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
  grade_history_id UUID REFERENCES public.grade_history(id) ON DELETE SET NULL,
  topic_name TEXT NOT NULL,
  
  -- Original AI analysis data
  ai_grade INTEGER,
  ai_justification TEXT,
  ai_misconceptions TEXT[],
  ai_feedback TEXT,
  
  -- Teacher critique/feedback
  critique_type TEXT NOT NULL CHECK (critique_type IN ('grade_too_high', 'grade_too_low', 'missed_work', 'wrong_misconception', 'good_analysis', 'other')),
  critique_text TEXT NOT NULL,
  what_ai_missed TEXT,
  what_ai_got_wrong TEXT,
  preferred_approach TEXT,
  
  -- Corrected values if applicable
  corrected_grade INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.ai_analysis_feedback ENABLE ROW LEVEL SECURITY;

-- Teachers can only view and manage their own feedback
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

-- Create index for efficient lookups
CREATE INDEX idx_ai_analysis_feedback_teacher ON public.ai_analysis_feedback(teacher_id);
CREATE INDEX idx_ai_analysis_feedback_topic ON public.ai_analysis_feedback(topic_name);
CREATE INDEX idx_ai_analysis_feedback_type ON public.ai_analysis_feedback(critique_type);