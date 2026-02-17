-- Create optimized function to fetch struggling students
-- This function consolidates multiple queries and calculations into a single database call

CREATE OR REPLACE FUNCTION get_struggling_students(
  teacher_uuid UUID,
  student_limit INT DEFAULT 5
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH teacher_classes AS (
    SELECT id, name
    FROM classes
    WHERE teacher_id = teacher_uuid AND archived_at IS NULL
  ),
  class_students AS (
    SELECT 
      s.id,
      s.first_name,
      s.last_name,
      s.class_id,
      s.email,
      s.parent_email,
      c.name as class_name
    FROM students s
    INNER JOIN teacher_classes c ON s.class_id = c.id
  ),
  student_grades AS (
    SELECT 
      gh.student_id,
      gh.topic_name,
      CASE 
        WHEN gh.raw_score_possible > 0 THEN (gh.raw_score_earned::FLOAT / gh.raw_score_possible::FLOAT) * 100
        ELSE gh.grade
      END as score,
      gh.created_at
    FROM grade_history gh
    INNER JOIN class_students cs ON gh.student_id = cs.id
  ),
  student_stats AS (
    SELECT 
      cs.id,
      cs.first_name,
      cs.last_name,
      cs.class_id,
      cs.class_name,
      cs.email,
      cs.parent_email,
      ROUND(AVG(sg.score))::INT as average_grade,
      COUNT(DISTINCT CASE WHEN topic_avg.avg_score < 70 THEN sg.topic_name END) as weak_topic_count,
      json_agg(DISTINCT sg.topic_name) FILTER (WHERE topic_avg.avg_score < 70) as weak_topics,
      MAX(sg.created_at) as last_assessment_date,
      -- Calculate trend
      CASE 
        WHEN COUNT(sg.score) < 2 THEN 'stable'
        WHEN (
          AVG(sg.score) FILTER (WHERE sg.created_at >= NOW() - INTERVAL '14 days')
          - AVG(sg.score) FILTER (WHERE sg.created_at >= NOW() - INTERVAL '28 days' AND sg.created_at < NOW() - INTERVAL '14 days')
        ) > 5 THEN 'improving'
        WHEN (
          AVG(sg.score) FILTER (WHERE sg.created_at >= NOW() - INTERVAL '28 days' AND sg.created_at < NOW() - INTERVAL '14 days')
          - AVG(sg.score) FILTER (WHERE sg.created_at >= NOW() - INTERVAL '14 days')
        ) > 5 THEN 'declining'
        ELSE 'stable'
      END as trend
    FROM class_students cs
    LEFT JOIN student_grades sg ON cs.id = sg.student_id
    LEFT JOIN (
      SELECT student_id, topic_name, AVG(score) as avg_score
      FROM student_grades
      GROUP BY student_id, topic_name
    ) topic_avg ON cs.id = topic_avg.student_id AND sg.topic_name = topic_avg.topic_name
    GROUP BY cs.id, cs.first_name, cs.last_name, cs.class_id, cs.class_name, cs.email, cs.parent_email
    HAVING AVG(sg.score) < 70 OR COUNT(DISTINCT CASE WHEN topic_avg.avg_score < 70 THEN sg.topic_name END) > 0
    ORDER BY AVG(sg.score) ASC
    LIMIT student_limit
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', id,
      'firstName', first_name,
      'lastName', last_name,
      'classId', class_id,
      'className', class_name,
      'averageGrade', average_grade,
      'weakTopicCount', weak_topic_count,
      'weakTopics', weak_topics,
      'trend', trend,
      'lastAssessmentDate', last_assessment_date,
      'email', email,
      'parentEmail', parent_email
    )
  ), '[]'::json) INTO result
  FROM student_stats;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_struggling_students(UUID, INT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_struggling_students(UUID, INT) IS 'Returns struggling students (grade < 70% or weak topics) with all related data in a single optimized query.';
