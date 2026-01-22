-- ============================================================================
-- CORE SCHEMA MIGRATION
-- Foundation tables, types, triggers, and base RLS policies
-- Consolidated from: 20260105202957, 20260105222258
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

CREATE TYPE public.attempt_status AS ENUM (
    'pending',
    'analyzed',
    'reviewed'
);

CREATE TYPE public.user_role AS ENUM (
    'teacher',
    'student',
    'admin'
);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'teacher'
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

SET default_table_access_method = heap;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    role public.user_role DEFAULT 'teacher'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Classes
CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    name text NOT NULL,
    join_code text NOT NULL,
    school_year text,
    class_period text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Students
CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    student_id text,
    email text,
    user_id uuid,
    parent_email text,
    custom_pseudonym text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON COLUMN public.students.parent_email IS 'Parent/guardian email for notifications';
COMMENT ON COLUMN public.students.custom_pseudonym IS 'Teacher-assigned pseudonym override for FERPA compliance';

-- Topics
CREATE TABLE public.topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid,
    name text NOT NULL,
    description text,
    parent_id uuid,
    is_default boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Questions
CREATE TABLE public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    jmap_url text,
    jmap_id text,
    prompt_text text,
    prompt_image_url text,
    answer_text text,
    answer_image_url text,
    difficulty integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assessment_mode text DEFAULT 'teacher'::text NOT NULL,
    CONSTRAINT questions_assessment_mode_check CHECK ((assessment_mode = ANY (ARRAY['teacher'::text, 'ai'::text]))),
    CONSTRAINT questions_difficulty_check CHECK (((difficulty >= 1) AND (difficulty <= 5)))
);

-- Question Topics (junction table)
CREATE TABLE public.question_topics (
    question_id uuid NOT NULL,
    topic_id uuid NOT NULL
);

-- Assessments
CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    class_id uuid,
    name text NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Assessment Questions (junction table)
CREATE TABLE public.assessment_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    question_id uuid NOT NULL,
    sort_order integer DEFAULT 0
);

-- Rubrics
CREATE TABLE public.rubrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    step_number integer NOT NULL,
    description text NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Attempts
CREATE TABLE public.attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    assessment_id uuid,
    question_id uuid NOT NULL,
    status public.attempt_status DEFAULT 'pending'::public.attempt_status NOT NULL,
    qr_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Attempt Images
CREATE TABLE public.attempt_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    image_url text NOT NULL,
    processed_image_url text,
    ocr_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Attempt Misconceptions
CREATE TABLE public.attempt_misconceptions (
    attempt_id uuid NOT NULL,
    misconception_id uuid NOT NULL,
    confidence numeric(3,2) DEFAULT 1.0
);

-- Misconception Tags
CREATE TABLE public.misconception_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic_id uuid,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Scores
CREATE TABLE public.scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    rubric_id uuid,
    points_earned numeric(5,2) DEFAULT 0,
    is_auto_scored boolean DEFAULT true,
    teacher_override boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Settings
CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    grading_scale jsonb DEFAULT '{"A": 90, "B": 80, "C": 70, "D": 60}'::jsonb,
    analysis_provider text DEFAULT 'mock'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Push Subscriptions
CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================================================
-- PRIMARY KEYS
-- ============================================================================

ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.classes ADD CONSTRAINT classes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.classes ADD CONSTRAINT classes_join_code_key UNIQUE (join_code);
ALTER TABLE ONLY public.students ADD CONSTRAINT students_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.topics ADD CONSTRAINT topics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.questions ADD CONSTRAINT questions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.question_topics ADD CONSTRAINT question_topics_pkey PRIMARY KEY (question_id, topic_id);
ALTER TABLE ONLY public.assessments ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.assessment_questions ADD CONSTRAINT assessment_questions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.rubrics ADD CONSTRAINT rubrics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attempts ADD CONSTRAINT attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attempt_images ADD CONSTRAINT attempt_images_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attempt_misconceptions ADD CONSTRAINT attempt_misconceptions_pkey PRIMARY KEY (attempt_id, misconception_id);
ALTER TABLE ONLY public.misconception_tags ADD CONSTRAINT misconception_tags_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.scores ADD CONSTRAINT scores_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.settings ADD CONSTRAINT settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.settings ADD CONSTRAINT settings_teacher_id_key UNIQUE (teacher_id);
ALTER TABLE ONLY public.push_subscriptions ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_attempts_updated_at BEFORE UPDATE ON public.attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.classes ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.students ADD CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.students ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.topics ADD CONSTRAINT topics_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.topics(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.topics ADD CONSTRAINT topics_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.questions ADD CONSTRAINT questions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.question_topics ADD CONSTRAINT question_topics_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.question_topics ADD CONSTRAINT question_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.assessments ADD CONSTRAINT assessments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.assessments ADD CONSTRAINT assessments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.assessment_questions ADD CONSTRAINT assessment_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.assessment_questions ADD CONSTRAINT assessment_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.rubrics ADD CONSTRAINT rubrics_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attempts ADD CONSTRAINT attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attempts ADD CONSTRAINT attempts_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.attempts ADD CONSTRAINT attempts_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attempt_images ADD CONSTRAINT attempt_images_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attempt_misconceptions ADD CONSTRAINT attempt_misconceptions_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attempt_misconceptions ADD CONSTRAINT attempt_misconceptions_misconception_id_fkey FOREIGN KEY (misconception_id) REFERENCES public.misconception_tags(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.misconception_tags ADD CONSTRAINT misconception_tags_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.scores ADD CONSTRAINT scores_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.scores ADD CONSTRAINT scores_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.settings ADD CONSTRAINT settings_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_misconceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misconception_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - PROFILES
-- ============================================================================

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));

-- ============================================================================
-- RLS POLICIES - CLASSES
-- ============================================================================

CREATE POLICY "Teachers can view their own classes" ON public.classes FOR SELECT USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can create classes" ON public.classes FOR INSERT WITH CHECK ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can update their own classes" ON public.classes FOR UPDATE USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can delete their own classes" ON public.classes FOR DELETE USING ((auth.uid() = teacher_id));

-- ============================================================================
-- RLS POLICIES - STUDENTS
-- ============================================================================

CREATE POLICY "Teachers can view students in their classes" ON public.students FOR SELECT USING ((EXISTS ( SELECT 1 FROM public.classes WHERE ((classes.id = students.class_id) AND (classes.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can manage students in their classes" ON public.students FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM public.classes WHERE ((classes.id = students.class_id) AND (classes.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can update students in their classes" ON public.students FOR UPDATE USING ((EXISTS ( SELECT 1 FROM public.classes WHERE ((classes.id = students.class_id) AND (classes.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can delete students in their classes" ON public.students FOR DELETE USING ((EXISTS ( SELECT 1 FROM public.classes WHERE ((classes.id = students.class_id) AND (classes.teacher_id = auth.uid())))));

-- ============================================================================
-- RLS POLICIES - TOPICS
-- ============================================================================

CREATE POLICY "Users can view default topics" ON public.topics FOR SELECT USING (((is_default = true) OR (teacher_id = auth.uid())));
CREATE POLICY "Teachers can create custom topics" ON public.topics FOR INSERT WITH CHECK ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can update their custom topics" ON public.topics FOR UPDATE USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can delete their custom topics" ON public.topics FOR DELETE USING ((auth.uid() = teacher_id));

-- ============================================================================
-- RLS POLICIES - QUESTIONS
-- ============================================================================

CREATE POLICY "Teachers can view their own questions" ON public.questions FOR SELECT USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can create questions" ON public.questions FOR INSERT WITH CHECK ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can update their own questions" ON public.questions FOR UPDATE USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can delete their own questions" ON public.questions FOR DELETE USING ((auth.uid() = teacher_id));

-- ============================================================================
-- RLS POLICIES - QUESTION TOPICS
-- ============================================================================

CREATE POLICY "Users can view question topics" ON public.question_topics FOR SELECT USING ((EXISTS ( SELECT 1 FROM public.questions WHERE ((questions.id = question_topics.question_id) AND (questions.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can manage question topics" ON public.question_topics USING ((EXISTS ( SELECT 1 FROM public.questions WHERE ((questions.id = question_topics.question_id) AND (questions.teacher_id = auth.uid())))));

-- ============================================================================
-- RLS POLICIES - ASSESSMENTS
-- ============================================================================

CREATE POLICY "Teachers can view their own assessments" ON public.assessments FOR SELECT USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can create assessments" ON public.assessments FOR INSERT WITH CHECK ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can update their own assessments" ON public.assessments FOR UPDATE USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can delete their own assessments" ON public.assessments FOR DELETE USING ((auth.uid() = teacher_id));

-- ============================================================================
-- RLS POLICIES - ASSESSMENT QUESTIONS
-- ============================================================================

CREATE POLICY "Teachers can view assessment questions" ON public.assessment_questions FOR SELECT USING ((EXISTS ( SELECT 1 FROM public.assessments WHERE ((assessments.id = assessment_questions.assessment_id) AND (assessments.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can manage assessment questions" ON public.assessment_questions USING ((EXISTS ( SELECT 1 FROM public.assessments WHERE ((assessments.id = assessment_questions.assessment_id) AND (assessments.teacher_id = auth.uid())))));

-- ============================================================================
-- RLS POLICIES - RUBRICS
-- ============================================================================

CREATE POLICY "Teachers can view rubrics for their questions" ON public.rubrics FOR SELECT USING ((EXISTS ( SELECT 1 FROM public.questions WHERE ((questions.id = rubrics.question_id) AND (questions.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can manage rubrics" ON public.rubrics USING ((EXISTS ( SELECT 1 FROM public.questions WHERE ((questions.id = rubrics.question_id) AND (questions.teacher_id = auth.uid())))));

-- ============================================================================
-- RLS POLICIES - ATTEMPTS
-- ============================================================================

CREATE POLICY "Teachers can view attempts for their students" ON public.attempts FOR SELECT USING ((EXISTS ( SELECT 1 FROM (public.students JOIN public.classes ON ((students.class_id = classes.id))) WHERE ((students.id = attempts.student_id) AND (classes.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can manage attempts" ON public.attempts USING ((EXISTS ( SELECT 1 FROM (public.students JOIN public.classes ON ((students.class_id = classes.id))) WHERE ((students.id = attempts.student_id) AND (classes.teacher_id = auth.uid())))));

-- ============================================================================
-- RLS POLICIES - ATTEMPT IMAGES
-- ============================================================================

CREATE POLICY "Teachers can view attempt images" ON public.attempt_images FOR SELECT USING ((EXISTS ( SELECT 1 FROM ((public.attempts JOIN public.students ON ((attempts.student_id = students.id))) JOIN public.classes ON ((students.class_id = classes.id))) WHERE ((attempts.id = attempt_images.attempt_id) AND (classes.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can manage attempt images" ON public.attempt_images USING ((EXISTS ( SELECT 1 FROM ((public.attempts JOIN public.students ON ((attempts.student_id = students.id))) JOIN public.classes ON ((students.class_id = classes.id))) WHERE ((attempts.id = attempt_images.attempt_id) AND (classes.teacher_id = auth.uid())))));

-- ============================================================================
-- RLS POLICIES - ATTEMPT MISCONCEPTIONS
-- ============================================================================

CREATE POLICY "Teachers can view attempt misconceptions" ON public.attempt_misconceptions FOR SELECT USING ((EXISTS ( SELECT 1 FROM ((public.attempts JOIN public.students ON ((attempts.student_id = students.id))) JOIN public.classes ON ((students.class_id = classes.id))) WHERE ((attempts.id = attempt_misconceptions.attempt_id) AND (classes.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can manage attempt misconceptions" ON public.attempt_misconceptions USING ((EXISTS ( SELECT 1 FROM ((public.attempts JOIN public.students ON ((attempts.student_id = students.id))) JOIN public.classes ON ((students.class_id = classes.id))) WHERE ((attempts.id = attempt_misconceptions.attempt_id) AND (classes.teacher_id = auth.uid())))));

-- ============================================================================
-- RLS POLICIES - MISCONCEPTION TAGS
-- ============================================================================

CREATE POLICY "Users can view misconception tags" ON public.misconception_tags FOR SELECT USING ((EXISTS ( SELECT 1 FROM public.topics WHERE ((topics.id = misconception_tags.topic_id) AND ((topics.is_default = true) OR (topics.teacher_id = auth.uid()))))));
CREATE POLICY "Teachers can manage misconception tags" ON public.misconception_tags USING ((EXISTS ( SELECT 1 FROM public.topics WHERE ((topics.id = misconception_tags.topic_id) AND (topics.teacher_id = auth.uid())))));

-- ============================================================================
-- RLS POLICIES - SCORES
-- ============================================================================

CREATE POLICY "Teachers can view scores" ON public.scores FOR SELECT USING ((EXISTS ( SELECT 1 FROM ((public.attempts JOIN public.students ON ((attempts.student_id = students.id))) JOIN public.classes ON ((students.class_id = classes.id))) WHERE ((attempts.id = scores.attempt_id) AND (classes.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can manage scores" ON public.scores USING ((EXISTS ( SELECT 1 FROM ((public.attempts JOIN public.students ON ((attempts.student_id = students.id))) JOIN public.classes ON ((students.class_id = classes.id))) WHERE ((attempts.id = scores.attempt_id) AND (classes.teacher_id = auth.uid())))));

-- ============================================================================
-- RLS POLICIES - SETTINGS
-- ============================================================================

CREATE POLICY "Teachers can view their own settings" ON public.settings FOR SELECT USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can manage their own settings" ON public.settings USING ((auth.uid() = teacher_id));

-- ============================================================================
-- RLS POLICIES - PUSH SUBSCRIPTIONS
-- ============================================================================

CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can create their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));

-- ============================================================================
-- AUTH TRIGGER
-- ============================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for any existing users without one
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', au.email),
  'teacher'::public.user_role
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;
