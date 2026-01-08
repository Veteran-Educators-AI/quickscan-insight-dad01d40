-- Create audit log table for FERPA compliance tracking
CREATE TABLE public.ferpa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.ferpa_audit_log ENABLE ROW LEVEL SECURITY;

-- Teachers can only view their own audit logs
CREATE POLICY "Teachers can view their own audit logs"
ON public.ferpa_audit_log
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can insert their own audit logs
CREATE POLICY "Teachers can insert their own audit logs"
ON public.ferpa_audit_log
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Create index for faster queries
CREATE INDEX idx_ferpa_audit_log_teacher_id ON public.ferpa_audit_log(teacher_id);
CREATE INDEX idx_ferpa_audit_log_created_at ON public.ferpa_audit_log(created_at DESC);