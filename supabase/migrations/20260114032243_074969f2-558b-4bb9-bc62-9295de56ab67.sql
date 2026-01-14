-- Add UPDATE policy for grade_history table
CREATE POLICY "Teachers can update their grade history" 
ON public.grade_history 
FOR UPDATE 
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);