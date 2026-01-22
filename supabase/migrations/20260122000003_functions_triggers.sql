-- ============================================================================
-- CONSOLIDATED FUNCTIONS AND TRIGGERS MIGRATION
-- All helper functions, triggers, and stored procedures
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================================
-- AUTH FUNCTIONS
-- ============================================================================

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'teacher'::public.user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Handle new parent signup
CREATE OR REPLACE FUNCTION public.handle_new_parent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'parent' THEN
    INSERT INTO public.parent_profiles (user_id, email, display_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_parent ON auth.users;
CREATE TRIGGER on_auth_user_created_parent
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_parent();

-- ============================================================================
-- STUDENT FUNCTIONS
-- ============================================================================

-- Join class with code
CREATE OR REPLACE FUNCTION public.join_class_with_code(p_class_code TEXT, p_first_name TEXT, p_last_name TEXT)
RETURNS UUID AS $$
DECLARE
  v_class_id UUID;
  v_student_id UUID;
BEGIN
  -- Find the class
  SELECT id INTO v_class_id FROM public.classes WHERE class_code = p_class_code AND is_active = true;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Invalid class code or class is not active';
  END IF;

  -- Check if student already exists in this class
  SELECT id INTO v_student_id FROM public.students
  WHERE class_id = v_class_id AND user_id = auth.uid();

  IF v_student_id IS NOT NULL THEN
    RETURN v_student_id;
  END IF;

  -- Create new student record
  INSERT INTO public.students (user_id, class_id, first_name, last_name)
  VALUES (auth.uid(), v_class_id, p_first_name, p_last_name)
  RETURNING id INTO v_student_id;

  RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get student dashboard data
CREATE OR REPLACE FUNCTION public.get_student_dashboard(p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'student', row_to_json(s),
    'class', row_to_json(c),
    'recent_attempts', (
      SELECT jsonb_agg(row_to_json(a))
      FROM (
        SELECT a.*, ass.title as assessment_title
        FROM public.attempts a
        JOIN public.assessments ass ON a.assessment_id = ass.id
        WHERE a.student_id = p_student_id
        ORDER BY a.created_at DESC
        LIMIT 5
      ) a
    ),
    'badges', (
      SELECT jsonb_agg(row_to_json(b))
      FROM (
        SELECT b.*, sb.earned_at
        FROM public.student_badges sb
        JOIN public.badges b ON sb.badge_id = b.id
        WHERE sb.student_id = p_student_id
        ORDER BY sb.earned_at DESC
      ) b
    ),
    'daily_missions', (
      SELECT jsonb_agg(row_to_json(m))
      FROM public.daily_missions m
      WHERE m.student_id = p_student_id AND m.mission_date = CURRENT_DATE
    )
  ) INTO v_result
  FROM public.students s
  JOIN public.classes c ON s.class_id = c.id
  WHERE s.id = p_student_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- AI RATE LIMITING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(p_user_id UUID, p_feature TEXT, p_limit INTEGER DEFAULT 100)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.ai_usage_logs
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND created_at > now() - INTERVAL '1 hour';

  RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- GAMIFICATION FUNCTIONS
-- ============================================================================

-- Award XP to student
CREATE OR REPLACE FUNCTION public.award_xp(
  p_student_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_source_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_streak_multiplier DECIMAL(3,2) := 1.0;
  v_final_amount INTEGER;
  v_current_streak INTEGER;
BEGIN
  SELECT current_streak INTO v_current_streak
  FROM public.students WHERE id = p_student_id;

  IF v_current_streak >= 7 THEN
    v_streak_multiplier := 1.5;
  ELSIF v_current_streak >= 3 THEN
    v_streak_multiplier := 1.25;
  END IF;

  v_final_amount := ROUND(p_amount * v_streak_multiplier);

  INSERT INTO public.xp_transactions (student_id, amount, source, source_id, multiplier)
  VALUES (p_student_id, v_final_amount, p_source, p_source_id, v_streak_multiplier);

  UPDATE public.students
  SET xp_total = COALESCE(xp_total, 0) + v_final_amount,
      last_activity_date = CURRENT_DATE
  WHERE id = p_student_id;

  PERFORM public.check_badge_eligibility(p_student_id);

  RETURN v_final_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update student streak
CREATE OR REPLACE FUNCTION public.update_student_streak(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_new_streak INTEGER;
BEGIN
  SELECT last_activity_date, current_streak INTO v_last_activity, v_current_streak
  FROM public.students WHERE id = p_student_id;

  v_current_streak := COALESCE(v_current_streak, 0);

  IF v_last_activity IS NULL THEN
    v_new_streak := 1;
  ELSIF v_last_activity = CURRENT_DATE THEN
    v_new_streak := v_current_streak;
  ELSIF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    v_new_streak := v_current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  UPDATE public.students
  SET current_streak = v_new_streak,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
      last_activity_date = CURRENT_DATE
  WHERE id = p_student_id;

  PERFORM public.check_badge_eligibility(p_student_id);

  RETURN v_new_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Convert XP to coins
CREATE OR REPLACE FUNCTION public.convert_xp_to_coins(
  p_student_id UUID,
  p_xp_amount INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_coins INTEGER;
BEGIN
  v_coins := p_xp_amount / 100;

  IF v_coins > 0 THEN
    UPDATE public.students
    SET coins_balance = COALESCE(coins_balance, 0) + v_coins
    WHERE id = p_student_id;

    INSERT INTO public.coin_transactions (student_id, amount, source)
    VALUES (p_student_id, v_coins, 'xp_conversion');
  END IF;

  RETURN v_coins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check badge eligibility
CREATE OR REPLACE FUNCTION public.check_badge_eligibility(p_student_id UUID)
RETURNS SETOF UUID AS $$
DECLARE
  v_badge RECORD;
  v_student RECORD;
  v_eligible BOOLEAN;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;

  FOR v_badge IN SELECT * FROM public.badges WHERE is_active = true LOOP
    v_eligible := false;

    CASE v_badge.requirement_type
      WHEN 'streak_days' THEN
        v_eligible := COALESCE(v_student.current_streak, 0) >= v_badge.requirement_value;
      WHEN 'xp_total' THEN
        v_eligible := COALESCE(v_student.xp_total, 0) >= v_badge.requirement_value;
      WHEN 'assessments_completed' THEN
        SELECT COUNT(*) INTO v_count
        FROM public.attempts WHERE student_id = p_student_id AND status = 'completed'::public.attempt_status;
        v_eligible := v_count >= v_badge.requirement_value;
      WHEN 'perfect_scores' THEN
        SELECT COUNT(*) INTO v_count
        FROM public.scores WHERE student_id = p_student_id AND score = points_possible;
        v_eligible := v_count >= v_badge.requirement_value;
      ELSE
        v_eligible := false;
    END CASE;

    IF v_eligible THEN
      INSERT INTO public.student_badges (student_id, badge_id)
      VALUES (p_student_id, v_badge.id)
      ON CONFLICT (student_id, badge_id) DO NOTHING;

      IF FOUND THEN
        IF v_badge.xp_reward > 0 THEN
          INSERT INTO public.xp_transactions (student_id, amount, source, source_id)
          VALUES (p_student_id, v_badge.xp_reward, 'badge', v_badge.id);

          UPDATE public.students
          SET xp_total = COALESCE(xp_total, 0) + v_badge.xp_reward
          WHERE id = p_student_id;
        END IF;

        IF v_badge.coin_reward > 0 THEN
          UPDATE public.students
          SET coins_balance = COALESCE(coins_balance, 0) + v_badge.coin_reward
          WHERE id = p_student_id;

          INSERT INTO public.coin_transactions (student_id, amount, source, source_id)
          VALUES (p_student_id, v_badge.coin_reward, 'badge', v_badge.id);
        END IF;

        RETURN NEXT v_badge.id;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Play lotto
CREATE OR REPLACE FUNCTION public.play_lotto(
  p_student_id UUID,
  p_lotto_config_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_config RECORD;
  v_student RECORD;
  v_prize JSONB;
  v_random DECIMAL;
  v_cumulative DECIMAL := 0;
  v_prizes JSONB;
BEGIN
  SELECT * INTO v_config FROM public.lotto_config WHERE id = p_lotto_config_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lotto configuration not found or inactive';
  END IF;

  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  IF COALESCE(v_student.coins_balance, 0) < v_config.cost_coins THEN
    RAISE EXCEPTION 'Insufficient coins. Need % but have %', v_config.cost_coins, COALESCE(v_student.coins_balance, 0);
  END IF;

  UPDATE public.students
  SET coins_balance = coins_balance - v_config.cost_coins
  WHERE id = p_student_id;

  INSERT INTO public.coin_transactions (student_id, amount, source, source_id)
  VALUES (p_student_id, -v_config.cost_coins, 'lotto', p_lotto_config_id);

  v_random := random();
  v_prizes := v_config.prizes;

  FOR v_prize IN SELECT * FROM jsonb_array_elements(v_prizes) LOOP
    v_cumulative := v_cumulative + (v_prize->>'probability')::decimal;
    IF v_random <= v_cumulative THEN
      INSERT INTO public.lotto_plays (student_id, lotto_config_id, prize_won, coins_spent)
      VALUES (p_student_id, p_lotto_config_id, v_prize, v_config.cost_coins);

      CASE v_prize->>'value_type'
        WHEN 'xp' THEN
          PERFORM public.award_xp(p_student_id, (v_prize->>'value')::integer, 'lotto', p_lotto_config_id);
        WHEN 'coins' THEN
          UPDATE public.students
          SET coins_balance = coins_balance + (v_prize->>'value')::integer
          WHERE id = p_student_id;

          INSERT INTO public.coin_transactions (student_id, amount, source)
          VALUES (p_student_id, (v_prize->>'value')::integer, 'lotto_win');
      END CASE;

      RETURN v_prize;
    END IF;
  END LOOP;

  RETURN v_prizes->-1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Purchase shop item
CREATE OR REPLACE FUNCTION public.purchase_shop_item(
  p_student_id UUID,
  p_shop_item_id UUID
) RETURNS UUID AS $$
DECLARE
  v_item RECORD;
  v_student RECORD;
  v_purchase_id UUID;
BEGIN
  SELECT * INTO v_item FROM public.shop_items WHERE id = p_shop_item_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop item not found or inactive';
  END IF;

  IF v_item.quantity_available IS NOT NULL AND v_item.quantity_available <= 0 THEN
    RAISE EXCEPTION 'Item out of stock';
  END IF;

  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  IF COALESCE(v_student.coins_balance, 0) < v_item.cost_coins THEN
    RAISE EXCEPTION 'Insufficient coins. Need % but have %', v_item.cost_coins, COALESCE(v_student.coins_balance, 0);
  END IF;

  UPDATE public.students
  SET coins_balance = coins_balance - v_item.cost_coins
  WHERE id = p_student_id;

  INSERT INTO public.coin_transactions (student_id, amount, source, source_id)
  VALUES (p_student_id, -v_item.cost_coins, 'purchase', p_shop_item_id);

  IF v_item.quantity_available IS NOT NULL THEN
    UPDATE public.shop_items
    SET quantity_available = quantity_available - 1
    WHERE id = p_shop_item_id;
  END IF;

  INSERT INTO public.student_purchases (student_id, shop_item_id, coins_spent)
  VALUES (p_student_id, p_shop_item_id, v_item.cost_coins)
  RETURNING id INTO v_purchase_id;

  RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate daily missions
CREATE OR REPLACE FUNCTION public.generate_daily_missions(p_student_id UUID)
RETURNS SETOF public.daily_missions AS $$
DECLARE
  v_mission RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.daily_missions
    WHERE student_id = p_student_id AND mission_date = CURRENT_DATE
  ) THEN
    RETURN QUERY SELECT * FROM public.daily_missions
    WHERE student_id = p_student_id AND mission_date = CURRENT_DATE;
    RETURN;
  END IF;

  INSERT INTO public.daily_missions (student_id, mission_date, mission_type, requirement_value, xp_reward)
  VALUES (p_student_id, CURRENT_DATE, 'complete_assessment', 1, 10)
  RETURNING * INTO v_mission;
  RETURN NEXT v_mission;

  INSERT INTO public.daily_missions (student_id, mission_date, mission_type, requirement_value, xp_reward)
  VALUES (p_student_id, CURRENT_DATE, 'earn_xp', 50, 15)
  RETURNING * INTO v_mission;
  RETURN NEXT v_mission;

  INSERT INTO public.daily_missions (student_id, mission_date, mission_type, requirement_value, current_progress, completed, xp_reward)
  VALUES (p_student_id, CURRENT_DATE, 'login', 1, 1, true, 5)
  RETURNING * INTO v_mission;
  RETURN NEXT v_mission;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
BEFORE UPDATE ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rubrics_updated_at
BEFORE UPDATE ON public.rubrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worksheets_updated_at
BEFORE UPDATE ON public.worksheets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_plans_updated_at
BEFORE UPDATE ON public.lesson_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_presentations_updated_at
BEFORE UPDATE ON public.nycologic_presentations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_answer_samples_updated_at
BEFORE UPDATE ON public.teacher_answer_samples
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_images_updated_at
BEFORE UPDATE ON public.ai_generated_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parent_profiles_updated_at
BEFORE UPDATE ON public.parent_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
