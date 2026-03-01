/*
  # Fix Property Measures Summary View

  ## Overview
  This migration fixes the property_measures_summary view to correctly display all measures
  assigned to properties, regardless of whether areas have been created yet.

  ## Problem
  The original view only queried the areas table, which meant:
  - Measures assigned to properties but without areas created (e.g., External Cladding) wouldn't appear
  - Properties with measures selected wouldn't show them in the All Properties list
  - Filtering by measure type would fail for measures without areas

  ## Solution
  Updated the view to:
  1. Query the property_measures table (source of truth for assigned measures)
  2. LEFT JOIN with areas to calculate counts where areas exist
  3. Show all measures with count 0 if no areas have been created yet
  4. Maintain the same output structure for backward compatibility

  ## Changes
  - DROP and recreate property_measures_summary view
  - New query structure uses property_measures as the primary source
  - Counts are calculated from areas.measure_count, defaulting to 0

  ## Backward Compatibility
  - Output structure remains identical (measures_detail JSONB)
  - All existing queries will continue to work
  - Properties with areas will show correct counts
  - Properties without areas will show measures with count 0
*/

-- Drop the existing view
DROP VIEW IF EXISTS property_measures_summary;

-- Recreate the view with fixed logic
CREATE VIEW property_measures_summary AS
WITH property_measure_data AS (
  SELECT
    pm.property_id,
    mt.id AS measure_type_id,
    mt.code AS measure_code,
    mt.name AS measure_name,
    mt.icon_name,
    mt.color_class,
    COALESCE(
      (SELECT SUM(a.measure_count)
       FROM areas a
       WHERE a.property_id = pm.property_id
       AND a.measure_type_id = mt.id),
      0
    ) AS total_count
  FROM property_measures pm
  INNER JOIN measure_types mt ON mt.id = pm.measure_type_id
  WHERE mt.is_active = true
)
SELECT
  p.id AS property_id,
  p.job_ref,
  p.organisation_id,
  COALESCE(
    array_agg(pmd.measure_type_id ORDER BY pmd.measure_name)
    FILTER (WHERE pmd.measure_type_id IS NOT NULL),
    ARRAY[]::uuid[]
  ) AS measure_type_ids,
  COALESCE(
    array_agg(pmd.measure_code ORDER BY pmd.measure_name)
    FILTER (WHERE pmd.measure_code IS NOT NULL),
    ARRAY[]::text[]
  ) AS measure_codes,
  COALESCE(
    array_agg(pmd.measure_name ORDER BY pmd.measure_name)
    FILTER (WHERE pmd.measure_name IS NOT NULL),
    ARRAY[]::text[]
  ) AS measure_names,
  COALESCE(
    jsonb_object_agg(
      pmd.measure_code,
      jsonb_build_object(
        'name', pmd.measure_name,
        'count', pmd.total_count,
        'icon', pmd.icon_name,
        'color', pmd.color_class
      )
      ORDER BY pmd.measure_name
    ) FILTER (WHERE pmd.measure_code IS NOT NULL),
    '{}'::jsonb
  ) AS measures_detail
FROM properties p
LEFT JOIN property_measure_data pmd ON pmd.property_id = p.id
GROUP BY p.id, p.job_ref, p.organisation_id;
