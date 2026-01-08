-- Add custom_pseudonym column to students table for teacher-assigned pseudonyms
ALTER TABLE public.students 
ADD COLUMN custom_pseudonym TEXT DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.students.custom_pseudonym IS 'Teacher-assigned pseudonym override for FERPA compliance';