-- ============================================================================
-- STUDENT EXPERIENCE MIGRATION
-- Result comments, student dashboard functions, class joining, student policies
-- Consolidated from: 20260108033601, 20260114160433, 20260114160845
-- ============================================================================

-- ============================================================================
-- RESULT COMMENTS TABLE
-- ============================================================================

CREATE TABLE public.result_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('student', 'teacher')),
  author_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.result_comments ENABLE ROW LEVEL SECURITY;

-- Allow public read for viewing comments on results
CREATE POLICY "Anyone can view result comments"
ON public.result_comments
FOR SELECT
USING (true);

-- Teachers can manage comments for their students
CREATE POLICY "Teachers can manage comments for their students"
ON public.result_comments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM attempts
    JOIN students ON attempts.student_id = students.id
    JOIN classes ON students.class_id = classes.id
    WHERE attempts.id = result_comments.attempt_id
    AND classes.teacher_id = auth.uid()
  )
);

-- Authenticated teachers can add comments to their students attempts
CREATE POLICY "Teachers can add comments to their students attempts"
ON public.result_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_type = 'teacher' AND
  EXISTS (
    SELECT 1
    FROM attempts
    JOIN students ON attempts.student_id = students.id
    JOIN classes ON students.class_id = classes.id
    WHERE attempts.id = result_comments.attempt_id
    AND classes.teacher_id = auth.uid()
  )
);

-- Authenticated students can add comments to their own attempts
CREATE POLICY "Students can add comments to their own attempts"
ON public.result_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_type = 'student' AND
  EXISTS (
    SELECT 1
    FROM attempts
    JOIN students ON attempts.student_id = students.id
    WHERE attempts.id = result_comments.attempt_id
    AND students.user_id = auth.uid()
  )
);

CREATE INDEX idx_result_comments_attempt_id ON public.result_comments(attempt_id);
CREATE INDEX idx_result_comments_is_read ON public.result_comments(is_read) WHERE is_read = false;

-- ============================================================================
-- SECURITY DEFINER FUNCTION - is_student_in_class
-- Breaks infinite recursion between classes and students RLS policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_student_in_class(p_class_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students
    WHERE class_id = p_class_id
      AND user_id = p_user_id
  )
$$;

-- ============================================================================
-- STUDENT CLASS JOINING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_class_with_code(
  p_join_code TEXT,
  p_user_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id UUID;
  v_class_name TEXT;
  v_student_id UUID;
  v_student_name TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find the class by join code
  SELECT id, name INTO v_class_id, v_class_name
  FROM classes
  WHERE join_code = UPPER(TRIM(p_join_code));

  IF v_class_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid class code. Please check and try again.');
  END IF;

  -- Check if student is already linked to a class with this user_id
  SELECT id INTO v_student_id
  FROM students
  WHERE user_id = v_user_id;

  IF v_student_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You are already enrolled in a class.');
  END IF;

  -- Try to find a matching student by email in this class
  SELECT id, first_name || ' ' || last_name INTO v_student_id, v_student_name
  FROM students
  WHERE class_id = v_class_id
    AND LOWER(TRIM(email)) = LOWER(TRIM(p_user_email))
    AND user_id IS NULL;

  IF v_student_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No matching student found in this class. Please contact your teacher to add you to the roster with email: ' || p_user_email
    );
  END IF;

  -- Link the student to the user
  UPDATE students
  SET user_id = v_user_id, updated_at = now()
  WHERE id = v_student_id;

  -- Update profile role to student
  UPDATE profiles
  SET role = 'student', updated_at = now()
  WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'student_id', v_student_id,
    'student_name', v_student_name,
    'class_id', v_class_id,
    'class_name', v_class_name
  );
END;
$$;

-- ============================================================================
-- STUDENT DASHBOARD FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_student_dashboard(p_student_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_class_id UUID;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();

  -- Verify the student belongs to the current user
  SELECT class_id INTO v_class_id
  FROM students
  WHERE id = p_student_id AND user_id = v_user_id;

  IF v_class_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get assignments for this class
  SELECT json_build_object(
    'success', true,
    'assignments', (
      SELECT COALESCE(json_agg(a ORDER BY a.created_at DESC), '[]'::json)
      FROM (
        SELECT id, title, description, xp_reward, coin_reward, due_at, status, created_at
        FROM shared_assignments
        WHERE class_id = v_class_id AND status = 'active'
      ) a
    ),
    'grades', (
      SELECT COALESCE(json_agg(g ORDER BY g.created_at DESC), '[]'::json)
      FROM (
        SELECT gh.id, gh.topic_name, gh.grade, gh.regents_score, gh.created_at, gh.grade_justification
        FROM grade_history gh
        WHERE gh.student_id = p_student_id
      ) g
    ),
    'class', (
      SELECT json_build_object('id', c.id, 'name', c.name, 'teacher_name', p.full_name)
      FROM classes c
      LEFT JOIN profiles p ON c.teacher_id = p.id
      WHERE c.id = v_class_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- STUDENT RLS POLICIES
-- ============================================================================

-- Students can view their own student record
CREATE POLICY "Students can view their own student record"
ON public.students
FOR SELECT
USING (user_id = auth.uid());

-- Students can view their class (uses security definer function to avoid recursion)
DROP POLICY IF EXISTS "Students can view their class" ON public.classes;
CREATE POLICY "Students can view their class"
ON public.classes
FOR SELECT
USING (
  auth.uid() = teacher_id OR public.is_student_in_class(id, auth.uid())
);

-- Students can view their own grades
CREATE POLICY "Students can view their own grades"
ON public.grade_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = grade_history.student_id
    AND s.user_id = auth.uid()
  )
);
