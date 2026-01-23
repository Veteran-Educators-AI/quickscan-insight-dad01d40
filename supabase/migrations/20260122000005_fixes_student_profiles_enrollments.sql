-- ============================================================================
-- CONSOLIDATED MIGRATION: Fixes, Student Profiles, and Enrollments
-- Combines schema fixes, student app tables, and enrollment system
-- ============================================================================

-- ============================================================================
-- PART 1: SCHEMA FIXES AND RLS POLICY RECURSION
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
-- PART 1B: ADD MISSING COLUMNS
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

-- Add topic_name to lesson_plans
ALTER TABLE public.lesson_plans
ADD COLUMN IF NOT EXISTS topic_name TEXT,
ADD COLUMN IF NOT EXISTS standard TEXT;

-- Add teacher_id column to FERPA audit log for easier querying
ALTER TABLE public.ferpa_audit_log
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add user_agent column if not exists
ALTER TABLE public.ferpa_audit_log
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ============================================================================
-- PART 2: STUDENT PROFILES TABLE (for Scholar App)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade_level INTEGER,
  math_level TEXT,
  reading_level TEXT,
  strengths TEXT[],
  accommodations TEXT[],
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  streak_shield_available BOOLEAN NOT NULL DEFAULT false,
  skill_tags TEXT[],
  weaknesses TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_grade ON public.student_profiles(grade_level);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own profile"
ON public.student_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Students can update own profile"
ON public.student_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can insert own profile"
ON public.student_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view student profiles"
ON public.student_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('teacher', 'admin')
  )
);

CREATE POLICY "Parents can view linked student profiles"
ON public.student_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.parent_profiles pp ON pp.id = psl.parent_id
    JOIN public.students s ON s.id = psl.student_id
    WHERE pp.user_id = auth.uid()
    AND s.user_id = student_profiles.user_id
  )
);

-- Auto-create student_profile when student user is created
CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'student' THEN
    INSERT INTO public.student_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_student
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_student();

CREATE TRIGGER update_student_profiles_updated_at
BEFORE UPDATE ON public.student_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill existing students
INSERT INTO public.student_profiles (user_id)
SELECT p.id
FROM public.profiles p
WHERE p.role = 'student'
AND NOT EXISTS (
  SELECT 1 FROM public.student_profiles sp WHERE sp.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- PART 2B: CLASS BROWSING FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.browse_classes(
  p_search TEXT DEFAULT '',
  p_subject TEXT DEFAULT NULL,
  p_grade_band TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  subject TEXT,
  grade_level INTEGER,
  grade_band TEXT,
  teacher_name TEXT,
  student_count BIGINT
) AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.subject,
    NULL::INTEGER as grade_level,
    CASE
      WHEN c.subject ILIKE '%6%' OR c.subject ILIKE '%7%' OR c.subject ILIKE '%8%' THEN '6-8'
      WHEN c.subject ILIKE '%9%' OR c.subject ILIKE '%10%' THEN '9-10'
      WHEN c.subject ILIKE '%11%' OR c.subject ILIKE '%12%' THEN '11-12'
      ELSE NULL
    END as grade_band,
    COALESCE(p.full_name, 'Unknown Teacher') as teacher_name,
    COALESCE(
      (SELECT COUNT(*) FROM public.students s WHERE s.class_id = c.id),
      0
    ) as student_count
  FROM public.classes c
  LEFT JOIN public.profiles p ON p.id = c.teacher_id
  WHERE c.is_active = true
    AND (p_search = '' OR c.name ILIKE '%' || p_search || '%' OR c.subject ILIKE '%' || p_search || '%')
    AND (p_subject IS NULL OR c.subject = p_subject)
    AND (
      p_grade_band IS NULL
      OR (p_grade_band = '6-8' AND (c.subject ILIKE '%6%' OR c.subject ILIKE '%7%' OR c.subject ILIKE '%8%'))
      OR (p_grade_band = '9-10' AND (c.subject ILIKE '%9%' OR c.subject ILIKE '%10%'))
      OR (p_grade_band = '11-12' AND (c.subject ILIKE '%11%' OR c.subject ILIKE '%12%'))
    )
  ORDER BY c.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.browse_classes_count(
  p_search TEXT DEFAULT '',
  p_subject TEXT DEFAULT NULL,
  p_grade_band TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.classes c
    WHERE c.is_active = true
      AND (p_search = '' OR c.name ILIKE '%' || p_search || '%' OR c.subject ILIKE '%' || p_search || '%')
      AND (p_subject IS NULL OR c.subject = p_subject)
      AND (
        p_grade_band IS NULL
        OR (p_grade_band = '6-8' AND (c.subject ILIKE '%6%' OR c.subject ILIKE '%7%' OR c.subject ILIKE '%8%'))
        OR (p_grade_band = '9-10' AND (c.subject ILIKE '%9%' OR c.subject ILIKE '%10%'))
        OR (p_grade_band = '11-12' AND (c.subject ILIKE '%11%' OR c.subject ILIKE '%12%'))
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- PART 3: ENROLLMENTS TABLE
-- Bridges the student app (where students self-enroll) with the teacher app
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'removed')),
  UNIQUE(student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3B: ENROLLMENTS RLS POLICIES
-- ============================================================================

CREATE POLICY "Students can view own enrollments"
ON public.enrollments FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own enrollments"
ON public.enrollments FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can delete own enrollments"
ON public.enrollments FOR DELETE
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view class enrollments"
ON public.enrollments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = enrollments.class_id
    AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can manage class enrollments"
ON public.enrollments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = enrollments.class_id
    AND c.teacher_id = auth.uid()
  )
);

-- Allow authenticated users (students) to view active classes for browsing
CREATE POLICY "Authenticated users can browse active classes"
ON public.classes FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================================================
-- PART 3C: ENROLLMENT FUNCTIONS
-- ============================================================================

-- Get enrolled students for a class (for teachers)
CREATE OR REPLACE FUNCTION public.get_class_enrolled_students(p_class_id UUID)
RETURNS TABLE (
  enrollment_id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  enrolled_at TIMESTAMPTZ,
  status TEXT,
  xp INTEGER,
  coins INTEGER,
  current_streak INTEGER,
  grade_level INTEGER
) AS $$
BEGIN
  -- Verify the caller is the teacher of this class
  IF NOT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this class';
  END IF;

  RETURN QUERY
  SELECT
    e.id as enrollment_id,
    e.student_id as user_id,
    p.email,
    p.full_name,
    e.enrolled_at,
    e.status,
    COALESCE(sp.xp, 0) as xp,
    COALESCE(sp.coins, 0) as coins,
    COALESCE(sp.current_streak, 0) as current_streak,
    sp.grade_level
  FROM public.enrollments e
  JOIN public.profiles p ON p.id = e.student_id
  LEFT JOIN public.student_profiles sp ON sp.user_id = e.student_id
  WHERE e.class_id = p_class_id
  ORDER BY p.full_name, p.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Sync enrollment to students table (creates teacher-manageable record)
CREATE OR REPLACE FUNCTION public.sync_enrollment_to_students()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_name_parts TEXT[];
BEGIN
  -- Get the user's profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = NEW.student_id;

  IF v_profile IS NOT NULL THEN
    -- Split full_name into first and last name
    v_name_parts := string_to_array(COALESCE(v_profile.full_name, v_profile.email), ' ');

    -- Insert into students table if not exists
    INSERT INTO public.students (
      user_id,
      class_id,
      first_name,
      last_name
    ) VALUES (
      NEW.student_id,
      NEW.class_id,
      COALESCE(v_name_parts[1], 'Student'),
      COALESCE(v_name_parts[2], '')
    )
    ON CONFLICT (user_id, class_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add unique constraint on students table for user_id + class_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_user_class_unique'
  ) THEN
    ALTER TABLE public.students ADD CONSTRAINT students_user_class_unique UNIQUE (user_id, class_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create trigger to sync enrollments to students table
DROP TRIGGER IF EXISTS sync_enrollment_to_students_trigger ON public.enrollments;
CREATE TRIGGER sync_enrollment_to_students_trigger
AFTER INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.sync_enrollment_to_students();

-- Enroll student in class by code
CREATE OR REPLACE FUNCTION public.enroll_with_class_code(p_class_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_class RECORD;
  v_enrollment_id UUID;
BEGIN
  -- Find the class by code
  SELECT * INTO v_class FROM public.classes
  WHERE class_code = p_class_code AND is_active = true;

  IF v_class IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or inactive class code');
  END IF;

  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE student_id = auth.uid() AND class_id = v_class.id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already enrolled in this class');
  END IF;

  -- Create enrollment
  INSERT INTO public.enrollments (student_id, class_id)
  VALUES (auth.uid(), v_class.id)
  RETURNING id INTO v_enrollment_id;

  RETURN json_build_object(
    'success', true,
    'enrollment_id', v_enrollment_id,
    'class_id', v_class.id,
    'class_name', v_class.name,
    'subject', v_class.subject
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get student's enrolled classes
CREATE OR REPLACE FUNCTION public.get_my_enrolled_classes()
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  subject TEXT,
  teacher_name TEXT,
  enrolled_at TIMESTAMPTZ,
  student_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as class_id,
    c.name as class_name,
    c.subject,
    COALESCE(p.full_name, 'Teacher') as teacher_name,
    e.enrolled_at,
    (SELECT COUNT(*) FROM public.enrollments WHERE class_id = c.id AND status = 'active') as student_count
  FROM public.enrollments e
  JOIN public.classes c ON c.id = e.class_id
  LEFT JOIN public.profiles p ON p.id = c.teacher_id
  WHERE e.student_id = auth.uid()
  AND e.status = 'active'
  AND c.is_active = true
  ORDER BY e.enrolled_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- PART 3D: PROFILE VISIBILITY NOTE
-- ============================================================================
-- The "Authenticated users can view all profiles" policy in migration 002
-- already allows all authenticated users to view profiles, so no additional
-- policy is needed here. Adding a policy that queries profiles would cause
-- infinite recursion.
