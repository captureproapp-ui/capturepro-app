/*
  # Backfill cladding requirements for existing properties

  1. Problem
    - Previous migration created new CLAD_HP_* evidence templates but did not
      regenerate requirement rows for properties that already had the
      external_cladding_nf measure assigned
    - Those properties show "No cladding requirements found" in the UI

  2. Fix
    - Loop over every property that has the external_cladding_nf measure
    - Call generate_requirements_for_property_measures() for each one
    - This regenerates all requirement rows from the current template set

  3. Impact
    - Affected property: Loftus - St Marks (and any other properties with the
      cladding measure)
    - All measure-type requirements are regenerated, not just cladding
*/

DO $$
DECLARE
  prop RECORD;
BEGIN
  FOR prop IN
    SELECT DISTINCT pm.property_id
    FROM property_measures pm
    JOIN measure_types mt ON mt.id = pm.measure_type_id
    WHERE mt.code = 'external_cladding_nf'
  LOOP
    PERFORM generate_requirements_for_property_measures(prop.property_id);
  END LOOP;
END $$;
