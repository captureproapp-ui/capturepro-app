/*
  # Auto-Complete Property Status at 100%

  1. Changes
    - Create function to automatically update property status to 'completed' when completion reaches 100%
    - Create trigger that runs after photos table changes
    - Ensures properties are marked complete immediately when all requirements are met
    - Only updates status from 'in_progress' to 'completed' (doesn't affect archived properties)

  2. Security
    - Function runs with SECURITY DEFINER to ensure it has permissions
    - Only updates status, doesn't bypass RLS for other operations
*/

-- Function to check and update property status based on completion
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
  -- Determine the property_id based on the operation
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

-- Create trigger on photos table
DROP TRIGGER IF EXISTS auto_complete_property_on_photo_change ON photos;
CREATE TRIGGER auto_complete_property_on_photo_change
  AFTER INSERT OR UPDATE OR DELETE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_property_status();

-- Also create triggers on checklist_completions table since it affects completion
DROP TRIGGER IF EXISTS auto_complete_property_on_checklist_change ON checklist_completions;
CREATE TRIGGER auto_complete_property_on_checklist_change
  AFTER INSERT OR UPDATE OR DELETE ON checklist_completions
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_property_status();

-- Update existing properties that are at 100% but still in_progress
UPDATE properties p
SET 
  status = 'completed',
  updated_at = now()
WHERE 
  status = 'in_progress'
  AND get_property_completion_percentage(p.id) = 100;
