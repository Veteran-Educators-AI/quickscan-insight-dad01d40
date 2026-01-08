-- Create a table for result comments/questions between students and teachers
CREATE TABLE public.result_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('student', 'teacher')),
  author_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.result_comments ENABLE ROW LEVEL SECURITY;

-- Allow public insert for students (they don't have accounts)
CREATE POLICY "Anyone can add comments to results"
ON public.result_comments
FOR INSERT
WITH CHECK (author_type = 'student');

-- Allow public read for viewing comments on results
CREATE POLICY "Anyone can view result comments"
ON public.result_comments
FOR SELECT
USING (true);

-- Allow teachers to add responses and manage comments
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

-- Create index for faster lookups
CREATE INDEX idx_result_comments_attempt_id ON public.result_comments(attempt_id);
CREATE INDEX idx_result_comments_is_read ON public.result_comments(is_read) WHERE is_read = false;