-- ============================================================================
-- INTEGRATIONS MIGRATION
-- Sister app sync, webhooks, API keys, shared assignments
-- Consolidated from: 20260109153812, 20260112003205, 20260112003427, 20260114012553,
--                    20260114151951, 20260116014845
-- ============================================================================

-- ============================================================================
-- INTEGRATION SETTINGS
-- ============================================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS integration_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS integration_webhook_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS integration_webhook_api_key TEXT,
ADD COLUMN IF NOT EXISTS sister_app_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sister_app_xp_multiplier NUMERIC DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS sister_app_coin_multiplier NUMERIC DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS auto_push_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_push_threshold INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS auto_push_regents_threshold INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS auto_push_worksheet_count INTEGER DEFAULT 3;

COMMENT ON COLUMN public.settings.auto_push_enabled IS 'Enable automatic push of remediation worksheets to sister app';
COMMENT ON COLUMN public.settings.auto_push_threshold IS 'Grade threshold below which to auto-push (0-100)';
COMMENT ON COLUMN public.settings.auto_push_regents_threshold IS 'Regents score threshold below which to auto-push (0-4)';
COMMENT ON COLUMN public.settings.auto_push_worksheet_count IS 'Number of worksheets to auto-push per student';

-- ============================================================================
-- TEACHER API KEYS TABLE
-- ============================================================================

CREATE TABLE public.teacher_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Sister App Key',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(teacher_id, name)
);

ALTER TABLE public.teacher_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own API keys"
ON public.teacher_api_keys
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own API keys"
ON public.teacher_api_keys
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own API keys"
ON public.teacher_api_keys
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own API keys"
ON public.teacher_api_keys
FOR DELETE
USING (auth.uid() = teacher_id);

-- ============================================================================
-- SISTER APP SYNC LOG TABLE
-- ============================================================================

CREATE TABLE public.sister_app_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  source_app TEXT NOT NULL DEFAULT 'sister_app',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.sister_app_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own sync logs"
ON public.sister_app_sync_log
FOR SELECT
USING (auth.uid() = teacher_id);

-- ============================================================================
-- SHARED ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE public.shared_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  worksheet_id UUID REFERENCES public.worksheets(id) ON DELETE SET NULL,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  coin_reward INTEGER NOT NULL DEFAULT 25,
  due_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  source_app TEXT NOT NULL DEFAULT 'nyclogic_ai',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can create shared assignments"
ON public.shared_assignments
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their own shared assignments"
ON public.shared_assignments
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own shared assignments"
ON public.shared_assignments
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own shared assignments"
ON public.shared_assignments
FOR DELETE
USING (auth.uid() = teacher_id);

-- Students can view assignments for their class
CREATE POLICY "Students can view class assignments"
ON public.shared_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.class_id = shared_assignments.class_id
    AND s.user_id = auth.uid()
  )
);

CREATE INDEX idx_shared_assignments_class ON public.shared_assignments(class_id);
CREATE INDEX idx_shared_assignments_teacher ON public.shared_assignments(teacher_id);
CREATE INDEX idx_shared_assignments_status ON public.shared_assignments(status);

CREATE TRIGGER update_shared_assignments_updated_at
BEFORE UPDATE ON public.shared_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
