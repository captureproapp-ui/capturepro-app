/*
  # Fix Completion Percentage Synchronization

  1. Problem
    - The UI displays completion from `property_completion_summary` view (calculated value)
    - The `properties.completion_percentage` column is never updated
    - Archive validation checks the column value, not the view
    - This causes archive to fail even when properties show 100% complete in UI

  2. Changes
    - Update `auto_complete_property_status()` function to also sync the completion_percentage column
    - Backfill existing properties to set their completion_percentage to the calculated value
    - This ensures archive validation works correctly

  3. Security
    - Maintains SECURITY DEFINER for trigger function
    - No RLS changes needed
*/

-- Update the auto-complete function to also sync the completion_percentage column
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

  -- Always sync the completion_percentage column with the calculated value
  UPDATE properties
  SET 
    completion_percentage = v_completion_percentage,
    updated_at = now()
  WHERE id = v_property_id;

  -- If property is at 100% and status is 'in_progress', mark it as completed
  IF v_completion_percentage = 100 AND v_current_status = 'in_progress' THEN
    UPDATE properties
    SET 
      status = 'completed'
    WHERE id = v_property_id;
  END IF;

  -- If property is less than 100% and status is 'completed', revert to in_progress
  IF v_completion_percentage < 100 AND v_current_status = 'completed' THEN
    UPDATE properties
    SET 
      status = 'in_progress'
    WHERE id = v_property_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Backfill existing properties to sync their completion_percentage column
UPDATE properties
SET 
  completion_percentage = get_property_completion_percentage(id),
  updated_at = now()
WHERE completion_percentage != get_property_completion_percentage(id)
   OR completion_percentage IS NULL;
