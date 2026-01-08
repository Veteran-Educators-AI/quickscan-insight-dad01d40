-- Drop the insecure INSERT policy that allows anyone to impersonate students
DROP POLICY IF EXISTS "Anyone can add comments to results" ON public.result_comments;

-- Create policy for authenticated teachers to add comments to their students' attempts
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

-- Create policy for authenticated students to add comments to their own attempts
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