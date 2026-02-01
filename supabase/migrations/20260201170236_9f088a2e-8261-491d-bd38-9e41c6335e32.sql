-- Add archived_at column to classes for archiving functionality
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for filtering archived vs active classes
CREATE INDEX IF NOT EXISTS idx_classes_archived_at ON public.classes(archived_at);

-- Add comment
COMMENT ON COLUMN public.classes.archived_at IS 'Timestamp when class was archived. NULL means active.';