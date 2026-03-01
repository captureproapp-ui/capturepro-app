/*
  # Simplify Measure Types to Windows/Doors and External Cladding

  ## Overview
  This migration simplifies the measure types to only two options:
  1. Windows and Doors (combined into one measure)
  2. External Cladding (Non Funded)

  ## Changes
  1. Create new simplified measure types
  2. Update all references to point to new types
  3. Remove old measure types

  ## Notes
  - This migration preserves existing data by mapping old measures to new ones
  - Windows + Doors → Windows and Doors
  - Everything else is removed
*/

DO $$
DECLARE
  old_windows_id uuid;
  old_doors_id uuid;
  old_boilers_id uuid;
  old_insulation_id uuid;
  old_cladding_id uuid;
  new_windows_doors_id uuid;
  new_cladding_id uuid;
BEGIN
  -- Get old measure type IDs
  SELECT id INTO old_windows_id FROM measure_types WHERE code = 'windows';
  SELECT id INTO old_doors_id FROM measure_types WHERE code = 'doors';
  SELECT id INTO old_boilers_id FROM measure_types WHERE code = 'boilers';
  SELECT id INTO old_insulation_id FROM measure_types WHERE code = 'insulation';
  SELECT id INTO old_cladding_id FROM measure_types WHERE code = 'external_cladding';

  -- Create new simplified measure types (if they don't exist)
  INSERT INTO measure_types (name, code, description, icon_name, color_class, is_active)
  VALUES
    (
      'Windows and Doors',
      'windows_doors',
      'Window and door installation and replacement',
      'square',
      'bg-blue-100 text-blue-800',
      true
    )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO new_windows_doors_id;

  INSERT INTO measure_types (name, code, description, icon_name, color_class, is_active)
  VALUES
    (
      'External Cladding (Non Funded)',
      'external_cladding_nf',
      'External wall cladding installation',
      'layers',
      'bg-gray-100 text-gray-800',
      true
    )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO new_cladding_id;

  -- Get IDs if they already existed
  IF new_windows_doors_id IS NULL THEN
    SELECT id INTO new_windows_doors_id FROM measure_types WHERE code = 'windows_doors';
  END IF;
  
  IF new_cladding_id IS NULL THEN
    SELECT id INTO new_cladding_id FROM measure_types WHERE code = 'external_cladding_nf';
  END IF;

  -- Update areas: Map old windows/doors to new windows_doors
  UPDATE areas
  SET measure_type_id = new_windows_doors_id
  WHERE measure_type_id IN (old_windows_id, old_doors_id);

  -- Update areas: Map old cladding to new cladding (if exists)
  IF old_cladding_id IS NOT NULL THEN
    UPDATE areas
    SET measure_type_id = new_cladding_id
    WHERE measure_type_id = old_cladding_id;
  END IF;

  -- Set measure_type_id to NULL for areas with other measures (boilers, insulation, etc)
  UPDATE areas
  SET measure_type_id = NULL
  WHERE measure_type_id NOT IN (new_windows_doors_id, new_cladding_id)
    AND measure_type_id IS NOT NULL;

  -- Update property_measures: Map old windows/doors to new windows_doors
  UPDATE property_measures
  SET measure_type_id = new_windows_doors_id
  WHERE measure_type_id IN (old_windows_id, old_doors_id);

  -- Remove duplicate property_measures
  DELETE FROM property_measures a
  USING property_measures b
  WHERE a.id > b.id
    AND a.property_id = b.property_id
    AND a.measure_type_id = b.measure_type_id;

  -- Update property_measures: Map old cladding to new cladding
  IF old_cladding_id IS NOT NULL THEN
    UPDATE property_measures
    SET measure_type_id = new_cladding_id
    WHERE measure_type_id = old_cladding_id;
  END IF;

  -- Delete property_measures with other types (boilers, insulation, etc)
  DELETE FROM property_measures
  WHERE measure_type_id NOT IN (new_windows_doors_id, new_cladding_id);

  -- Update organisation_measures: Remove all except the new two types
  DELETE FROM organisation_measures
  WHERE measure_type_id NOT IN (new_windows_doors_id, new_cladding_id);

  -- Update evidence_item_templates: Map windows/doors templates to new type
  UPDATE evidence_item_templates
  SET measure_type_id = new_windows_doors_id
  WHERE opening_type IN ('window', 'door')
    AND scope = 'opening';

  -- Delete old measure types
  DELETE FROM measure_types
  WHERE code NOT IN ('windows_doors', 'external_cladding_nf');

  RAISE NOTICE 'Measure types simplified successfully';
END $$;
