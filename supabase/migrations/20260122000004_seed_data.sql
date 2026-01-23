-- ============================================================================
-- SEED DATA MIGRATION
-- Default badges, lotto config, storage buckets
-- ============================================================================

-- ============================================================================
-- DEFAULT BADGES
-- ============================================================================

INSERT INTO public.badges (name, description, category, requirement_type, requirement_value, xp_reward, coin_reward) VALUES
  -- Participation badges
  ('First Steps', 'Complete your first assessment', 'participation', 'assessments_completed', 1, 10, 5),
  ('Getting Started', 'Complete 5 assessments', 'participation', 'assessments_completed', 5, 25, 10),
  ('Consistent', 'Complete 10 assessments', 'participation', 'assessments_completed', 10, 50, 20),
  ('Dedicated', 'Complete 25 assessments', 'participation', 'assessments_completed', 25, 100, 50),
  ('Scholar', 'Complete 50 assessments', 'participation', 'assessments_completed', 50, 200, 100),
  ('Assessment Master', 'Complete 100 assessments', 'participation', 'assessments_completed', 100, 500, 250),

  -- Streak badges
  ('3-Day Streak', 'Maintain a 3-day activity streak', 'streak', 'streak_days', 3, 15, 5),
  ('Week Warrior', 'Maintain a 7-day activity streak', 'streak', 'streak_days', 7, 50, 25),
  ('Two Week Champion', 'Maintain a 14-day activity streak', 'streak', 'streak_days', 14, 100, 50),
  ('Month Master', 'Maintain a 30-day activity streak', 'streak', 'streak_days', 30, 250, 150),
  ('Streak Legend', 'Maintain a 60-day activity streak', 'streak', 'streak_days', 60, 500, 300),
  ('Unstoppable', 'Maintain a 100-day activity streak', 'streak', 'streak_days', 100, 1000, 600),

  -- XP mastery badges
  ('XP Beginner', 'Earn 100 total XP', 'mastery', 'xp_total', 100, 10, 5),
  ('XP Explorer', 'Earn 500 total XP', 'mastery', 'xp_total', 500, 25, 15),
  ('XP Adventurer', 'Earn 1000 total XP', 'mastery', 'xp_total', 1000, 50, 30),
  ('XP Champion', 'Earn 5000 total XP', 'mastery', 'xp_total', 5000, 150, 100),
  ('XP Legend', 'Earn 10000 total XP', 'mastery', 'xp_total', 10000, 300, 200),
  ('XP Grandmaster', 'Earn 25000 total XP', 'mastery', 'xp_total', 25000, 750, 500),

  -- Perfect score badges
  ('Perfectionist', 'Get 1 perfect score', 'mastery', 'perfect_scores', 1, 20, 10),
  ('Ace Student', 'Get 5 perfect scores', 'mastery', 'perfect_scores', 5, 75, 40),
  ('Flawless', 'Get 10 perfect scores', 'mastery', 'perfect_scores', 10, 150, 80),
  ('Genius', 'Get 25 perfect scores', 'mastery', 'perfect_scores', 25, 400, 200)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEFAULT LOTTO CONFIGURATIONS
-- ============================================================================

INSERT INTO public.lotto_config (name, cost_coins, prizes) VALUES
  ('Basic Spin', 5, '[
    {"name": "5 XP", "probability": 0.40, "value_type": "xp", "value": 5},
    {"name": "10 XP", "probability": 0.25, "value_type": "xp", "value": 10},
    {"name": "2 Coins", "probability": 0.20, "value_type": "coins", "value": 2},
    {"name": "25 XP", "probability": 0.10, "value_type": "xp", "value": 25},
    {"name": "10 Coins", "probability": 0.04, "value_type": "coins", "value": 10},
    {"name": "JACKPOT 50 Coins!", "probability": 0.01, "value_type": "coins", "value": 50}
  ]'::jsonb),
  ('Premium Spin', 15, '[
    {"name": "15 XP", "probability": 0.35, "value_type": "xp", "value": 15},
    {"name": "30 XP", "probability": 0.25, "value_type": "xp", "value": 30},
    {"name": "10 Coins", "probability": 0.20, "value_type": "coins", "value": 10},
    {"name": "50 XP", "probability": 0.12, "value_type": "xp", "value": 50},
    {"name": "25 Coins", "probability": 0.06, "value_type": "coins", "value": 25},
    {"name": "JACKPOT 100 Coins!", "probability": 0.02, "value_type": "coins", "value": 100}
  ]'::jsonb),
  ('Lucky Spin', 25, '[
    {"name": "30 XP", "probability": 0.30, "value_type": "xp", "value": 30},
    {"name": "50 XP", "probability": 0.25, "value_type": "xp", "value": 50},
    {"name": "20 Coins", "probability": 0.20, "value_type": "coins", "value": 20},
    {"name": "100 XP", "probability": 0.15, "value_type": "xp", "value": 100},
    {"name": "50 Coins", "probability": 0.07, "value_type": "coins", "value": 50},
    {"name": "MEGA JACKPOT 200 Coins!", "probability": 0.03, "value_type": "coins", "value": 200}
  ]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEFAULT XP CONFIGURATION
-- ============================================================================

INSERT INTO public.xp_config (subject, base_xp, streak_multiplier, difficulty_multipliers) VALUES
  ('Math', 10, 1.5, '{"easy": 0.5, "medium": 1.0, "hard": 1.5, "expert": 2.0}'::jsonb),
  ('Science', 10, 1.5, '{"easy": 0.5, "medium": 1.0, "hard": 1.5, "expert": 2.0}'::jsonb),
  ('English', 10, 1.5, '{"easy": 0.5, "medium": 1.0, "hard": 1.5, "expert": 2.0}'::jsonb),
  ('History', 10, 1.5, '{"easy": 0.5, "medium": 1.0, "hard": 1.5, "expert": 2.0}'::jsonb),
  ('General', 10, 1.5, '{"easy": 0.5, "medium": 1.0, "hard": 1.5, "expert": 2.0}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for teacher answer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-answers', 'teacher-answers', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for scan images
INSERT INTO storage.buckets (id, name, public)
VALUES ('scan-images', 'scan-images', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for AI generated images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-images', 'ai-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for worksheets
INSERT INTO storage.buckets (id, name, public)
VALUES ('worksheets', 'worksheets', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Teacher answers bucket policies
CREATE POLICY "Teachers can upload their own answer images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'teacher-answers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view teacher answer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'teacher-answers');

CREATE POLICY "Teachers can update their own answer images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'teacher-answers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can delete their own answer images"
ON storage.objects FOR DELETE
USING (bucket_id = 'teacher-answers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Scan images bucket policies
CREATE POLICY "Authenticated users can upload scan images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own scan images"
ON storage.objects FOR SELECT
USING (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own scan images"
ON storage.objects FOR DELETE
USING (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- AI images bucket policies
CREATE POLICY "Teachers can upload AI images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ai-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view AI images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-images');

CREATE POLICY "Teachers can manage their AI images"
ON storage.objects FOR ALL
USING (bucket_id = 'ai-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Worksheets bucket policies
CREATE POLICY "Teachers can upload worksheets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'worksheets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can view their worksheets"
ON storage.objects FOR SELECT
USING (bucket_id = 'worksheets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can manage their worksheets"
ON storage.objects FOR ALL
USING (bucket_id = 'worksheets' AND auth.uid()::text = (storage.foldername(name))[1]);
