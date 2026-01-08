-- Drop the insecure public read policy on attempts
DROP POLICY IF EXISTS "Allow public read access to attempts for student results" ON public.attempts;

-- Create policy for students to view their own attempts (teacher policy already exists)
CREATE POLICY "Students can view their own attempts"
ON public.attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM students
    WHERE students.id = attempts.student_id
    AND students.user_id = auth.uid()
  )
);