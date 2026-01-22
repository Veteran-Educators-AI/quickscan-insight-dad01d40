-- ============================================================================
-- NOTIFICATIONS & SETTINGS MIGRATION
-- Parent notifications, grade floors, Regents alerts, QR settings, beta feedback
-- Consolidated from: 20260107231823, 20260107234731, 20260113042854, 20260113053319,
--                    20260113105646, 20260118184707
-- ============================================================================

-- ============================================================================
-- AI DETECTION SETTINGS
-- ============================================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS ai_detection_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_detection_threshold INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS ai_auto_reject_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS level_drop_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS level_a_notifications BOOLEAN DEFAULT true;

-- ============================================================================
-- PARENT NOTIFICATION SETTINGS
-- ============================================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS parent_ai_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS low_regents_parent_alerts_enabled BOOLEAN DEFAULT true;

-- ============================================================================
-- LOW REGENTS ALERT SETTINGS
-- ============================================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS low_regents_alerts_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS low_regents_threshold INTEGER DEFAULT 2;

-- ============================================================================
-- GRADE FLOOR SETTINGS
-- ============================================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS grade_floor INTEGER DEFAULT 55 CHECK (grade_floor >= 0 AND grade_floor <= 100),
ADD COLUMN IF NOT EXISTS grade_floor_with_effort INTEGER DEFAULT 65 CHECK (grade_floor_with_effort >= 0 AND grade_floor_with_effort <= 100);

-- ============================================================================
-- QR CODE SCANNING SETTINGS
-- ============================================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS auto_qr_scan_enabled BOOLEAN DEFAULT true;

-- ============================================================================
-- HANDWRITING GROUPING SETTINGS
-- ============================================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS auto_handwriting_grouping_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS grade_curve_percent INTEGER DEFAULT 0;

-- ============================================================================
-- BETA FEEDBACK TABLE
-- ============================================================================

CREATE TABLE public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('feature_request', 'bug_report', 'general')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (even anonymous users)
CREATE POLICY "Anyone can submit feedback"
ON public.beta_feedback
FOR INSERT
WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.beta_feedback
FOR SELECT
USING (auth.uid() = user_id);

CREATE TRIGGER update_beta_feedback_updated_at
BEFORE UPDATE ON public.beta_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
