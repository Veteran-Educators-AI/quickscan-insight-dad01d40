-- Migration: Anthropic API Balance Monitor
-- Schedules daily check of Anthropic API balance and sends email alert if below $5

-- =====================================================
-- PART 1: Enable pg_cron extension
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- PART 2: Create function to call balance check edge function
-- =====================================================

CREATE OR REPLACE FUNCTION check_anthropic_balance_cron()
RETURNS void AS $$
BEGIN
  -- Call the edge function to check balance
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/check-anthropic-balance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 3: Schedule daily balance check
-- =====================================================

-- Run every day at 9 AM UTC (4 AM EST / 5 AM EDT)
-- Adjust time as needed

SELECT cron.schedule(
  'check-anthropic-balance-daily',
  '0 9 * * *',  -- At 9:00 AM UTC every day
  $$SELECT check_anthropic_balance_cron()$$
);

-- =====================================================
-- PART 4: Create log table for balance checks (optional)
-- =====================================================

CREATE TABLE IF NOT EXISTS anthropic_balance_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  checked_at timestamptz DEFAULT now(),
  balance numeric,
  currency text DEFAULT 'USD',
  alert_sent boolean DEFAULT false,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Add RLS policy to protect logs (only admin/service can access)
ALTER TABLE anthropic_balance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage balance logs"
  ON anthropic_balance_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add index for faster queries
CREATE INDEX idx_balance_logs_checked_at ON anthropic_balance_logs(checked_at DESC);

-- =====================================================
-- PART 5: View scheduled jobs (for verification)
-- =====================================================

-- To see scheduled jobs, run:
-- SELECT * FROM cron.job;

-- To see job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- =====================================================
-- PART 6: Manual trigger (for testing)
-- =====================================================

-- To manually trigger the balance check (for testing):
-- SELECT check_anthropic_balance_cron();

-- =====================================================
-- NOTES
-- =====================================================

-- To change the schedule time:
-- SELECT cron.unschedule('check-anthropic-balance-daily');
-- SELECT cron.schedule('check-anthropic-balance-daily', '0 12 * * *', $$SELECT check_anthropic_balance_cron()$$);

-- To disable:
-- SELECT cron.unschedule('check-anthropic-balance-daily');

-- Cron format: minute hour day month weekday
-- Examples:
--   '0 9 * * *'   = 9 AM every day
--   '0 */6 * * *' = Every 6 hours
--   '0 0 * * 1'   = Midnight every Monday

COMMENT ON FUNCTION check_anthropic_balance_cron() IS 
'Scheduled function that checks Anthropic API balance and sends email alert if below threshold';

COMMENT ON TABLE anthropic_balance_logs IS
'Historical log of Anthropic API balance checks for monitoring and debugging';
