-- Create unified dashboard stats function
-- This function consolidates multiple queries into a single database call
-- to significantly reduce API calls from the dashboard page

CREATE OR REPLACE FUNCTION get_dashboard_stats(teacher_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  class_ids UUID[];
  student_ids UUID[];
BEGIN
  -- Get class IDs for this teacher (used in multiple subqueries)
  SELECT ARRAY_AGG(id) INTO class_ids
  FROM classes
  WHERE teacher_id = teacher_uuid AND archived_at IS NULL;

  -- Get student IDs for these classes (used in multiple subqueries)
  IF class_ids IS NOT NULL THEN
    SELECT ARRAY_AGG(s.id) INTO student_ids
    FROM students s
    WHERE s.class_id = ANY(class_ids);
  END IF;

  -- Build the complete result object
  SELECT json_build_object(
    'profile', (
      SELECT json_build_object('full_name', full_name) 
      FROM profiles 
      WHERE id = teacher_uuid
    ),
    'class_count', (
      SELECT COUNT(*) 
      FROM classes 
      WHERE teacher_id = teacher_uuid AND archived_at IS NULL
    ),
    'question_count', (
      SELECT COUNT(*) 
      FROM questions 
      WHERE teacher_id = teacher_uuid
    ),
    'student_count', (
      CASE 
        WHEN student_ids IS NOT NULL THEN array_length(student_ids, 1)
        ELSE 0
      END
    ),
    'unread_comments_count', (
      SELECT COUNT(*) 
      FROM result_comments rc
      INNER JOIN attempts a ON rc.attempt_id = a.id
      WHERE a.student_id = ANY(student_ids)
        AND rc.author_type = 'student' 
        AND rc.is_read = false
    ),
    'recent_lessons', (
      SELECT COALESCE(json_agg(lesson_data), '[]'::json)
      FROM (
        SELECT json_build_object(
          'id', id,
          'title', title,
          'topic_name', topic_name,
          'standard', standard,
          'subject', subject,
          'created_at', created_at
        ) as lesson_data
        FROM lesson_plans 
        WHERE teacher_id = teacher_uuid 
        ORDER BY created_at DESC 
        LIMIT 5
      ) recent
    ),
    'pending_scholar_data_count', (
      SELECT COUNT(*) 
      FROM sister_app_sync_log
      WHERE teacher_id = teacher_uuid 
        AND processed = false
        AND action IN ('grade_completed', 'activity_completed', 'reward_earned', 'level_up', 'achievement_unlocked', 'behavior_deduction', 'work_submitted')
    ),
    'remediation_completions', (
      SELECT json_build_object(
        'count', COUNT(*),
        'items', COALESCE(json_agg(completion_data), '[]'::json)
      )
      FROM (
        SELECT json_build_object(
          'id', id,
          'student_id', student_id,
          'action', action,
          'data', data,
          'created_at', created_at
        ) as completion_data
        FROM sister_app_sync_log
        WHERE teacher_id = teacher_uuid
          AND processed = false
          AND action IN ('activity_completed', 'grade_completed')
        ORDER BY created_at DESC
        LIMIT 10
      ) completions
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_dashboard_stats(UUID) IS 'Returns all dashboard statistics in a single call to reduce API overhead. Includes profile, counts, lessons, and notifications.';
