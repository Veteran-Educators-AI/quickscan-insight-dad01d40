CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: attempt_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attempt_status AS ENUM (
    'pending',
    'analyzed',
    'reviewed'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'teacher',
    'student',
    'admin'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

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

--
-- Name: assessment_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    question_id uuid NOT NULL,
    sort_order integer DEFAULT 0
);


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    class_id uuid,
    name text NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attempt_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempt_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    image_url text NOT NULL,
    processed_image_url text,
    ocr_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attempt_misconceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempt_misconceptions (
    attempt_id uuid NOT NULL,
    misconception_id uuid NOT NULL,
    confidence numeric(3,2) DEFAULT 1.0
);


--
-- Name: attempts; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    name text NOT NULL,
    join_code text NOT NULL,
    school_year text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: misconception_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.misconception_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic_id uuid,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    role public.user_role DEFAULT 'teacher'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_topics (
    question_id uuid NOT NULL,
    topic_id uuid NOT NULL
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: rubrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    step_number integer NOT NULL,
    description text NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scores; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    grading_scale jsonb DEFAULT '{"A": 90, "B": 80, "C": 70, "D": 60}'::jsonb,
    analysis_provider text DEFAULT 'mock'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    student_id text,
    email text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: topics; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: assessment_questions assessment_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: attempt_images attempt_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_images
    ADD CONSTRAINT attempt_images_pkey PRIMARY KEY (id);


--
-- Name: attempt_misconceptions attempt_misconceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_misconceptions
    ADD CONSTRAINT attempt_misconceptions_pkey PRIMARY KEY (attempt_id, misconception_id);


--
-- Name: attempts attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_pkey PRIMARY KEY (id);


--
-- Name: classes classes_join_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_join_code_key UNIQUE (join_code);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: misconception_tags misconception_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.misconception_tags
    ADD CONSTRAINT misconception_tags_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: question_topics question_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_topics
    ADD CONSTRAINT question_topics_pkey PRIMARY KEY (question_id, topic_id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: rubrics rubrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_pkey PRIMARY KEY (id);


--
-- Name: scores scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: settings settings_teacher_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_teacher_id_key UNIQUE (teacher_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);


--
-- Name: assessments update_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attempts update_attempts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_attempts_updated_at BEFORE UPDATE ON public.attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: classes update_classes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: questions update_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scores update_scores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: students update_students_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assessment_questions assessment_questions_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_questions assessment_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- Name: assessments assessments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: attempt_images attempt_images_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_images
    ADD CONSTRAINT attempt_images_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: attempt_misconceptions attempt_misconceptions_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_misconceptions
    ADD CONSTRAINT attempt_misconceptions_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: attempt_misconceptions attempt_misconceptions_misconception_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_misconceptions
    ADD CONSTRAINT attempt_misconceptions_misconception_id_fkey FOREIGN KEY (misconception_id) REFERENCES public.misconception_tags(id) ON DELETE CASCADE;


--
-- Name: attempts attempts_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE SET NULL;


--
-- Name: attempts attempts_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: attempts attempts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: classes classes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: misconception_tags misconception_tags_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.misconception_tags
    ADD CONSTRAINT misconception_tags_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: question_topics question_topics_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_topics
    ADD CONSTRAINT question_topics_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_topics question_topics_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_topics
    ADD CONSTRAINT question_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;


--
-- Name: questions questions_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: rubrics rubrics_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: scores scores_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: scores scores_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE SET NULL;


--
-- Name: settings settings_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: students students_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: topics topics_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.topics(id) ON DELETE CASCADE;


--
-- Name: topics topics_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: assessments Teachers can create assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can create assessments" ON public.assessments FOR INSERT WITH CHECK ((auth.uid() = teacher_id));


--
-- Name: classes Teachers can create classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can create classes" ON public.classes FOR INSERT WITH CHECK ((auth.uid() = teacher_id));


--
-- Name: topics Teachers can create custom topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can create custom topics" ON public.topics FOR INSERT WITH CHECK ((auth.uid() = teacher_id));


--
-- Name: questions Teachers can create questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can create questions" ON public.questions FOR INSERT WITH CHECK ((auth.uid() = teacher_id));


--
-- Name: students Teachers can delete students in their classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can delete students in their classes" ON public.students FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = students.class_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: topics Teachers can delete their custom topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can delete their custom topics" ON public.topics FOR DELETE USING ((auth.uid() = teacher_id));


--
-- Name: assessments Teachers can delete their own assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can delete their own assessments" ON public.assessments FOR DELETE USING ((auth.uid() = teacher_id));


--
-- Name: classes Teachers can delete their own classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can delete their own classes" ON public.classes FOR DELETE USING ((auth.uid() = teacher_id));


--
-- Name: questions Teachers can delete their own questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can delete their own questions" ON public.questions FOR DELETE USING ((auth.uid() = teacher_id));


--
-- Name: assessment_questions Teachers can manage assessment questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can manage assessment questions" ON public.assessment_questions USING ((EXISTS ( SELECT 1
   FROM public.assessments
  WHERE ((assessments.id = assessment_questions.assessment_id) AND (assessments.teacher_id = auth.uid())))));


--
-- Name: attempt_images Teachers can manage attempt images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can manage attempt images" ON public.attempt_images USING ((EXISTS ( SELECT 1
   FROM ((public.attempts
     JOIN public.students ON ((attempts.student_id = students.id)))
     JOIN public.classes ON ((students.class_id = classes.id)))
  WHERE ((attempts.id = attempt_images.attempt_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: attempt_misconceptions Teachers can manage attempt misconceptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can manage attempt misconceptions" ON public.attempt_misconceptions USING ((EXISTS ( SELECT 1
   FROM ((public.attempts
     JOIN public.students ON ((attempts.student_id = students.id)))
     JOIN public.classes ON ((students.class_id = classes.id)))
  WHERE ((attempts.id = attempt_misconceptions.attempt_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: attempts Teachers can manage attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can manage attempts" ON public.attempts USING ((EXISTS ( SELECT 1
   FROM (public.students
     JOIN public.classes ON ((students.class_id = classes.id)))
  WHERE ((students.id = attempts.student_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: misconception_tags Teachers can manage misconception tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can manage misconception tags" ON public.misconception_tags USING ((EXISTS ( SELECT 1
   FROM public.topics
  WHERE ((topics.id = misconception_tags.topic_id) AND (topics.teacher_id = auth.uid())))));


--
-- Name: question_topics Teachers can manage question topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can manage question topics" ON public.question_topics USING ((EXISTS ( SELECT 1
   FROM public.questions
  WHERE ((questions.id = question_topics.question_id) AND (questions.teacher_id = auth.uid())))));


--
-- Name: rubrics Teachers can manage rubrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can manage rubrics" ON public.rubrics USING ((EXISTS ( SELECT 1
   FROM public.questions
  WHERE ((questions.id = rubrics.question_id) AND (questions.teacher_id = auth.uid())))));


--
-- Name: scores Teachers can manage scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can manage scores" ON public.scores USING ((EXISTS ( SELECT 1
   FROM ((public.attempts
     JOIN public.students ON ((attempts.student_id = students.id)))
     JOIN public.classes ON ((students.class_id = classes.id)))
  WHERE ((attempts.id = scores.attempt_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: students Teachers can manage students in their classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can manage students in their classes" ON public.students FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = students.class_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: settings Teachers can manage their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can manage their own settings" ON public.settings USING ((auth.uid() = teacher_id));


--
-- Name: students Teachers can update students in their classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can update students in their classes" ON public.students FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = students.class_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: topics Teachers can update their custom topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can update their custom topics" ON public.topics FOR UPDATE USING ((auth.uid() = teacher_id));


--
-- Name: assessments Teachers can update their own assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can update their own assessments" ON public.assessments FOR UPDATE USING ((auth.uid() = teacher_id));


--
-- Name: classes Teachers can update their own classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can update their own classes" ON public.classes FOR UPDATE USING ((auth.uid() = teacher_id));


--
-- Name: questions Teachers can update their own questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can update their own questions" ON public.questions FOR UPDATE USING ((auth.uid() = teacher_id));


--
-- Name: assessment_questions Teachers can view assessment questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view assessment questions" ON public.assessment_questions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.assessments
  WHERE ((assessments.id = assessment_questions.assessment_id) AND (assessments.teacher_id = auth.uid())))));


--
-- Name: attempt_images Teachers can view attempt images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view attempt images" ON public.attempt_images FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.attempts
     JOIN public.students ON ((attempts.student_id = students.id)))
     JOIN public.classes ON ((students.class_id = classes.id)))
  WHERE ((attempts.id = attempt_images.attempt_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: attempt_misconceptions Teachers can view attempt misconceptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view attempt misconceptions" ON public.attempt_misconceptions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.attempts
     JOIN public.students ON ((attempts.student_id = students.id)))
     JOIN public.classes ON ((students.class_id = classes.id)))
  WHERE ((attempts.id = attempt_misconceptions.attempt_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: attempts Teachers can view attempts for their students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view attempts for their students" ON public.attempts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.students
     JOIN public.classes ON ((students.class_id = classes.id)))
  WHERE ((students.id = attempts.student_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: rubrics Teachers can view rubrics for their questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view rubrics for their questions" ON public.rubrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.questions
  WHERE ((questions.id = rubrics.question_id) AND (questions.teacher_id = auth.uid())))));


--
-- Name: scores Teachers can view scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view scores" ON public.scores FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.attempts
     JOIN public.students ON ((attempts.student_id = students.id)))
     JOIN public.classes ON ((students.class_id = classes.id)))
  WHERE ((attempts.id = scores.attempt_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: students Teachers can view students in their classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view students in their classes" ON public.students FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = students.class_id) AND (classes.teacher_id = auth.uid())))));


--
-- Name: assessments Teachers can view their own assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view their own assessments" ON public.assessments FOR SELECT USING ((auth.uid() = teacher_id));


--
-- Name: classes Teachers can view their own classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view their own classes" ON public.classes FOR SELECT USING ((auth.uid() = teacher_id));


--
-- Name: questions Teachers can view their own questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view their own questions" ON public.questions FOR SELECT USING ((auth.uid() = teacher_id));


--
-- Name: settings Teachers can view their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view their own settings" ON public.settings FOR SELECT USING ((auth.uid() = teacher_id));


--
-- Name: push_subscriptions Users can create their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can delete their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: topics Users can view default topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view default topics" ON public.topics FOR SELECT USING (((is_default = true) OR (teacher_id = auth.uid())));


--
-- Name: misconception_tags Users can view misconception tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view misconception tags" ON public.misconception_tags FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.topics
  WHERE ((topics.id = misconception_tags.topic_id) AND ((topics.is_default = true) OR (topics.teacher_id = auth.uid()))))));


--
-- Name: question_topics Users can view question topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view question topics" ON public.question_topics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.questions
  WHERE ((questions.id = question_topics.question_id) AND (questions.teacher_id = auth.uid())))));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: push_subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: assessment_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: attempt_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attempt_images ENABLE ROW LEVEL SECURITY;

--
-- Name: attempt_misconceptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attempt_misconceptions ENABLE ROW LEVEL SECURITY;

--
-- Name: attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: classes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

--
-- Name: misconception_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.misconception_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: question_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

--
-- Name: rubrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;

--
-- Name: scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;