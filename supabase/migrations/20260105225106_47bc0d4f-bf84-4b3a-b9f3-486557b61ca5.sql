-- Add sharing columns to worksheets
ALTER TABLE public.worksheets 
ADD COLUMN share_code TEXT UNIQUE,
ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster lookups by share_code
CREATE INDEX idx_worksheets_share_code ON public.worksheets(share_code) WHERE share_code IS NOT NULL;

-- Allow anyone to view shared worksheets (by share_code)
CREATE POLICY "Anyone can view shared worksheets"
ON public.worksheets
FOR SELECT
USING (is_shared = true AND share_code IS NOT NULL);