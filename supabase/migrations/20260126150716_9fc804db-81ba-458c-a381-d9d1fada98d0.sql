-- Create table for student magic link tokens
CREATE TABLE public.student_magic_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast token lookups
CREATE INDEX idx_student_magic_links_token ON public.student_magic_links(token);

-- Index for cleanup of expired tokens
CREATE INDEX idx_student_magic_links_expires ON public.student_magic_links(expires_at);

-- RLS (service role only - these are managed by edge functions)
ALTER TABLE public.student_magic_links ENABLE ROW LEVEL SECURITY;

-- No user-facing policies needed - only service role accesses this table