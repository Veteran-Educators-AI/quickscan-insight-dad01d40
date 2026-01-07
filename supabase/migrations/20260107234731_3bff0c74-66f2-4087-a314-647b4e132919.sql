-- Add parent_email column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_email TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.students.parent_email IS 'Parent/guardian email for notifications';