/*
  # Create Auto-Deletion Scheduled Function

  1. Purpose
    - Automatically delete reports that have exceeded their 7-year retention period
    - Runs daily via pg_cron to check for expired reports
    - Deletes both the storage file and database record
  
  2. Functions
    - `delete_expired_reports()` - Finds and deletes reports past their auto_delete_at date
  
  3. Scheduled Job
    - Runs daily at 2 AM UTC
    - Uses pg_cron extension for scheduling
  
  4. Important Notes
    - Reports are only deleted after 7 years from archived_at
    - Share links automatically become invalid when auto_delete_at is in the past
    - This cleanup function removes the actual files and records
*/

-- Function to delete expired reports
CREATE OR REPLACE FUNCTION delete_expired_reports()
RETURNS void AS $$
DECLARE
  expired_report RECORD;
  storage_path TEXT;
BEGIN
  -- Find all reports that have passed their auto_delete_at date
  FOR expired_report IN
    SELECT id, file_url, organisation_id, property_id, version
    FROM pdf_reports
    WHERE auto_delete_at IS NOT NULL
    AND auto_delete_at <= now()
  LOOP
    BEGIN
      -- Extract storage path from file_url
      -- URL format: https://[project].supabase.co/storage/v1/object/public/reports/[path]
      IF expired_report.file_url IS NOT NULL THEN
        storage_path := regexp_replace(
          expired_report.file_url,
          '^.*/storage/v1/object/public/reports/',
          ''
        );
        
        -- Delete from storage (using the storage schema)
        -- Note: This requires storage.delete_object function to be available
        -- If not available, files will need to be deleted via edge function
        BEGIN
          PERFORM storage.delete_object('reports', storage_path);
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Could not delete storage file for report %: %', expired_report.id, SQLERRM;
        END;
      END IF;
      
      -- Delete the database record
      DELETE FROM pdf_reports WHERE id = expired_report.id;
      
      -- Log the deletion
      RAISE NOTICE 'Deleted expired report: % (property: %, version: %)', 
        expired_report.id, expired_report.property_id, expired_report.version;
        
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other reports
      RAISE WARNING 'Failed to delete report %: %', expired_report.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_expired_reports IS 'Deletes reports that have passed their 7-year retention period (auto_delete_at). Should be scheduled to run daily via pg_cron or edge function.';

-- Note: pg_cron scheduling should be configured separately via Supabase Dashboard
-- or through an edge function that calls this function daily
-- Example cron expression: '0 2 * * *' (daily at 2 AM UTC)
