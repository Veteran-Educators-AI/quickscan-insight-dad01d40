-- Create feature usage log table for tracking teacher activity
CREATE TABLE public.feature_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  feature_category TEXT NOT NULL DEFAULT 'general',
  action TEXT NOT NULL DEFAULT 'used',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_usage_log ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own usage logs
CREATE POLICY "Teachers can view their own usage logs"
ON public.feature_usage_log
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can insert their own usage logs
CREATE POLICY "Teachers can insert their own usage logs"
ON public.feature_usage_log
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Create index for faster queries
CREATE INDEX idx_feature_usage_log_teacher_id ON public.feature_usage_log(teacher_id);
CREATE INDEX idx_feature_usage_log_feature_name ON public.feature_usage_log(feature_name);
CREATE INDEX idx_feature_usage_log_created_at ON public.feature_usage_log(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.feature_usage_log IS 'Tracks teacher usage of various features in the application';