/*
  # Add Unfinished Openings Count to Completion View

  1. Problem
    - installerJobsService.ts queries `unfinished_openings_count` from property_completion_summary
    - The view currently doesn't have this column
    - This causes queries to fail for installer dashboard

  2. Changes
    - Recreate property_completion_summary view with unfinished_openings_count column
    - Add total_openings_count as separate column (currently named just total_openings)
    - Keep all existing columns intact

  3. Security
    - No RLS changes needed (view inherits from underlying tables)
*/

-- Drop and recreate the view with the missing columns
DROP VIEW IF EXISTS property_completion_summary;

CREATE VIEW property_completion_summary AS
SELECT
  p.id,
  p.job_ref,
  p.address_line_1,
  p.city,
  p.postcode,
  p.assigned_installer_ids,
  p.status,
  p.created_at,
  get_property_completion_percentage(p.id) AS completion_percentage,
  (
    SELECT COUNT(*)
    FROM openings o
    JOIN areas a ON a.id = o.area_id
    WHERE a.property_id = p.id
      AND get_opening_completion_percentage(o.id) < 100
  ) as unfinished_openings_count,
  (
    SELECT COUNT(*)
    FROM openings o
    JOIN areas a ON a.id = o.area_id
    WHERE a.property_id = p.id
  ) as total_openings_count
FROM properties p;
