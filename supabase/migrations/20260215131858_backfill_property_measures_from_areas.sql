/*
  # Backfill Property Measures from Existing Areas

  ## Overview
  This migration populates the property_measures table for existing properties
  based on the measures already being used in their areas. It ensures backward
  compatibility with existing data.

  ## Logic
  1. For each property, identify which measure types are used in its areas
  2. Create property_measures entries for those measure types
  3. Regenerate photo requirements for those properties based on the measures
  4. Handle edge cases where areas don't have measure_type_id set

  ## Notes
  - Properties with no areas or areas without measure_type_id will be skipped
  - This is a one-time data migration for existing properties
  - New properties will have measures assigned during creation
*/

-- Backfill property_measures based on existing areas
DO $$
DECLARE
  v_property record;
  v_measure_type_id uuid;
BEGIN
  -- Loop through each property
  FOR v_property IN
    SELECT DISTINCT p.id as property_id
    FROM properties p
    WHERE NOT EXISTS (
      SELECT 1 FROM property_measures pm
      WHERE pm.property_id = p.id
    )
  LOOP
    -- Insert property_measures for each unique measure type used in the property's areas
    INSERT INTO property_measures (property_id, measure_type_id, created_by)
    SELECT DISTINCT
      v_property.property_id,
      a.measure_type_id,
      p.created_by
    FROM areas a
    INNER JOIN properties p ON p.id = a.property_id
    WHERE a.property_id = v_property.property_id
      AND a.measure_type_id IS NOT NULL
    ON CONFLICT (property_id, measure_type_id) DO NOTHING;

    -- Regenerate requirements for this property
    PERFORM generate_requirements_for_property_measures(v_property.property_id);
  END LOOP;

  RAISE NOTICE 'Property measures backfill completed successfully';
END $$;
