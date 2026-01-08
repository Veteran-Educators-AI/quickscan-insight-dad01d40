-- Create table to track AI usage per user
CREATE TABLE public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    function_name TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient querying by user and time
CREATE INDEX idx_ai_usage_user_time ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_function ON public.ai_usage_logs(function_name, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own usage
CREATE POLICY "Users can view their own AI usage"
ON public.ai_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Allow insert from edge functions (service role)
CREATE POLICY "Service role can insert usage logs"
ON public.ai_usage_logs
FOR INSERT
WITH CHECK (true);

-- Add rate limit settings to the settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS ai_hourly_limit INTEGER DEFAULT 50;

-- Create function to check rate limits (called by edge functions)
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
    p_user_id UUID,
    p_hourly_limit INTEGER DEFAULT 50,
    p_daily_limit INTEGER DEFAULT 500
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    hourly_count INTEGER;
    daily_count INTEGER;
    user_hourly_limit INTEGER;
    user_daily_limit INTEGER;
BEGIN
    -- Get user's custom limits if they exist
    SELECT COALESCE(ai_hourly_limit, p_hourly_limit), COALESCE(ai_daily_limit, p_daily_limit)
    INTO user_hourly_limit, user_daily_limit
    FROM public.settings
    WHERE teacher_id = p_user_id;
    
    -- Use defaults if no settings found
    IF user_hourly_limit IS NULL THEN
        user_hourly_limit := p_hourly_limit;
    END IF;
    IF user_daily_limit IS NULL THEN
        user_daily_limit := p_daily_limit;
    END IF;

    -- Count calls in last hour
    SELECT COUNT(*) INTO hourly_count
    FROM public.ai_usage_logs
    WHERE user_id = p_user_id
    AND created_at > now() - interval '1 hour';

    -- Count calls in last 24 hours
    SELECT COUNT(*) INTO daily_count
    FROM public.ai_usage_logs
    WHERE user_id = p_user_id
    AND created_at > now() - interval '24 hours';

    RETURN json_build_object(
        'allowed', (hourly_count < user_hourly_limit AND daily_count < user_daily_limit),
        'hourly_count', hourly_count,
        'hourly_limit', user_hourly_limit,
        'daily_count', daily_count,
        'daily_limit', user_daily_limit,
        'hourly_remaining', GREATEST(0, user_hourly_limit - hourly_count),
        'daily_remaining', GREATEST(0, user_daily_limit - daily_count)
    );
END;
$$;