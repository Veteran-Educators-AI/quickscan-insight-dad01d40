-- ============================================================================
-- CONSOLIDATED RLS POLICIES MIGRATION
-- Row Level Security for all tables
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferpa_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nycologic_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interpretation_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_misconceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_answer_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.name_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sister_app_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotto_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotto_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION TO CHECK STUDENT CLASS MEMBERSHIP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_student_in_class(p_student_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.classes c ON s.class_id = c.id
    WHERE s.id = p_student_id AND c.teacher_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- CLASSES POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own classes"
ON public.classes FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their classes"
ON public.classes FOR SELECT
USING (id IN (SELECT class_id FROM public.students WHERE user_id = auth.uid()));

-- ============================================================================
-- STUDENTS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage class students"
ON public.students FOR ALL
USING (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()));

CREATE POLICY "Students can view own record"
ON public.students FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Students can update own record"
ON public.students FOR UPDATE
USING (user_id = auth.uid());

-- ============================================================================
-- TOPICS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own topics"
ON public.topics FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Students can view topics"
ON public.topics FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- ASSESSMENTS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own assessments"
ON public.assessments FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Students can view class assessments"
ON public.assessments FOR SELECT
USING (class_id IN (SELECT class_id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Public assessments viewable by share code"
ON public.assessments FOR SELECT
USING (share_code IS NOT NULL);

-- ============================================================================
-- QUESTIONS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage questions"
ON public.questions FOR ALL
USING (assessment_id IN (SELECT id FROM public.assessments WHERE teacher_id = auth.uid()));

CREATE POLICY "Students can view assessment questions"
ON public.questions FOR SELECT
USING (assessment_id IN (
  SELECT a.id FROM public.assessments a
  JOIN public.students s ON a.class_id = s.class_id
  WHERE s.user_id = auth.uid()
));

-- ============================================================================
-- ATTEMPTS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage class attempts"
ON public.attempts FOR ALL
USING (student_id IN (
  SELECT s.id FROM public.students s
  JOIN public.classes c ON s.class_id = c.id
  WHERE c.teacher_id = auth.uid()
));

CREATE POLICY "Students can view own attempts"
ON public.attempts FOR SELECT
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Students can create own attempts"
ON public.attempts FOR INSERT
WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Students can update own attempts"
ON public.attempts FOR UPDATE
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- ============================================================================
-- SCORES POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage class scores"
ON public.scores FOR ALL
USING (student_id IN (
  SELECT s.id FROM public.students s
  JOIN public.classes c ON s.class_id = c.id
  WHERE c.teacher_id = auth.uid()
));

CREATE POLICY "Students can view own scores"
ON public.scores FOR SELECT
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- ============================================================================
-- RUBRICS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own rubrics"
ON public.rubrics FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Authenticated users can view template rubrics"
ON public.rubrics FOR SELECT
TO authenticated
USING (is_template = true);

-- ============================================================================
-- SETTINGS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own settings"
ON public.settings FOR ALL
USING (teacher_id = auth.uid());

-- ============================================================================
-- FERPA AUDIT LOG POLICIES
-- ============================================================================

CREATE POLICY "Users can view own audit logs"
ON public.ferpa_audit_log FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
ON public.ferpa_audit_log FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::public.user_role));

-- ============================================================================
-- MFA RECOVERY CODES POLICIES
-- ============================================================================

CREATE POLICY "Users can manage own recovery codes"
ON public.mfa_recovery_codes FOR ALL
USING (user_id = auth.uid());

-- ============================================================================
-- WORKSHEETS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own worksheets"
ON public.worksheets FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Public worksheets viewable"
ON public.worksheets FOR SELECT
USING (is_public = true);

-- ============================================================================
-- LESSON PLANS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own lesson plans"
ON public.lesson_plans FOR ALL
USING (teacher_id = auth.uid());

-- ============================================================================
-- PRESENTATIONS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own presentations"
ON public.nycologic_presentations FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Public presentations viewable by share code"
ON public.nycologic_presentations FOR SELECT
USING (share_code IS NOT NULL);

-- ============================================================================
-- PENDING SCANS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own pending scans"
ON public.pending_scans FOR ALL
USING (teacher_id = auth.uid());

-- ============================================================================
-- DIAGNOSTIC RESULTS POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage class diagnostic results"
ON public.diagnostic_results FOR ALL
USING (student_id IN (
  SELECT s.id FROM public.students s
  JOIN public.classes c ON s.class_id = c.id
  WHERE c.teacher_id = auth.uid()
));

CREATE POLICY "Students can view own diagnostic results"
ON public.diagnostic_results FOR SELECT
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- ============================================================================
-- GRADE HISTORY POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage grade history"
ON public.grade_history FOR ALL
USING (score_id IN (
  SELECT sc.id FROM public.scores sc
  JOIN public.students s ON sc.student_id = s.id
  JOIN public.classes c ON s.class_id = c.id
  WHERE c.teacher_id = auth.uid()
));

CREATE POLICY "Students can view own grade history"
ON public.grade_history FOR SELECT
USING (score_id IN (
  SELECT sc.id FROM public.scores sc
  WHERE sc.student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
));

-- ============================================================================
-- ASSIGNMENT ATTENDANCE POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage attendance"
ON public.assignment_attendance FOR ALL
USING (assessment_id IN (SELECT id FROM public.assessments WHERE teacher_id = auth.uid()));

-- ============================================================================
-- RESULT COMMENTS POLICIES
-- ============================================================================

CREATE POLICY "Authors can manage own comments"
ON public.result_comments FOR ALL
USING (author_id = auth.uid());

CREATE POLICY "Teachers can view class comments"
ON public.result_comments FOR SELECT
USING (attempt_id IN (
  SELECT a.id FROM public.attempts a
  JOIN public.students s ON a.student_id = s.id
  JOIN public.classes c ON s.class_id = c.id
  WHERE c.teacher_id = auth.uid()
));

CREATE POLICY "Students can view non-private comments"
ON public.result_comments FOR SELECT
USING (
  is_private = false AND
  attempt_id IN (
    SELECT a.id FROM public.attempts a
    WHERE a.student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  )
);

-- ============================================================================
-- AI USAGE LOGS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own AI usage"
ON public.ai_usage_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AI usage"
ON public.ai_usage_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- AI TRAINING TABLES POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage verifications"
ON public.interpretation_verifications FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Authenticated users can view misconceptions"
ON public.analysis_misconceptions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Teachers can manage corrections"
ON public.grading_corrections FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage AI feedback"
ON public.ai_analysis_feedback FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage answer samples"
ON public.teacher_answer_samples FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage name corrections"
ON public.name_corrections FOR ALL
USING (teacher_id = auth.uid());

-- ============================================================================
-- INTEGRATION TABLES POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own API keys"
ON public.teacher_api_keys FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can view own sync logs"
ON public.sister_app_sync_log FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage shared assignments"
ON public.shared_assignments FOR ALL
USING (shared_by = auth.uid());

CREATE POLICY "Authenticated users can view public shared"
ON public.shared_assignments FOR SELECT
TO authenticated
USING (is_public = true);

CREATE POLICY "Authenticated users can submit feedback"
ON public.beta_feedback FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view own feedback"
ON public.beta_feedback FOR SELECT
USING (user_id = auth.uid());

-- ============================================================================
-- AI GENERATED IMAGES POLICIES
-- ============================================================================

CREATE POLICY "Teachers can manage own images"
ON public.ai_generated_images FOR ALL
USING (teacher_id = auth.uid());

-- ============================================================================
-- GAMIFICATION POLICIES
-- ============================================================================

CREATE POLICY "Authenticated users can read xp_config"
ON public.xp_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage xp_config"
ON public.xp_config FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::public.user_role));

CREATE POLICY "Students read own xp transactions"
ON public.xp_transactions FOR SELECT
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers read class xp transactions"
ON public.xp_transactions FOR SELECT
USING (public.is_student_in_class(student_id, auth.uid()));

CREATE POLICY "Students read own coin transactions"
ON public.coin_transactions FOR SELECT
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers read class coin transactions"
ON public.coin_transactions FOR SELECT
USING (public.is_student_in_class(student_id, auth.uid()));

CREATE POLICY "Anyone can read badges"
ON public.badges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage badges"
ON public.badges FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::public.user_role));

CREATE POLICY "Students read own badges"
ON public.student_badges FOR SELECT
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers read class student badges"
ON public.student_badges FOR SELECT
USING (public.is_student_in_class(student_id, auth.uid()));

CREATE POLICY "Students read own achievement progress"
ON public.achievement_progress FOR SELECT
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers manage class challenges"
ON public.challenges FOR ALL
USING (
  teacher_id = auth.uid() OR
  class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
);

CREATE POLICY "Students read class challenges"
ON public.challenges FOR SELECT
USING (class_id IN (SELECT class_id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Students manage own challenge progress"
ON public.student_challenges FOR ALL
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers read class student challenges"
ON public.student_challenges FOR SELECT
USING (public.is_student_in_class(student_id, auth.uid()));

CREATE POLICY "Students manage own daily missions"
ON public.daily_missions FOR ALL
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can read lotto_config"
ON public.lotto_config FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Students manage own lotto plays"
ON public.lotto_plays FOR ALL
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers manage shop items"
ON public.shop_items FOR ALL
USING (
  teacher_id = auth.uid() OR
  class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
);

CREATE POLICY "Students read class shop items"
ON public.shop_items FOR SELECT
USING (
  is_active = true AND
  class_id IN (SELECT class_id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Students manage own purchases"
ON public.student_purchases FOR ALL
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers manage class purchases"
ON public.student_purchases FOR ALL
USING (public.is_student_in_class(student_id, auth.uid()));

-- ============================================================================
-- PARENT POLICIES
-- ============================================================================

CREATE POLICY "Parents manage own profile"
ON public.parent_profiles FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Parents read own links"
ON public.parent_student_links FOR SELECT
USING (parent_id IN (SELECT id FROM public.parent_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Parents can create links"
ON public.parent_student_links FOR INSERT
WITH CHECK (parent_id IN (SELECT id FROM public.parent_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can verify links"
ON public.parent_student_links FOR UPDATE
USING (public.is_student_in_class(student_id, auth.uid()));

CREATE POLICY "Parents manage own pledges"
ON public.parent_pledges FOR ALL
USING (parent_id IN (SELECT id FROM public.parent_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students read pledges about them"
ON public.parent_pledges FOR SELECT
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers read class pledges"
ON public.parent_pledges FOR SELECT
USING (public.is_student_in_class(student_id, auth.uid()));

CREATE POLICY "Parents manage own notifications"
ON public.parent_notifications FOR ALL
USING (parent_id IN (SELECT id FROM public.parent_profiles WHERE user_id = auth.uid()));
