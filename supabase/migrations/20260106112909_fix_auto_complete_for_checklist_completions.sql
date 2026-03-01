/*
  # Fix Auto-Complete Function for Checklist Completions

  1. Changes
    - Update auto_complete_property_status function to handle checklist_completions table
    - Checklist completions table has direct property_id column
    - Ensures status updates work for both photos and checklist changes

  2. Security
    - No security changes, maintains SECURITY DEFINER
*/

-- Update function to handle both photos and checklist_completions tables
CREATE OR REPLACE FUNCTION auto_complete_property_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_property_id uuid;
  v_completion_percentage int;
  v_current_status property_status;
BEGIN
  -- Determine the property_id based on the table and operation
  IF TG_TABLE_NAME = 'photos' THEN
    -- For photos table, we need to get property_id through opening and area
    IF TG_OP = 'DELETE' THEN
      SELECT a.property_id INTO v_property_id
      FROM openings o
      JOIN areas a ON a.id = o.area_id
      WHERE o.id = OLD.opening_id;
    ELSE
      SELECT a.property_id INTO v_property_id
      FROM openings o
      JOIN areas a ON a.id = o.area_id
      WHERE o.id = NEW.opening_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'checklist_completions' THEN
    -- For checklist_completions, property_id is direct
    IF TG_OP = 'DELETE' THEN
      v_property_id := OLD.property_id;
    ELSE
      v_property_id := NEW.property_id;
    END IF;
  END IF;

  -- If we couldn't determine the property_id, exit
  IF v_property_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get current completion percentage and status
  SELECT 
    get_property_completion_percentage(v_property_id),
    status
  INTO v_completion_percentage, v_current_status
  FROM properties
  WHERE id = v_property_id;

  -- If property is at 100% and status is 'in_progress', mark it as completed
  IF v_completion_percentage = 100 AND v_current_status = 'in_progress' THEN
    UPDATE properties
    SET 
      status = 'completed',
      updated_at = now()
    WHERE id = v_property_id;
  END IF;

  -- If property is less than 100% and status is 'completed', revert to in_progress
  IF v_completion_percentage < 100 AND v_current_status = 'completed' THEN
    UPDATE properties
    SET 
      status = 'in_progress',
      updated_at = now()
    WHERE id = v_property_id;
  END IF;

  RETURN NULL;
END;
$$;
