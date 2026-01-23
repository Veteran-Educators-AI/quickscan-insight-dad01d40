-- ============================================================================
-- CONSOLIDATED SCHEMA MIGRATION
-- All types, tables, and indexes for the unified education platform
-- ============================================================================

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

CREATE TYPE public.user_role AS ENUM ('teacher', 'student', 'admin');
CREATE TYPE public.attempt_status AS ENUM ('pending', 'in_progress', 'completed', 'graded');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- User profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'teacher'::public.user_role,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  period TEXT,
  class_code TEXT UNIQUE,
  school_year TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_classes_teacher ON public.classes(teacher_id);
CREATE INDEX idx_classes_code ON public.classes(class_code);
CREATE INDEX idx_classes_active ON public.classes(is_active);

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  student_id_number TEXT,
  custom_pseudonym TEXT,
  parent_email TEXT,
  -- Gamification columns
  xp_total INTEGER DEFAULT 0,
  coins_balance INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_students_class ON public.students(class_id);
CREATE INDEX idx_students_user ON public.students(user_id);
CREATE INDEX idx_students_name ON public.students(last_name, first_name);

-- Topics
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  nys_standard TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_topics_teacher ON public.topics(teacher_id);
CREATE INDEX idx_topics_subject ON public.topics(subject);

-- Assessments
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_points INTEGER DEFAULT 100,
  due_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  share_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assessments_teacher ON public.assessments(teacher_id);
CREATE INDEX idx_assessments_class ON public.assessments(class_id);
CREATE INDEX idx_assessments_share_code ON public.assessments(share_code);

-- Questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT,
  points INTEGER DEFAULT 1,
  rubric_criteria JSONB,
  correct_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_questions_assessment ON public.questions(assessment_id);

-- Attempts
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  status public.attempt_status DEFAULT 'pending'::public.attempt_status,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  total_score DECIMAL(5,2),
  feedback TEXT,
  scan_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attempts_student ON public.attempts(student_id);
CREATE INDEX idx_attempts_assessment ON public.attempts(assessment_id);
CREATE INDEX idx_attempts_status ON public.attempts(status);

-- Scores (per question)
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score DECIMAL(5,2),
  points_possible DECIMAL(5,2),
  feedback TEXT,
  ai_interpretation TEXT,
  student_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scores_attempt ON public.scores(attempt_id);
CREATE INDEX idx_scores_question ON public.scores(question_id);
CREATE INDEX idx_scores_student ON public.scores(student_id);

-- Rubrics
CREATE TABLE public.rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rubrics_teacher ON public.rubrics(teacher_id);

-- Settings
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, setting_key)
);

CREATE INDEX idx_settings_teacher ON public.settings(teacher_id);
CREATE INDEX idx_settings_key ON public.settings(setting_key);

-- ============================================================================
-- SECURITY & COMPLIANCE TABLES
-- ============================================================================

-- FERPA Audit Log
CREATE TABLE public.ferpa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ferpa_audit_user ON public.ferpa_audit_log(user_id);
CREATE INDEX idx_ferpa_audit_action ON public.ferpa_audit_log(action);
CREATE INDEX idx_ferpa_audit_created ON public.ferpa_audit_log(created_at);

-- MFA Recovery Codes
CREATE TABLE public.mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mfa_recovery_user ON public.mfa_recovery_codes(user_id);

-- ============================================================================
-- CONTENT & WORKSHEETS TABLES
-- ============================================================================

-- Worksheets
CREATE TABLE public.worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  topic TEXT,
  content JSONB,
  share_code TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_worksheets_teacher ON public.worksheets(teacher_id);
CREATE INDEX idx_worksheets_share_code ON public.worksheets(share_code);

-- Lesson Plans
CREATE TABLE public.lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  grade_level TEXT,
  objectives JSONB,
  content JSONB,
  duration_minutes INTEGER,
  nys_standards TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lesson_plans_teacher ON public.lesson_plans(teacher_id);

-- NYCLogic Presentations
CREATE TABLE public.nycologic_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  topic TEXT,
  slides JSONB,
  visual_theme TEXT DEFAULT 'default',
  share_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_presentations_teacher ON public.nycologic_presentations(teacher_id);

-- ============================================================================
-- GRADING & ASSESSMENT TABLES
-- ============================================================================

-- Pending Scans
CREATE TABLE public.pending_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  ocr_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_pending_scans_teacher ON public.pending_scans(teacher_id);
CREATE INDEX idx_pending_scans_status ON public.pending_scans(status);

-- Diagnostic Results
CREATE TABLE public.diagnostic_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  strengths JSONB,
  weaknesses JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_diagnostic_student ON public.diagnostic_results(student_id);
CREATE INDEX idx_diagnostic_topic ON public.diagnostic_results(topic_id);

-- Grade History
CREATE TABLE public.grade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES public.scores(id) ON DELETE CASCADE,
  previous_score DECIMAL(5,2),
  new_score DECIMAL(5,2),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  is_regents_curve BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_grade_history_score ON public.grade_history(score_id);

-- Assignment Attendance
CREATE TABLE public.assignment_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'present',
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assessment_id, student_id)
);

CREATE INDEX idx_attendance_assessment ON public.assignment_attendance(assessment_id);

-- Result Comments
CREATE TABLE public.result_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_result_comments_attempt ON public.result_comments(attempt_id);

-- AI Usage Logs
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_usage_user ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_feature ON public.ai_usage_logs(feature);
CREATE INDEX idx_ai_usage_created ON public.ai_usage_logs(created_at);

-- ============================================================================
-- AI TRAINING & FEEDBACK TABLES
-- ============================================================================

-- Interpretation Verifications
CREATE TABLE public.interpretation_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES public.scores(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_interpretation TEXT,
  corrected_interpretation TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verifications_score ON public.interpretation_verifications(score_id);

-- Analysis Misconceptions
CREATE TABLE public.analysis_misconceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  misconception_pattern TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  suggested_remediation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_misconceptions_topic ON public.analysis_misconceptions(topic_id);

-- Grading Corrections
CREATE TABLE public.grading_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES public.scores(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_score DECIMAL(5,2),
  corrected_score DECIMAL(5,2),
  correction_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_corrections_score ON public.grading_corrections(score_id);

-- AI Analysis Feedback
CREATE TABLE public.ai_analysis_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_feedback_attempt ON public.ai_analysis_feedback(attempt_id);

-- Teacher Answer Samples
CREATE TABLE public.teacher_answer_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  nys_standard TEXT,
  question_context TEXT,
  image_url TEXT NOT NULL,
  ocr_text TEXT,
  key_steps TEXT[],
  grading_emphasis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_answer_samples_teacher ON public.teacher_answer_samples(teacher_id);

-- Name Corrections
CREATE TABLE public.name_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  corrected_name TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_name_corrections_teacher ON public.name_corrections(teacher_id);

-- ============================================================================
-- INTEGRATION TABLES
-- ============================================================================

-- Teacher API Keys
CREATE TABLE public.teacher_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_api_keys_teacher ON public.teacher_api_keys(teacher_id);

-- Sister App Sync Log
CREATE TABLE public.sister_app_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_log_teacher ON public.sister_app_sync_log(teacher_id);

-- Shared Assignments
CREATE TABLE public.shared_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  share_code TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shared_assignments_by ON public.shared_assignments(shared_by);
CREATE INDEX idx_shared_assignments_code ON public.shared_assignments(share_code);

-- Beta Feedback
CREATE TABLE public.beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL,
  content TEXT NOT NULL,
  page_url TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_beta_feedback_type ON public.beta_feedback(feedback_type);

-- ============================================================================
-- AI GENERATED IMAGES TABLE
-- ============================================================================

CREATE TABLE public.ai_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  subject TEXT,
  topic TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  source TEXT NOT NULL DEFAULT 'worksheet' CHECK (source IN ('worksheet', 'presentation', 'clipart', 'manual')),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE INDEX idx_ai_images_teacher_status ON public.ai_generated_images(teacher_id, status);
CREATE INDEX idx_ai_images_subject ON public.ai_generated_images(subject);

-- ============================================================================
-- GAMIFICATION TABLES
-- ============================================================================

-- XP Configuration
CREATE TABLE public.xp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  base_xp INTEGER NOT NULL DEFAULT 10,
  streak_multiplier DECIMAL(3,2) DEFAULT 1.5,
  difficulty_multipliers JSONB DEFAULT '{"easy": 0.5, "medium": 1.0, "hard": 1.5}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- XP Transactions
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id UUID,
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xp_transactions_student ON public.xp_transactions(student_id);
CREATE INDEX idx_xp_transactions_created ON public.xp_transactions(created_at);

-- Coin Transactions
CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_coin_transactions_student ON public.coin_transactions(student_id);

-- Badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  coin_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_badges_category ON public.badges(category);

-- Student Badges
CREATE TABLE public.student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, badge_id)
);

CREATE INDEX idx_student_badges_student ON public.student_badges(student_id);

-- Achievement Progress
CREATE TABLE public.achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, achievement_type)
);

CREATE INDEX idx_achievement_progress_student ON public.achievement_progress(student_id);

-- Challenges
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  coin_reward INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_challenges_class ON public.challenges(class_id);
CREATE INDEX idx_challenges_dates ON public.challenges(start_date, end_date);

-- Student Challenges
CREATE TABLE public.student_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, challenge_id)
);

CREATE INDEX idx_student_challenges_student ON public.student_challenges(student_id);

-- Daily Missions
CREATE TABLE public.daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mission_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 5,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, mission_date, mission_type)
);

CREATE INDEX idx_daily_missions_student_date ON public.daily_missions(student_id, mission_date);

-- Lotto Configuration
CREATE TABLE public.lotto_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cost_coins INTEGER NOT NULL,
  prizes JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lotto Plays
CREATE TABLE public.lotto_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lotto_config_id UUID NOT NULL REFERENCES public.lotto_config(id),
  prize_won JSONB,
  coins_spent INTEGER NOT NULL,
  played_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lotto_plays_student ON public.lotto_plays(student_id);

-- Shop Items
CREATE TABLE public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cost_coins INTEGER NOT NULL,
  quantity_available INTEGER,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shop_items_class ON public.shop_items(class_id);

-- Student Purchases
CREATE TABLE public.student_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES public.shop_items(id),
  coins_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  purchased_at TIMESTAMPTZ DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX idx_student_purchases_student ON public.student_purchases(student_id);

-- ============================================================================
-- PARENT TABLES
-- ============================================================================

-- Parent Profiles
CREATE TABLE public.parent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  notification_preferences JSONB DEFAULT '{"email": true, "push": false}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_parent_profiles_user ON public.parent_profiles(user_id);

-- Parent-Student Links
CREATE TABLE public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  verified BOOLEAN DEFAULT false,
  verification_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX idx_parent_student_links_parent ON public.parent_student_links(parent_id);
CREATE INDEX idx_parent_student_links_student ON public.parent_student_links(student_id);

-- Parent Pledges
CREATE TABLE public.parent_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  pledge_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  reward_description TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_parent_pledges_student ON public.parent_pledges(student_id);

-- Parent Notifications
CREATE TABLE public.parent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_parent_notifications_parent ON public.parent_notifications(parent_id);
CREATE INDEX idx_parent_notifications_unread ON public.parent_notifications(parent_id) WHERE read_at IS NULL;
