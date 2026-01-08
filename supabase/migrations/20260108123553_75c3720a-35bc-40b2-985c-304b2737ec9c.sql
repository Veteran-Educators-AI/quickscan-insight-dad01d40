-- Create table for MFA recovery codes
CREATE TABLE public.mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can only view their own recovery codes (but not the hashes)
CREATE POLICY "Users can view their own recovery code status"
ON public.mfa_recovery_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own recovery codes
CREATE POLICY "Users can insert their own recovery codes"
ON public.mfa_recovery_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update (mark as used) their own recovery codes
CREATE POLICY "Users can update their own recovery codes"
ON public.mfa_recovery_codes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own recovery codes (for regeneration)
CREATE POLICY "Users can delete their own recovery codes"
ON public.mfa_recovery_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_mfa_recovery_codes_user_id ON public.mfa_recovery_codes(user_id);