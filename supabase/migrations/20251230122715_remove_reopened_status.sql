/*
  # Remove "reopened" status from property workflow

  1. Changes
    - Update any existing properties with "reopened" status to "in_progress"
    - Remove "reopened" value from property_status enum
    - Simplify workflow to: in_progress → completed → archived
    - Temporarily drop and recreate property_completion_summary view

  2. Security
    - No RLS changes required
*/

-- First, update any existing properties with "reopened" status to "in_progress"
UPDATE properties 
SET status = 'in_progress' 
WHERE status = 'reopened';

-- Remove "reopened" from the enum by recreating it without that value
DO $$ 
BEGIN
  -- Drop the view that depends on the status column
  DROP VIEW IF EXISTS property_completion_summary;

  -- Create new enum type without "reopened"
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_status_new') THEN
    CREATE TYPE property_status_new AS ENUM ('in_progress', 'completed', 'archived');
  END IF;

  -- Drop the default value temporarily
  ALTER TABLE properties 
    ALTER COLUMN status DROP DEFAULT;

  -- Alter the column to use the new enum type
  ALTER TABLE properties 
    ALTER COLUMN status TYPE property_status_new 
    USING (status::text::property_status_new);

  -- Re-add the default value
  ALTER TABLE properties 
    ALTER COLUMN status SET DEFAULT 'in_progress'::property_status_new;

  -- Drop the old enum type
  DROP TYPE IF EXISTS property_status;

  -- Rename the new enum to the original name
  ALTER TYPE property_status_new RENAME TO property_status;
END $$;

-- Recreate the property_completion_summary view
CREATE OR REPLACE VIEW property_completion_summary AS
SELECT 
  p.id AS property_id,
  p.job_ref,
  p.address_line_1,
  p.city,
  p.postcode,
  p.status,
  p.assigned_installer_ids,
  p.installation_date,
  get_property_completion_percentage(p.id) AS completion_percentage,
  (
    SELECT COUNT(*)
    FROM openings o
    JOIN areas a ON a.id = o.area_id
    WHERE a.property_id = p.id
    AND get_opening_completion_percentage(o.id) < 100
  ) AS unfinished_openings_count,
  (
    SELECT COUNT(*)
    FROM openings o
    JOIN areas a ON a.id = o.area_id
    WHERE a.property_id = p.id
  ) AS total_openings_count
FROM properties p;