
-- ============================================================================
-- SHARED SCHOLAR TABLES
-- These tables allow Scholar Ai to read/write directly to this database,
-- eliminating the webhook sync layer.
-- ============================================================================

-- 1. Student XP & Coins Ledger
-- Tracks all XP/coin changes (earned from grades, deducted for behavior, etc.)
CREATE TABLE public.student_xp_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  xp_change INTEGER NOT NULL DEFAULT 0,
  coin_change INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'grade',  -- 'grade', 'behavior', 'assignment', 'reward', 'live_session'
  reference_id UUID,  -- links to grade_history.id, shared_assignments.id, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Student XP Summary (materialized balances for fast reads)
CREATE TABLE public.student_xp_summary (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE PRIMARY KEY,
  total_xp INTEGER NOT NULL DEFAULT 0,
  total_coins INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Student Assignment Submissions
-- When a student completes an assignment on Scholar, the answers are stored here
CREATE TABLE public.student_assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.shared_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC,
  status TEXT NOT NULL DEFAULT 'submitted',  -- 'in_progress', 'submitted', 'graded'
  started_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- 4. Student Rewards / Achievements
CREATE TABLE public.student_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,  -- 'badge', 'streak', 'milestone', 'purchase'
  reward_name TEXT NOT NULL,
  reward_data JSONB DEFAULT '{}'::jsonb,
  coin_cost INTEGER DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Student Activity Feed (for Scholar dashboard)
CREATE TABLE public.student_activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,  -- 'grade_received', 'assignment_pushed', 'reward_earned', 'level_up', 'xp_earned'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_xp_ledger_student ON public.student_xp_ledger(student_id);
CREATE INDEX idx_xp_ledger_created ON public.student_xp_ledger(created_at DESC);
CREATE INDEX idx_submissions_student ON public.student_assignment_submissions(student_id);
CREATE INDEX idx_submissions_assignment ON public.student_assignment_submissions(assignment_id);
CREATE INDEX idx_rewards_student ON public.student_rewards(student_id);
CREATE INDEX idx_activity_feed_student ON public.student_activity_feed(student_id, created_at DESC);
CREATE INDEX idx_activity_feed_unread ON public.student_activity_feed(student_id, is_read) WHERE is_read = false;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- student_xp_ledger
ALTER TABLE public.student_xp_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own XP history"
  ON public.student_xp_ledger FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_xp_ledger.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Teachers can view XP for their students"
  ON public.student_xp_ledger FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON s.class_id = c.id WHERE s.id = student_xp_ledger.student_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Teachers can insert XP entries for their students"
  ON public.student_xp_ledger FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON s.class_id = c.id WHERE s.id = student_xp_ledger.student_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Students can earn XP on their own record"
  ON public.student_xp_ledger FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_xp_ledger.student_id AND s.user_id = auth.uid()));

-- student_xp_summary
ALTER TABLE public.student_xp_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own XP summary"
  ON public.student_xp_summary FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_xp_summary.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Teachers can view XP summary for their students"
  ON public.student_xp_summary FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON s.class_id = c.id WHERE s.id = student_xp_summary.student_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Teachers can upsert XP summary"
  ON public.student_xp_summary FOR ALL
  USING (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON s.class_id = c.id WHERE s.id = student_xp_summary.student_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Students can update their own XP summary"
  ON public.student_xp_summary FOR ALL
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_xp_summary.student_id AND s.user_id = auth.uid()));

-- student_assignment_submissions
ALTER TABLE public.student_assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own submissions"
  ON public.student_assignment_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_assignment_submissions.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Students can create their own submissions"
  ON public.student_assignment_submissions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_assignment_submissions.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Students can update their own submissions"
  ON public.student_assignment_submissions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_assignment_submissions.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Teachers can view submissions for their students"
  ON public.student_assignment_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON s.class_id = c.id WHERE s.id = student_assignment_submissions.student_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Teachers can grade submissions"
  ON public.student_assignment_submissions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON s.class_id = c.id WHERE s.id = student_assignment_submissions.student_id AND c.teacher_id = auth.uid()));

-- student_rewards
ALTER TABLE public.student_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own rewards"
  ON public.student_rewards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_rewards.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Students can earn rewards"
  ON public.student_rewards FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_rewards.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Teachers can view rewards for their students"
  ON public.student_rewards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON s.class_id = c.id WHERE s.id = student_rewards.student_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Teachers can grant rewards"
  ON public.student_rewards FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON s.class_id = c.id WHERE s.id = student_rewards.student_id AND c.teacher_id = auth.uid()));

-- student_activity_feed
ALTER TABLE public.student_activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own activity"
  ON public.student_activity_feed FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_activity_feed.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Students can mark activity as read"
  ON public.student_activity_feed FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_activity_feed.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Teachers can create activity for their students"
  ON public.student_activity_feed FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON s.class_id = c.id WHERE s.id = student_activity_feed.student_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Teachers can view activity for their students"
  ON public.student_activity_feed FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s JOIN public.classes c ON s.class_id = c.id WHERE s.id = student_activity_feed.student_id AND c.teacher_id = auth.uid()));

-- ============================================================================
-- TRIGGER: Auto-update XP summary when ledger changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_xp_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.student_xp_summary (student_id, total_xp, total_coins, updated_at)
  VALUES (NEW.student_id, NEW.xp_change, NEW.coin_change, now())
  ON CONFLICT (student_id) DO UPDATE SET
    total_xp = student_xp_summary.total_xp + NEW.xp_change,
    total_coins = student_xp_summary.total_coins + NEW.coin_change,
    current_level = GREATEST(1, FLOOR((student_xp_summary.total_xp + NEW.xp_change) / 100) + 1),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_xp_summary
AFTER INSERT ON public.student_xp_ledger
FOR EACH ROW
EXECUTE FUNCTION public.update_xp_summary();

-- ============================================================================
-- TRIGGER: Auto-create activity feed entry when assignment is pushed
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_student_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Create activity feed entries for all students in the class
  INSERT INTO public.student_activity_feed (student_id, activity_type, title, description, metadata)
  SELECT s.id, 'assignment_pushed', 'New Assignment: ' || NEW.title,
    COALESCE(NEW.description, 'You have a new assignment to complete.'),
    jsonb_build_object('assignment_id', NEW.id, 'xp_reward', NEW.xp_reward, 'coin_reward', NEW.coin_reward)
  FROM public.students s
  WHERE s.class_id = NEW.class_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_assignment_pushed
AFTER INSERT ON public.shared_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_assignment();

-- Enable realtime for Scholar-facing tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_xp_summary;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_assignment_submissions;
