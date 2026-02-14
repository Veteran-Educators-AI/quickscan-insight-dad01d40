-- Migration: Email Notification System for Scholar Quest
-- Adds triggers to automatically send emails via Brevo when:
-- 1. Student completes an assignment → notify teacher
-- 2. Teacher posts new assignment → notify students

-- =====================================================
-- PART 1: Trigger for Teacher Notifications (Assignment Completion)
-- =====================================================

-- This function calls the edge function when a student completes an assignment
CREATE OR REPLACE FUNCTION notify_teacher_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  assignment_record RECORD;
BEGIN
  -- Only proceed if completed_at was just set (wasn't set before)
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD IS NULL) THEN
    
    -- Fetch assignment details to ensure it exists
    SELECT id, class_id INTO assignment_record
    FROM assignments
    WHERE id = NEW.assignment_id;
    
    IF assignment_record IS NOT NULL THEN
      -- Call the edge function asynchronously using pg_net extension
      -- Note: This requires pg_net extension to be enabled in Supabase
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/notify-teacher-completion',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'student_id', NEW.student_id,
          'assignment_id', NEW.assignment_id,
          'completed_at', NEW.completed_at
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on student_progress table
-- Adjust table name if your completion tracking uses a different table
DROP TRIGGER IF EXISTS trigger_notify_teacher_completion ON student_progress;
CREATE TRIGGER trigger_notify_teacher_completion
  AFTER INSERT OR UPDATE OF completed_at ON student_progress
  FOR EACH ROW
  EXECUTE FUNCTION notify_teacher_on_completion();

-- =====================================================
-- PART 2: Trigger for Student Notifications (New Assignment)
-- =====================================================

-- This function calls the edge function when a teacher posts a new assignment
CREATE OR REPLACE FUNCTION notify_students_new_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send notifications for newly created assignments
  IF TG_OP = 'INSERT' THEN
    
    -- Call the edge function asynchronously
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notify-student-new-assignment',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'assignment_id', NEW.id,
        'class_id', NEW.class_id,
        'teacher_id', (SELECT teacher_id FROM classes WHERE id = NEW.class_id)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on assignments table
DROP TRIGGER IF EXISTS trigger_notify_students_new_assignment ON assignments;
CREATE TRIGGER trigger_notify_students_new_assignment
  AFTER INSERT ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_students_new_assignment();

-- =====================================================
-- PART 3: Enable pg_net extension (if not already enabled)
-- =====================================================

-- This extension allows PostgreSQL to make HTTP requests
-- Required for calling Supabase Edge Functions from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- PART 4: Set configuration variables
-- =====================================================

-- These need to be set in Supabase Dashboard → Project Settings → Database Settings → Custom Postgres Config
-- Or run these as superuser:

-- ALTER DATABASE postgres SET app.supabase_url = 'https://rjlqmfthemfpetpcydog.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';

-- NOTE: For security, do NOT hardcode the service role key in this migration.
-- Set it via Supabase dashboard or environment variables.

COMMENT ON FUNCTION notify_teacher_on_completion() IS 
'Triggers email notification to teacher when student completes assignment';

COMMENT ON FUNCTION notify_students_new_assignment() IS 
'Triggers email notification to all students when new assignment is posted';
