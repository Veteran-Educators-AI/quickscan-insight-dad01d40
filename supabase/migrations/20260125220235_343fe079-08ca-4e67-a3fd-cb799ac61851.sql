-- Create table for live presentation sessions
CREATE TABLE public.live_presentation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  presentation_id TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  current_slide_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  participation_mode TEXT NOT NULL DEFAULT 'individual' CHECK (participation_mode IN ('individual', 'pairs')),
  session_code TEXT NOT NULL UNIQUE,
  credit_for_participation INTEGER NOT NULL DEFAULT 5,
  deduction_for_non_participation INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for students who joined a live session
CREATE TABLE public.live_session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_presentation_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  partner_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  credit_awarded INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'left')),
  UNIQUE(session_id, student_id)
);

-- Create table for questions pushed during a live session
CREATE TABLE public.live_session_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_presentation_sessions(id) ON DELETE CASCADE,
  slide_index INTEGER NOT NULL,
  question_prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT,
  explanation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  time_limit_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create table for student answers to live questions
CREATE TABLE public.live_session_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.live_session_questions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.live_session_participants(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_taken_seconds INTEGER,
  UNIQUE(question_id, participant_id)
);

-- Enable RLS
ALTER TABLE public.live_presentation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_presentation_sessions
CREATE POLICY "Teachers can manage their own sessions"
  ON public.live_presentation_sessions
  FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view sessions for their class"
  ON public.live_presentation_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.class_id = live_presentation_sessions.class_id
      AND s.user_id = auth.uid()
    )
  );

-- RLS Policies for live_session_participants
CREATE POLICY "Teachers can view participants in their sessions"
  ON public.live_session_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_presentation_sessions lps
      WHERE lps.id = live_session_participants.session_id
      AND lps.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can manage their own participation"
  ON public.live_session_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = live_session_participants.student_id
      AND s.user_id = auth.uid()
    )
  );

-- RLS Policies for live_session_questions
CREATE POLICY "Teachers can manage questions in their sessions"
  ON public.live_session_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.live_presentation_sessions lps
      WHERE lps.id = live_session_questions.session_id
      AND lps.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view active questions in their session"
  ON public.live_session_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_session_participants lsp
      JOIN public.students s ON s.id = lsp.student_id
      WHERE lsp.session_id = live_session_questions.session_id
      AND s.user_id = auth.uid()
    )
  );

-- RLS Policies for live_session_answers
CREATE POLICY "Teachers can view all answers in their sessions"
  ON public.live_session_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_session_questions lsq
      JOIN public.live_presentation_sessions lps ON lps.id = lsq.session_id
      WHERE lsq.id = live_session_answers.question_id
      AND lps.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can manage their own answers"
  ON public.live_session_answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.live_session_participants lsp
      JOIN public.students s ON s.id = lsp.student_id
      WHERE lsp.id = live_session_answers.participant_id
      AND s.user_id = auth.uid()
    )
  );

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_presentation_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_answers;

-- Create function to update updated_at column
CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON public.live_presentation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for quick session lookup by code
CREATE INDEX idx_live_sessions_code ON public.live_presentation_sessions(session_code);
CREATE INDEX idx_live_sessions_class ON public.live_presentation_sessions(class_id, status);
CREATE INDEX idx_participants_session ON public.live_session_participants(session_id);
CREATE INDEX idx_questions_session ON public.live_session_questions(session_id, is_active);