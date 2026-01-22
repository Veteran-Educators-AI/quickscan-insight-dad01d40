-- ============================================================================
-- SECURITY & COMPLIANCE MIGRATION
-- FERPA audit logging, MFA, and security policy hardening
-- Consolidated from: 20260108112057, 20260108123553, 20260108234254, 20260108225636
-- ============================================================================

-- ============================================================================
-- FERPA AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE public.ferpa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE public.ferpa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own audit logs"
ON public.ferpa_audit_log
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own audit logs"
ON public.ferpa_audit_log
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE INDEX idx_ferpa_audit_log_teacher_id ON public.ferpa_audit_log(teacher_id);
CREATE INDEX idx_ferpa_audit_log_created_at ON public.ferpa_audit_log(created_at DESC);

-- ============================================================================
-- MFA RECOVERY CODES TABLE
-- ============================================================================

CREATE TABLE public.mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recovery code status"
ON public.mfa_recovery_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recovery codes"
ON public.mfa_recovery_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery codes"
ON public.mfa_recovery_codes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recovery codes"
ON public.mfa_recovery_codes
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_mfa_recovery_codes_user_id ON public.mfa_recovery_codes(user_id);

-- ============================================================================
-- SECURITY HARDENING - AUTHENTICATED STUDENT ACCESS POLICIES
-- Replaces insecure public read policies with authenticated-only access
-- ============================================================================

-- Students can view their own attempts (authenticated only)
CREATE POLICY "Students can view their own attempts"
ON public.attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM students
    WHERE students.id = attempts.student_id
    AND students.user_id = auth.uid()
  )
);
