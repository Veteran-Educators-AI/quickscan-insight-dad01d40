-- ============================================================================
-- COMPREHENSIVE SCHEMA FIX MIGRATION
-- ============================================================================
-- This migration aligns the database schema with what the application code
-- actually expects. The original schema migrations drifted significantly from
-- the code over time through manual dashboard changes that were never captured
-- in migration files. This migration is fully idempotent (safe to re-run).
-- ============================================================================

-- ============================================================================
-- 1. FIX: teacher_api_keys - add api_key_hash column alias
-- ============================================================================
-- The receive-sister-app-data edge function queries .eq('api_key_hash', ...)
-- but the original schema only defined 'key_hash'. Add the correct column.
-- ============================================================================
ALTER TABLE public.teacher_api_keys
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT;

-- Copy existing key_hash values into api_key_hash if api_key_hash is empty
UPDATE public.teacher_api_keys
SET api_key_hash = key_hash
WHERE api_key_hash IS NULL AND key_hash IS NOT NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.teacher_api_keys(api_key_hash);

-- ============================================================================
-- 2. FIX: sister_app_sync_log - make original NOT NULL columns nullable
--    and add missing columns that the code references
-- ============================================================================
-- The original schema had sync_type NOT NULL and direction NOT NULL,
-- but the edge functions insert records without providing these fields.
-- Also add source_app and processed_at which the code uses.
-- ============================================================================

-- Make sync_type and direction nullable (code doesn't always provide them)
ALTER TABLE public.sister_app_sync_log
  ALTER COLUMN sync_type DROP NOT NULL;

ALTER TABLE public.sister_app_sync_log
  ALTER COLUMN direction DROP NOT NULL;

-- Add missing columns that edge functions reference
ALTER TABLE public.sister_app_sync_log
  ADD COLUMN IF NOT EXISTS source_app TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- ============================================================================
-- 3. FIX: grade_history - restructure from score-change-log to grade record
-- ============================================================================
-- The code uses grade_history as a per-student grade record table, but the
-- original schema defined it as a score-change audit log (score_id, previous_score, etc.)
-- Add all the columns the code expects.
-- ============================================================================

-- Make score_id nullable since the new usage doesn't always have one
ALTER TABLE public.grade_history
  ALTER COLUMN score_id DROP NOT NULL;

-- Add columns that the code inserts/queries
ALTER TABLE public.grade_history
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic_name TEXT,
  ADD COLUMN IF NOT EXISTS grade DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS grade_justification TEXT,
  ADD COLUMN IF NOT EXISTS raw_score_earned DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS raw_score_possible DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS attempt_id UUID,
  ADD COLUMN IF NOT EXISTS regents_score DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS nys_standard TEXT,
  ADD COLUMN IF NOT EXISTS regents_justification TEXT;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_grade_history_student ON public.grade_history(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_teacher ON public.grade_history(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_topic ON public.grade_history(topic_name);
CREATE INDEX IF NOT EXISTS idx_grade_history_created ON public.grade_history(created_at);

-- ============================================================================
-- 4. FIX: analysis_misconceptions - restructure for student-level tracking
-- ============================================================================
-- The code uses analysis_misconceptions to store per-student misconceptions
-- with severity, remedies, and links to grade history. The original schema
-- was a simple frequency counter with topic_id and misconception_pattern.
-- ============================================================================

-- Add columns the code expects
ALTER TABLE public.analysis_misconceptions
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS attempt_id UUID,
  ADD COLUMN IF NOT EXISTS grade_history_id UUID,
  ADD COLUMN IF NOT EXISTS topic_name TEXT,
  ADD COLUMN IF NOT EXISTS misconception_text TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS suggested_remedies TEXT[],
  ADD COLUMN IF NOT EXISTS grade_impact DECIMAL(5,2);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_misconceptions_student ON public.analysis_misconceptions(student_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_teacher ON public.analysis_misconceptions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_topic_name ON public.analysis_misconceptions(topic_name);

-- ============================================================================
-- 5. FIX: attempts table - add columns the code references
-- ============================================================================
-- The code uses question_id (not just assessment_id), a status of 'analyzed'
-- and 'verified', and stores answers as JSONB.
-- ============================================================================

-- Add missing columns
ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS question_id UUID,
  ADD COLUMN IF NOT EXISTS answers JSONB,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS score DECIMAL(5,2);

-- Make assessment_id nullable since some attempts use question_id instead
ALTER TABLE public.attempts
  ALTER COLUMN assessment_id DROP NOT NULL;

-- Add status values to the enum (analyzed, verified)
-- We need to check if these exist first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'attempt_status' AND e.enumlabel = 'analyzed'
  ) THEN
    ALTER TYPE public.attempt_status ADD VALUE 'analyzed';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'attempt_status' AND e.enumlabel = 'verified'
  ) THEN
    ALTER TYPE public.attempt_status ADD VALUE 'verified';
  END IF;
END$$;

-- Create index for question_id lookups
CREATE INDEX IF NOT EXISTS idx_attempts_question ON public.attempts(question_id);

-- ============================================================================
-- 6. FIX: attempt_images table - create if not exists
-- ============================================================================
-- The code references attempt_images for storing OCR text and image URLs
-- but this table was never defined in the original schema.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attempt_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  ocr_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempt_images_attempt ON public.attempt_images(attempt_id);

-- ============================================================================
-- 7. FIX: scores table - add columns the code references
-- ============================================================================
-- Code uses points_earned, notes, is_auto_scored, teacher_override
-- Original schema had score, points_possible, feedback, ai_interpretation
-- ============================================================================
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS points_earned DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_auto_scored BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_override BOOLEAN DEFAULT false;

-- Make the original NOT NULL columns nullable for new insert patterns
ALTER TABLE public.scores
  ALTER COLUMN attempt_id DROP NOT NULL,
  ALTER COLUMN question_id DROP NOT NULL,
  ALTER COLUMN student_id DROP NOT NULL;

-- ============================================================================
-- 8. FIX: settings table - restructure from key-value to flat columns
-- ============================================================================
-- The code queries specific column names like 'sister_app_sync_enabled',
-- 'integration_webhook_url', 'grade_floor', etc. The original schema was
-- a key-value store with setting_key/setting_value. Add all needed columns.
-- ============================================================================

-- Make original NOT NULL columns nullable for new usage pattern
ALTER TABLE public.settings
  ALTER COLUMN setting_key DROP NOT NULL;

-- Drop the unique constraint on (teacher_id, setting_key) since we're moving to flat columns
-- This is safe since the new pattern uses one row per teacher
ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_teacher_id_setting_key_key;

-- Add flat setting columns
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS sister_app_sync_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sister_app_xp_multiplier DECIMAL(5,2) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS sister_app_coin_multiplier DECIMAL(5,2) DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS integration_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS integration_webhook_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS integration_webhook_api_key TEXT,
  ADD COLUMN IF NOT EXISTS grade_floor INTEGER DEFAULT 55,
  ADD COLUMN IF NOT EXISTS grade_floor_with_effort INTEGER DEFAULT 65,
  ADD COLUMN IF NOT EXISTS ai_feedback_verbosity TEXT DEFAULT 'concise',
  ADD COLUMN IF NOT EXISTS ai_training_mode TEXT DEFAULT 'learning',
  ADD COLUMN IF NOT EXISTS analysis_provider TEXT DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS low_regents_alerts_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS low_regents_threshold INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS low_regents_parent_alerts_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS blank_page_auto_score BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS blank_page_score INTEGER DEFAULT 55,
  ADD COLUMN IF NOT EXISTS blank_page_comment TEXT DEFAULT 'No work shown on this page; score assigned per no-response policy.',
  ADD COLUMN IF NOT EXISTS qr_scan_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_push_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_detection_enabled BOOLEAN DEFAULT false;

-- ============================================================================
-- 9. FIX: students table - add email column
-- ============================================================================
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================================================
-- 10. FIX: attempt_misconceptions and misconception_tags tables
-- ============================================================================
-- These are referenced in sync-grades-to-scholar but never defined.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.misconception_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_misconception_tags_name ON public.misconception_tags(name);

CREATE TABLE IF NOT EXISTS public.attempt_misconceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  misconception_id UUID NOT NULL REFERENCES public.misconception_tags(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempt_misconceptions_attempt ON public.attempt_misconceptions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_misconceptions_misconception ON public.attempt_misconceptions(misconception_id);

-- ============================================================================
-- 11. FIX: geometry_mastery table for grade-assignment function
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.geometry_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  mastery_percentage DECIMAL(5,2) DEFAULT 0,
  geoblox_unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id)
);

CREATE INDEX IF NOT EXISTS idx_geometry_mastery_student ON public.geometry_mastery(student_id);

-- ============================================================================
-- 12. FIX: reward_claims table for grade-assignment secure rewards
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL,
  reference_id TEXT,
  xp_amount INTEGER DEFAULT 0,
  coin_amount INTEGER DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, claim_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_student ON public.reward_claims(student_id);

-- Create the secure reward function if it doesn't exist
CREATE OR REPLACE FUNCTION public.award_rewards_secure(
  p_student_id UUID,
  p_claim_type TEXT,
  p_reference_id TEXT,
  p_xp_amount INTEGER,
  p_coin_amount INTEGER,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check for duplicate claim
  IF EXISTS (
    SELECT 1 FROM public.reward_claims
    WHERE student_id = p_student_id
    AND claim_type = p_claim_type
    AND reference_id = p_reference_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already claimed');
  END IF;

  -- Record the claim
  INSERT INTO public.reward_claims (student_id, claim_type, reference_id, xp_amount, coin_amount, reason)
  VALUES (p_student_id, p_claim_type, p_reference_id, p_xp_amount, p_coin_amount, p_reason);

  -- Update student totals
  UPDATE public.students
  SET
    xp_total = COALESCE(xp_total, 0) + p_xp_amount,
    coins_balance = COALESCE(coins_balance, 0) + p_coin_amount,
    last_activity_date = CURRENT_DATE,
    updated_at = now()
  WHERE id = p_student_id;

  -- Record XP transaction
  INSERT INTO public.xp_transactions (student_id, amount, source, source_id)
  VALUES (p_student_id, p_xp_amount, p_claim_type, p_reference_id::UUID);

  -- Record coin transaction
  INSERT INTO public.coin_transactions (student_id, amount, source, source_id)
  VALUES (p_student_id, p_coin_amount, p_claim_type, p_reference_id::UUID);

  RETURN jsonb_build_object(
    'success', true,
    'xp_awarded', p_xp_amount,
    'coins_awarded', p_coin_amount
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'already claimed');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 13. FIX: push_subscriptions table for push-student-data function
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- ============================================================================
-- 14. FIX: grading_corrections - add columns code expects
-- ============================================================================
ALTER TABLE public.grading_corrections
  ADD COLUMN IF NOT EXISTS ai_grade DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS corrected_grade DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS grading_focus TEXT,
  ADD COLUMN IF NOT EXISTS strictness_indicator TEXT,
  ADD COLUMN IF NOT EXISTS topic_name TEXT;

-- ============================================================================
-- DONE - Schema is now aligned with application code expectations
-- ============================================================================
