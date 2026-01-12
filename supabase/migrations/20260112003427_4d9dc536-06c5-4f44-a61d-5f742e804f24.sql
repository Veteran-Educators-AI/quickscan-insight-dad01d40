-- Create table for teacher API keys
CREATE TABLE public.teacher_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Sister App Key',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(teacher_id, name)
);

-- Enable RLS
ALTER TABLE public.teacher_api_keys ENABLE ROW LEVEL SECURITY;

-- Teachers can only see their own API keys
CREATE POLICY "Teachers can view their own API keys"
ON public.teacher_api_keys
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can create their own API keys
CREATE POLICY "Teachers can create their own API keys"
ON public.teacher_api_keys
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own API keys
CREATE POLICY "Teachers can update their own API keys"
ON public.teacher_api_keys
FOR UPDATE
USING (auth.uid() = teacher_id);

-- Teachers can delete their own API keys
CREATE POLICY "Teachers can delete their own API keys"
ON public.teacher_api_keys
FOR DELETE
USING (auth.uid() = teacher_id);

-- Create table to log incoming sync data from sister app
CREATE TABLE public.sister_app_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  source_app TEXT NOT NULL DEFAULT 'sister_app',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.sister_app_sync_log ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own sync logs
CREATE POLICY "Teachers can view their own sync logs"
ON public.sister_app_sync_log
FOR SELECT
USING (auth.uid() = teacher_id);