/*
  # Fix Archived Properties Organization Filtering

  ## Problem
  Archived properties aren't showing in the Archive page because the RLS policy doesn't filter by organization.
  Users can only see archived properties if they're admin/owner, but there's no check for same organization.

  ## Changes
  1. Add `organisation_id` column to `archived_properties` table for efficient filtering
  2. Backfill existing archived properties with organisation_id from JSONB data
  3. Update RLS SELECT policy to filter by user's organization
  4. Update `archive_property_with_report` function to populate organisation_id

  ## Security
  - Maintains restrictive RLS: only admins/owners from the same organization can view
  - Uses indexed column for better performance vs JSONB extraction
*/

-- Add organisation_id column to archived_properties
ALTER TABLE archived_properties 
ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE;

-- Backfill existing archived properties with organisation_id from JSONB
UPDATE archived_properties
SET organisation_id = (property_data->'property'->>'organisation_id')::uuid
WHERE organisation_id IS NULL;

-- Make organisation_id NOT NULL after backfill
ALTER TABLE archived_properties 
ALTER COLUMN organisation_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_archived_properties_organisation_id 
ON archived_properties(organisation_id);

-- Drop the old SELECT policy
DROP POLICY IF EXISTS "Admins and owners can view archived properties" ON archived_properties;

-- Create new SELECT policy that filters by organization
CREATE POLICY "Admins and owners can view their org's archived properties"
  ON archived_properties
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
      AND profiles.organisation_id = archived_properties.organisation_id
    )
  );

-- Update the archive_property_with_report function to populate organisation_id
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
                'opening_type', o.opening_type,
                'opening_number', o.opening_number,
                'photos', COALESCE(
                  (SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', ph.id,
                      'file_url', ph.file_url,
                      'captured_at', ph.captured_at,
                      'latitude', ph.latitude,
                      'longitude', ph.longitude
                    )
                  )
                  FROM photos ph
                  WHERE ph.opening_id = o.id
                  ORDER BY ph.captured_at),
                  '[]'::jsonb
                )
              )
            )
            FROM openings o
            WHERE o.area_id = a.id
            ORDER BY o.opening_type, o.opening_number),
            '[]'::jsonb
          )
        )
      )
      FROM areas a
      WHERE a.property_id = p.id
      ORDER BY a.area_type, a.area_name),
      '[]'::jsonb
    ),
    'pdf_report_id', p_pdf_report_id
  ) INTO v_property_data
  FROM properties p
  WHERE p.id = p_property_id;

  -- Insert into archived_properties with 7-year retention and organisation_id
  INSERT INTO archived_properties (
    original_property_id,
    organisation_id,
    property_data,
    pdf_report_id,
    archived_by,
    archived_at,
    auto_delete_at
  ) VALUES (
    p_property_id,
    v_property.organisation_id,
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
