-- Add Regents score fields to grade_history table
ALTER TABLE public.grade_history 
ADD COLUMN IF NOT EXISTS regents_score integer,
ADD COLUMN IF NOT EXISTS nys_standard text,
ADD COLUMN IF NOT EXISTS regents_justification text;

-- Add constraint for valid regents scores (0-4)
ALTER TABLE public.grade_history 
ADD CONSTRAINT grade_history_regents_score_check 
CHECK (regents_score IS NULL OR (regents_score >= 0 AND regents_score <= 4));

-- Create an index for efficient standard-based queries
CREATE INDEX IF NOT EXISTS idx_grade_history_nys_standard ON public.grade_history(nys_standard);
CREATE INDEX IF NOT EXISTS idx_grade_history_regents_score ON public.grade_history(regents_score);