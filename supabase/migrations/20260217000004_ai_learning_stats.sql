-- Create RPC function to get all AI learning statistics in a single query
-- This consolidates 4-5 separate API calls into 1

CREATE OR REPLACE FUNCTION get_ai_learning_stats(teacher_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'grading_corrections', (
      SELECT json_build_object(
        'count', COUNT(*),
        'avg_adjustment', COALESCE(AVG(corrected_grade - ai_grade), 0),
        'dominant_style', (
          SELECT strictness_indicator
          FROM grading_corrections
          WHERE teacher_id = teacher_uuid
            AND strictness_indicator IS NOT NULL
          GROUP BY strictness_indicator
          ORDER BY COUNT(*) DESC
          LIMIT 1
        )
      )
      FROM grading_corrections
      WHERE teacher_id = teacher_uuid
    ),
    'interpretation_verifications', (
      SELECT json_build_object(
        'total_count', COUNT(*),
        'approved_count', COUNT(*) FILTER (WHERE decision = 'approved'),
        'rejected_count', COUNT(*) FILTER (WHERE decision = 'rejected'),
        'accuracy_rate', CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE decision = 'approved')::NUMERIC / COUNT(*)) * 100, 2)
          ELSE 0 
        END
      )
      FROM interpretation_verifications
      WHERE teacher_id = teacher_uuid
    ),
    'name_corrections', (
      SELECT json_build_object(
        'total_count', COUNT(*)
      )
      FROM name_corrections
      WHERE teacher_id = teacher_uuid
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_ai_learning_stats IS 'Consolidates AI learning statistics from multiple tables into a single query. Returns grading corrections count/stats, interpretation verifications count/accuracy, and name corrections count.';
