-- Create table to track student submission attendance/absence for assignments
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

-- Enable RLS
ALTER TABLE public.assignment_attendance ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own attendance records
CREATE POLICY "Teachers can view their own attendance records"
  ON public.assignment_attendance FOR SELECT
  USING (auth.uid() = teacher_id);

-- Teachers can create attendance records
CREATE POLICY "Teachers can create attendance records"
  ON public.assignment_attendance FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own attendance records
CREATE POLICY "Teachers can update their own attendance records"
  ON public.assignment_attendance FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Teachers can delete their own attendance records
CREATE POLICY "Teachers can delete their own attendance records"
  ON public.assignment_attendance FOR DELETE
  USING (auth.uid() = teacher_id);

-- Create index for faster lookups
CREATE INDEX idx_assignment_attendance_teacher ON public.assignment_attendance(teacher_id);
CREATE INDEX idx_assignment_attendance_student ON public.assignment_attendance(student_id);
CREATE INDEX idx_assignment_attendance_class ON public.assignment_attendance(class_id);
CREATE INDEX idx_assignment_attendance_assignment ON public.assignment_attendance(assignment_name);

-- Add trigger for updated_at
CREATE TRIGGER update_assignment_attendance_updated_at
  BEFORE UPDATE ON public.assignment_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();