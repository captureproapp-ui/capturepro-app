/*
  # Enhance PDF Reports and Archive System with 7-Year Retention

  ## Overview
  Enhances existing PDF reports and archive system for PAS2030 compliance packs with
  permanent URLs, email notifications, and automatic 7-year retention archiving.

  ## 1. Properties Table Enhancements
    - Add `property_name` text field for report header display
    - Add `assigned_installer_name` text field to snapshot installer name at job completion
    - Add `completion_percentage` numeric field to track overall property completion

  ## 2. PDF Reports Table Enhancements
    - Add `organisation_id` uuid field (extracted from property relationship)
    - Add `file_size_bytes` bigint for storage tracking
    - Add `email_sent_at` timestamptz for notification timestamp
    - Add `email_sent_to` text[] for recipient tracking
    - Add `email_send_status` text for send status tracking

  ## 3. Archived Properties Updates
    - Add `pdf_report_id` uuid reference to pdf_reports
    - Update auto_delete_at default to 7 years instead of 30 days

  ## 4. Database Functions
    - `archive_property_with_report()` - Archives property after report generation
    - `calculate_seven_year_retention()` - Calculates 7-year retention date
    - `get_next_report_version()` - Gets next version number for reports

  ## 5. Security
    - Update RLS policies for admin/owner-only access to reports
    - Restrict installer role from accessing reports
    - Organisation-level data isolation

  ## 6. Indexes
    - Indexes for efficient report querying and filtering
*/

-- Add new columns to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'property_name'
  ) THEN
    ALTER TABLE properties ADD COLUMN property_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'assigned_installer_name'
  ) THEN
    ALTER TABLE properties ADD COLUMN assigned_installer_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'completion_percentage'
  ) THEN
    ALTER TABLE properties ADD COLUMN completion_percentage numeric(5, 2) DEFAULT 0;
  END IF;
END $$;

-- Add new columns to pdf_reports table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_reports' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE pdf_reports ADD COLUMN organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_reports' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE pdf_reports ADD COLUMN file_size_bytes bigint DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_reports' AND column_name = 'email_sent_at'
  ) THEN
    ALTER TABLE pdf_reports ADD COLUMN email_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_reports' AND column_name = 'email_sent_to'
  ) THEN
    ALTER TABLE pdf_reports ADD COLUMN email_sent_to text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_reports' AND column_name = 'email_send_status'
  ) THEN
    ALTER TABLE pdf_reports ADD COLUMN email_send_status text DEFAULT 'pending';
  END IF;
END $$;

-- Add constraint for email_send_status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pdf_reports_email_send_status_check'
  ) THEN
    ALTER TABLE pdf_reports ADD CONSTRAINT pdf_reports_email_send_status_check
      CHECK (email_send_status IN ('pending', 'sent', 'failed'));
  END IF;
END $$;

-- Backfill organisation_id for existing pdf_reports
UPDATE pdf_reports pr
SET organisation_id = p.organisation_id
FROM properties p
WHERE pr.property_id = p.id AND pr.organisation_id IS NULL;

-- Add pdf_report_id to archived_properties if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'archived_properties' AND column_name = 'pdf_report_id'
  ) THEN
    ALTER TABLE archived_properties ADD COLUMN pdf_report_id uuid REFERENCES pdf_reports(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create function to calculate 7-year retention date
CREATE OR REPLACE FUNCTION calculate_seven_year_retention(archive_date timestamptz)
RETURNS timestamptz AS $$
BEGIN
  RETURN archive_date + INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to get next report version for a property
CREATE OR REPLACE FUNCTION get_next_report_version(p_property_id uuid)
RETURNS integer AS $$
DECLARE
  v_max_version integer;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO v_max_version
  FROM pdf_reports
  WHERE property_id = p_property_id;
  
  RETURN v_max_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to archive property with report
CREATE OR REPLACE FUNCTION archive_property_with_report(
  p_property_id uuid,
  p_pdf_report_id uuid,
  p_archived_by uuid
)
RETURNS uuid AS $$
DECLARE
  v_property RECORD;
  v_property_data jsonb;
  v_archive_id uuid;
  v_archive_date timestamptz := now();
BEGIN
  -- Get property details
  SELECT p.*, o.name as organisation_name
  INTO v_property
  FROM properties p
  JOIN organisations o ON o.id = p.organisation_id
  WHERE p.id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  -- Verify property is 100% complete
  IF v_property.completion_percentage < 100 OR v_property.status != 'completed' THEN
    RAISE EXCEPTION 'Property must be 100%% complete before archiving';
  END IF;

  -- Build complete property snapshot with all related data
  SELECT jsonb_build_object(
    'property', jsonb_build_object(
      'id', p.id,
      'organisation_id', p.organisation_id,
      'property_name', p.property_name,
      'job_ref', p.job_ref,
      'address_line_1', p.address_line_1,
      'address_line_2', p.address_line_2,
      'city', p.city,
      'postcode', p.postcode,
      'installation_date', p.installation_date,
      'assigned_installer_name', p.assigned_installer_name,
      'completion_percentage', p.completion_percentage,
      'status', p.status,
      'created_at', p.created_at
    ),
    'areas', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'area_name', a.area_name,
          'area_type', a.area_type,
          'openings', COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'id', o.id,
                'opening_number', o.opening_number,
                'opening_type', o.opening_type,
                'photos', COALESCE(
                  (SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', ph.id,
                      'file_url', ph.file_url,
                      'latitude', ph.latitude,
                      'longitude', ph.longitude,
                      'captured_at', ph.captured_at
                    )
                    ORDER BY ph.captured_at
                  )
                  FROM photos ph
                  WHERE ph.opening_id = o.id
                  ), '[]'::jsonb
                )
              )
              ORDER BY o.opening_number
            )
            FROM openings o
            WHERE o.area_id = a.id
            ), '[]'::jsonb
          )
        )
      )
      FROM areas a
      WHERE a.property_id = p.id
      ), '[]'::jsonb
    ),
    'pdf_report_id', p_pdf_report_id
  ) INTO v_property_data
  FROM properties p
  WHERE p.id = p_property_id;

  -- Insert into archived_properties with 7-year retention
  INSERT INTO archived_properties (
    original_property_id,
    property_data,
    pdf_report_id,
    archived_by,
    archived_at,
    auto_delete_at
  ) VALUES (
    p_property_id,
    v_property_data,
    p_pdf_report_id,
    p_archived_by,
    v_archive_date,
    calculate_seven_year_retention(v_archive_date)
  )
  RETURNING id INTO v_archive_id;

  -- Update property status to archived
  UPDATE properties
  SET status = 'archived'
  WHERE id = p_property_id;

  RETURN v_archive_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing overly permissive policies on pdf_reports
DROP POLICY IF EXISTS "Users can view PDF reports in their organisation" ON pdf_reports;
DROP POLICY IF EXISTS "Admins and assigned installers can generate PDF reports" ON pdf_reports;

-- Create new restrictive RLS policies for pdf_reports
CREATE POLICY "Admins and owners can view organisation reports"
  ON pdf_reports
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id
      FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins and owners can create reports"
  ON pdf_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id
      FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins and owners can update report status"
  ON pdf_reports
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id
      FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id
      FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Update archived_properties RLS policy for admin/owner only access
DROP POLICY IF EXISTS "Users can view archived properties in their organisation" ON archived_properties;

CREATE POLICY "Admins and owners can view archived properties"
  ON archived_properties
  FOR SELECT
  TO authenticated
  USING (
    (property_data->'property'->>'organisation_id')::uuid IN (
      SELECT organisation_id
      FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_reports_organisation_created ON pdf_reports(organisation_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_reports_version ON pdf_reports(property_id, version);
CREATE INDEX IF NOT EXISTS idx_archived_properties_pdf_report ON archived_properties(pdf_report_id);
CREATE INDEX IF NOT EXISTS idx_properties_completion ON properties(completion_percentage, status);
CREATE INDEX IF NOT EXISTS idx_properties_name ON properties(property_name);
