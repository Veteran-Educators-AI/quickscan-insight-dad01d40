-- Drop the foreign key constraint on sister_app_sync_log.student_id
-- Sync logs need to accept student IDs that may not exist locally yet
ALTER TABLE public.sister_app_sync_log 
DROP CONSTRAINT IF EXISTS sister_app_sync_log_student_id_fkey;
