-- Add grade floor setting to settings table
ALTER TABLE public.settings 
ADD COLUMN grade_floor integer DEFAULT 55 CHECK (grade_floor >= 0 AND grade_floor <= 100);

-- Add grade floor for work showing effort (the "understanding" threshold)
ALTER TABLE public.settings 
ADD COLUMN grade_floor_with_effort integer DEFAULT 65 CHECK (grade_floor_with_effort >= 0 AND grade_floor_with_effort <= 100);