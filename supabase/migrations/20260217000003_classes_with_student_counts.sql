-- Function to fetch classes with student counts in a single query
-- This replaces the N+1 query pattern (1 query for classes + 1 per class for counts)
CREATE OR REPLACE FUNCTION get_classes_with_student_counts(teacher_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  join_code TEXT,
  school_year TEXT,
  class_period TEXT,
  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  student_count BIGINT
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    c.id,
    c.name,
    c.join_code,
    c.school_year,
    c.class_period,
    c.created_at,
    c.archived_at,
    COALESCE(COUNT(s.id), 0) as student_count
  FROM classes c
  LEFT JOIN students s ON s.class_id = c.id
  WHERE c.teacher_id = teacher_uuid
  GROUP BY c.id, c.name, c.join_code, c.school_year, c.class_period, c.created_at, c.archived_at
  ORDER BY c.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_classes_with_student_counts(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_classes_with_student_counts IS 
'Fetches all classes for a teacher with student counts aggregated in a single query. Replaces N+1 query pattern.';
