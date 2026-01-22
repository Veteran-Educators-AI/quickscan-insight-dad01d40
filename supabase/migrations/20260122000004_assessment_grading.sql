-- ============================================================================
-- ASSESSMENT & GRADING MIGRATION
-- Pending scans, diagnostic results, grade history, AI rate limiting, attendance
-- Consolidated from: 20260107172539, 20260107225859, 20260108033415, 20260108152400,
--                    20260113041631 (if grade_history), 20260113043128, 20260117150154
-- ============================================================================

-- ============================================================================
-- PENDING SCANS TABLE
-- ============================================================================

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

ALTER TABLE public.pending_scans ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER update_pending_scans_updated_at
BEFORE UPDATE ON public.pending_scans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pending_scans_teacher_id ON public.pending_scans(teacher_id);
CREATE INDEX idx_pending_scans_status ON public.pending_scans(status);

-- ============================================================================
-- DIAGNOSTIC RESULTS TABLE
-- ============================================================================

CREATE TABLE public.diagnostic_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  worksheet_id UUID REFERENCES public.worksheets(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  standard TEXT,
  level_a_score INTEGER DEFAULT 0,
  level_a_total INTEGER DEFAULT 0,
  level_b_score INTEGER DEFAULT 0,
  level_b_total INTEGER DEFAULT 0,
  level_c_score INTEGER DEFAULT 0,
  level_c_total INTEGER DEFAULT 0,
  level_d_score INTEGER DEFAULT 0,
  level_d_total INTEGER DEFAULT 0,
  level_e_score INTEGER DEFAULT 0,
  level_e_total INTEGER DEFAULT 0,
  level_f_score INTEGER DEFAULT 0,
  level_f_total INTEGER DEFAULT 0,
  recommended_level TEXT CHECK (recommended_level IN ('A', 'B', 'C', 'D', 'E', 'F')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own diagnostic results"
ON public.diagnostic_results
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create diagnostic results"
ON public.diagnostic_results
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own diagnostic results"
ON public.diagnostic_results
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own diagnostic results"
ON public.diagnostic_results
FOR DELETE
USING (auth.uid() = teacher_id);

CREATE TRIGGER update_diagnostic_results_updated_at
BEFORE UPDATE ON public.diagnostic_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_diagnostic_results_student ON public.diagnostic_results(student_id);
CREATE INDEX idx_diagnostic_results_teacher ON public.diagnostic_results(teacher_id);
CREATE INDEX idx_diagnostic_results_topic ON public.diagnostic_results(topic_name);

-- ============================================================================
-- GRADE HISTORY TABLE
-- ============================================================================

CREATE TABLE public.grade_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  topic_name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade >= 55 AND grade <= 100),
  grade_justification TEXT,
  raw_score_earned NUMERIC,
  raw_score_possible NUMERIC,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  regents_score INTEGER,
  nys_standard TEXT,
  regents_justification TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT grade_history_regents_score_check CHECK (regents_score IS NULL OR (regents_score >= 0 AND regents_score <= 4))
);

ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view grade history for their students"
ON public.grade_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students
    JOIN classes ON students.class_id = classes.id
    WHERE students.id = grade_history.student_id
    AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can insert grade history"
ON public.grade_history
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their grade history"
ON public.grade_history
FOR UPDATE
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their grade history"
ON public.grade_history
FOR DELETE
USING (auth.uid() = teacher_id);

CREATE INDEX idx_grade_history_student_topic ON public.grade_history(student_id, topic_id);
CREATE INDEX idx_grade_history_teacher ON public.grade_history(teacher_id);
CREATE INDEX idx_grade_history_created_at ON public.grade_history(created_at);
CREATE INDEX idx_grade_history_nys_standard ON public.grade_history(nys_standard);
CREATE INDEX idx_grade_history_regents_score ON public.grade_history(regents_score);

-- ============================================================================
-- AI USAGE LOGS TABLE (Rate Limiting)
-- ============================================================================

CREATE TABLE public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    function_name TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_ai_usage_user_time ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_function ON public.ai_usage_logs(function_name, created_at DESC);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
ON public.ai_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage logs"
ON public.ai_usage_logs
FOR INSERT
WITH CHECK (true);

-- Add rate limit settings to settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS ai_hourly_limit INTEGER DEFAULT 50;

-- AI Rate Limit Check Function
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
    p_user_id UUID,
    p_hourly_limit INTEGER DEFAULT 50,
    p_daily_limit INTEGER DEFAULT 500
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    hourly_count INTEGER;
    daily_count INTEGER;
    user_hourly_limit INTEGER;
    user_daily_limit INTEGER;
BEGIN
    SELECT COALESCE(ai_hourly_limit, p_hourly_limit), COALESCE(ai_daily_limit, p_daily_limit)
    INTO user_hourly_limit, user_daily_limit
    FROM public.settings
    WHERE teacher_id = p_user_id;

    IF user_hourly_limit IS NULL THEN
        user_hourly_limit := p_hourly_limit;
    END IF;
    IF user_daily_limit IS NULL THEN
        user_daily_limit := p_daily_limit;
    END IF;

    SELECT COUNT(*) INTO hourly_count
    FROM public.ai_usage_logs
    WHERE user_id = p_user_id
    AND created_at > now() - interval '1 hour';

    SELECT COUNT(*) INTO daily_count
    FROM public.ai_usage_logs
    WHERE user_id = p_user_id
    AND created_at > now() - interval '24 hours';

    RETURN json_build_object(
        'allowed', (hourly_count < user_hourly_limit AND daily_count < user_daily_limit),
        'hourly_count', hourly_count,
        'hourly_limit', user_hourly_limit,
        'daily_count', daily_count,
        'daily_limit', user_daily_limit,
        'hourly_remaining', GREATEST(0, user_hourly_limit - hourly_count),
        'daily_remaining', GREATEST(0, user_daily_limit - daily_count)
    );
END;
$$;

-- ============================================================================
-- ASSIGNMENT ATTENDANCE TABLE
-- ============================================================================

CREATE TABLE public.assignment_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  assignment_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('absent', 'late', 'exempt', 'will_submit_later', 'submitted')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, student_id, assignment_name)
);

ALTER TABLE public.assignment_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own attendance records"
  ON public.assignment_attendance FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create attendance records"
  ON public.assignment_attendance FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own attendance records"
  ON public.assignment_attendance FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own attendance records"
  ON public.assignment_attendance FOR DELETE
  USING (auth.uid() = teacher_id);

CREATE INDEX idx_assignment_attendance_teacher ON public.assignment_attendance(teacher_id);
CREATE INDEX idx_assignment_attendance_student ON public.assignment_attendance(student_id);
CREATE INDEX idx_assignment_attendance_class ON public.assignment_attendance(class_id);
CREATE INDEX idx_assignment_attendance_assignment ON public.assignment_attendance(assignment_name);

CREATE TRIGGER update_assignment_attendance_updated_at
  BEFORE UPDATE ON public.assignment_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
