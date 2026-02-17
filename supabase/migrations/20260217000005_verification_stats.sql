-- Create RPC function to get verification statistics with daily breakdown
-- This consolidates 1-2 separate API calls into 1

CREATE OR REPLACE FUNCTION get_verification_stats(
  teacher_uuid UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_approved', COUNT(*) FILTER (WHERE decision = 'approved'),
    'total_rejected', COUNT(*) FILTER (WHERE decision = 'rejected'),
    'total_verifications', COUNT(*),
    'accuracy_rate', CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE decision = 'approved')::NUMERIC / COUNT(*)) * 100, 2)
      ELSE 0 
    END,
    'daily_stats', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'date', date::TEXT,
          'approved', approved_count,
          'rejected', rejected_count,
          'total', approved_count + rejected_count,
          'accuracy', CASE 
            WHEN (approved_count + rejected_count) > 0 
            THEN ROUND((approved_count::NUMERIC / (approved_count + rejected_count)) * 100, 2)
            ELSE 0 
          END
        ) ORDER BY date
      ), '[]'::json)
      FROM (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) FILTER (WHERE decision = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE decision = 'rejected') as rejected_count
        FROM interpretation_verifications
        WHERE teacher_id = teacher_uuid
          AND created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
      ) daily
    )
  ) INTO result
  FROM interpretation_verifications
  WHERE teacher_id = teacher_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_verification_stats IS 'Returns verification statistics including total counts, accuracy rate, and daily breakdown for the specified number of days. Consolidates multiple queries into one.';
