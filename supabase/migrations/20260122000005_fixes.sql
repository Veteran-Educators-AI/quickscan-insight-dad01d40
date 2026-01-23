-- ============================================================================
-- FIX MIGRATION: Schema fixes and RLS policy recursion
-- ============================================================================

-- ============================================================================
-- FIX: INFINITE RECURSION IN CLASSES RLS POLICY
-- ============================================================================

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Students can view their classes" ON public.classes;

-- Recreate with a non-recursive approach using SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_student_class_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT class_id FROM public.students WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Recreate the policy using the function
CREATE POLICY "Students can view their classes"
ON public.classes FOR SELECT
USING (
  teacher_id = auth.uid() OR
  id IN (SELECT public.get_student_class_ids(auth.uid()))
);

-- Also fix the students policy to avoid recursion
DROP POLICY IF EXISTS "Teachers can manage class students" ON public.students;

CREATE OR REPLACE FUNCTION public.get_teacher_class_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM public.classes WHERE teacher_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "Teachers can manage class students"
ON public.students FOR ALL
USING (class_id IN (SELECT public.get_teacher_class_ids(auth.uid())));

-- ============================================================================
-- FIX: ADD MISSING COLUMNS
-- ============================================================================

-- Add student_id to sister_app_sync_log for student activity tracking
ALTER TABLE public.sister_app_sync_log
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS action TEXT,
ADD COLUMN IF NOT EXISTS data JSONB,
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sync_log_student ON public.sister_app_sync_log(student_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_processed ON public.sister_app_sync_log(processed);

-- Add decision column to interpretation_verifications
ALTER TABLE public.interpretation_verifications
ADD COLUMN IF NOT EXISTS decision TEXT;

-- Add topic_name to lesson_plans (or use existing topic column via alias)
ALTER TABLE public.lesson_plans
ADD COLUMN IF NOT EXISTS topic_name TEXT,
ADD COLUMN IF NOT EXISTS standard TEXT;

-- ============================================================================
-- FIX: ADD FOREIGN KEY FOR SISTER_APP_SYNC_LOG -> STUDENTS
-- ============================================================================

-- This allows the PostgREST join query to work
-- The FK was added above, but we need to ensure the relationship is discoverable

-- ============================================================================
-- UPDATE FERPA AUDIT LOG
-- ============================================================================

-- Add teacher_id column for easier querying
ALTER TABLE public.ferpa_audit_log
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add user_agent column if not exists
ALTER TABLE public.ferpa_audit_log
ADD COLUMN IF NOT EXISTS user_agent TEXT;
