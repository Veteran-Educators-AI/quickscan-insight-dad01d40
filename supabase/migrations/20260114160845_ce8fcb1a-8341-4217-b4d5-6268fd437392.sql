-- Create a security definer function to check if a user is a student in a class
-- This breaks the infinite recursion between classes and students RLS policies
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

-- Drop the old problematic policy
DROP POLICY IF EXISTS "Students can view their class" ON public.classes;

-- Create a new policy using the security definer function
CREATE POLICY "Students can view their class"
ON public.classes
FOR SELECT
USING (
  auth.uid() = teacher_id OR public.is_student_in_class(id, auth.uid())
);