/*
  # Auto-Add Windows and Doors Measure When Openings Are Created

  1. Problem
    - When users add rooms with windows/doors to properties that don't have the windows_doors measure
    - The openings are created but no evidence requirements exist
    - Users see empty checklists

  2. Solution
    - Create a trigger that automatically adds the windows_doors measure when needed
    - Regenerate evidence requirements to include opening-scoped templates
    - Works for both new rooms and updates to existing rooms

  3. Changes
    - New function: `auto_add_windows_doors_measure_if_needed()`
    - Trigger on areas table AFTER INSERT/UPDATE
    - Checks if property needs windows_doors measure
    - Automatically adds it and regenerates requirements
*/

-- Function to automatically add windows_doors measure when a room with openings is created
CREATE OR REPLACE FUNCTION auto_add_windows_doors_measure_if_needed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_windows_doors_measure_id uuid;
  v_property_id uuid;
  v_has_measure boolean;
  v_user_id uuid;
BEGIN
  -- Only proceed if the area has windows or doors
  IF (NEW.windows_to_replace_count > 0 OR NEW.doors_to_replace_count > 0) THEN
    -- Get the property_id from the area
    v_property_id := NEW.property_id;
    
    -- Get the windows_doors measure type ID
    SELECT id INTO v_windows_doors_measure_id
    FROM measure_types
    WHERE code = 'windows_doors';
    
    -- Check if this measure type exists
    IF v_windows_doors_measure_id IS NULL THEN
      RAISE NOTICE 'windows_doors measure type not found';
      RETURN NEW;
    END IF;
    
    -- Check if the property already has this measure
    SELECT EXISTS(
      SELECT 1 
      FROM property_measures 
      WHERE property_id = v_property_id 
      AND measure_type_id = v_windows_doors_measure_id
    ) INTO v_has_measure;
    
    -- If the property doesn't have this measure, add it
    IF NOT v_has_measure THEN
      -- Try to get the current user, fallback to the property's first assigned installer
      v_user_id := auth.uid();
      
      IF v_user_id IS NULL THEN
        -- Get first assigned installer from property
        SELECT assigned_installer_ids[1] INTO v_user_id
        FROM properties
        WHERE id = v_property_id;
      END IF;
      
      -- Insert the measure
      INSERT INTO property_measures (property_id, measure_type_id, created_by)
      VALUES (v_property_id, v_windows_doors_measure_id, v_user_id);
      
      -- Regenerate evidence requirements for this property
      PERFORM generate_requirements_for_property_measures(v_property_id);
      
      RAISE NOTICE 'Auto-added windows_doors measure to property %', v_property_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on areas table
DROP TRIGGER IF EXISTS trigger_auto_add_windows_doors_measure ON areas;

CREATE TRIGGER trigger_auto_add_windows_doors_measure
  AFTER INSERT OR UPDATE OF windows_to_replace_count, doors_to_replace_count
  ON areas
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_windows_doors_measure_if_needed();
