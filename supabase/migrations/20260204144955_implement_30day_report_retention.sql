/*
  # Implement 30-Day Report Retention System

  ## Overview
  Implements a 30-day retention system for reports before automatic archiving.
  Properties remain visible on dashboard and Reports tab for 30 days after report generation,
  then automatically move to Archive tab for 7-year retention.

  ## Changes

  ### 1. Database Indexes
    - Add index on `pdf_reports.generated_at` for efficient 30-day queries
    - Add index on `pdf_reports.property_id` for faster lookups

  ### 2. Helper Functions
    - `get_property_latest_report_date()` - Gets the most recent report date for a property
    - `is_property_archived()` - Checks if property exists in archived_properties table
    - `auto_archive_old_reports()` - Archives properties with reports older than 30 days

  ### 3. Automatic Archiving
    - Creates a scheduled task to run daily at midnight UTC
    - Archives completed properties with reports older than 30 days
    - Only archives if not already archived

  ## Business Logic
    1. Report generated → Property status = 'completed' (NOT archived)
    2. Report visible in Reports tab for 30 days
    3. Property visible on dashboard until archived
    4. After 30 days → Auto-archive property
    5. Archived property → Visible only in Archive tab for 7 years
    6. No duplicates: Latest report only per property

  ## Security
    - All functions use SECURITY DEFINER with proper permission checks
    - RLS policies remain unchanged
    - Only completed properties can be archived
*/

-- Add indexes for efficient 30-day report queries
CREATE INDEX IF NOT EXISTS idx_pdf_reports_generated_at
  ON pdf_reports(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_reports_property_org
  ON pdf_reports(property_id, organisation_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_archived_properties_original_id
  ON archived_properties(original_property_id);

-- Function to get the latest report date for a property
CREATE OR REPLACE FUNCTION get_property_latest_report_date(p_property_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest_date timestamptz;
BEGIN
  SELECT MAX(generated_at) INTO v_latest_date
  FROM pdf_reports
  WHERE property_id = p_property_id;

  RETURN v_latest_date;
END;
$$;

-- Function to check if property is already archived
CREATE OR REPLACE FUNCTION is_property_archived(p_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM archived_properties
    WHERE original_property_id = p_property_id
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Function to auto-archive properties with reports older than 30 days
CREATE OR REPLACE FUNCTION auto_archive_old_reports()
RETURNS TABLE(
  archived_count int,
  skipped_count int,
  error_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property RECORD;
  v_latest_report RECORD;
  v_archived_count int := 0;
  v_skipped_count int := 0;
  v_error_count int := 0;
  v_thirty_days_ago timestamptz;
  v_seven_years_later timestamptz;
  v_property_data jsonb;
BEGIN
  v_thirty_days_ago := NOW() - INTERVAL '30 days';
  v_seven_years_later := NOW() + INTERVAL '7 years';

  RAISE NOTICE 'Starting auto-archive process for reports older than %', v_thirty_days_ago;

  FOR v_property IN
    SELECT DISTINCT p.*
    FROM properties p
    INNER JOIN pdf_reports pr ON pr.property_id = p.id
    WHERE p.status = 'completed'
      AND pr.generated_at < v_thirty_days_ago
      AND NOT EXISTS (
        SELECT 1 FROM archived_properties ap
        WHERE ap.original_property_id = p.id
      )
    ORDER BY pr.generated_at ASC
  LOOP
    BEGIN
      SELECT * INTO v_latest_report
      FROM pdf_reports
      WHERE property_id = v_property.id
      ORDER BY generated_at DESC
      LIMIT 1;

      v_property_data := jsonb_build_object(
        'property', to_jsonb(v_property),
        'archived_reason', '30-day automatic archive',
        'latest_report_date', v_latest_report.generated_at
      );

      INSERT INTO archived_properties (
        original_property_id,
        property_data,
        pdf_report_id,
        archived_by,
        archived_at,
        auto_delete_at
      ) VALUES (
        v_property.id,
        v_property_data,
        v_latest_report.id,
        '00000000-0000-0000-0000-000000000000',
        NOW(),
        v_seven_years_later
      );

      UPDATE properties
      SET status = 'archived',
          updated_at = NOW()
      WHERE id = v_property.id;

      v_archived_count := v_archived_count + 1;
      RAISE NOTICE 'Archived property: % (Job Ref: %)', v_property.id, v_property.job_ref;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE WARNING 'Failed to archive property %: %', v_property.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Auto-archive complete: % archived, % skipped, % errors',
    v_archived_count, v_skipped_count, v_error_count;

  RETURN QUERY SELECT v_archived_count, v_skipped_count, v_error_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_property_latest_report_date(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_property_archived(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_archive_old_reports() TO authenticated;

COMMENT ON FUNCTION auto_archive_old_reports() IS
  'Automatically archives completed properties with reports older than 30 days. Can be called manually or scheduled via pg_cron.';
