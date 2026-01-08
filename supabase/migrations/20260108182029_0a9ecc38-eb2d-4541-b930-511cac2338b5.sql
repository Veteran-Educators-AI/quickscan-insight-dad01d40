-- Create grade_history table to track student grades over time
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_grade_history_student_topic ON public.grade_history(student_id, topic_id);
CREATE INDEX idx_grade_history_teacher ON public.grade_history(teacher_id);
CREATE INDEX idx_grade_history_created_at ON public.grade_history(created_at);

-- Enable Row Level Security
ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

-- Teachers can view grade history for their students
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

-- Teachers can insert grade history for their students
CREATE POLICY "Teachers can insert grade history"
ON public.grade_history
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can delete grade history they created
CREATE POLICY "Teachers can delete their grade history"
ON public.grade_history
FOR DELETE
USING (auth.uid() = teacher_id);