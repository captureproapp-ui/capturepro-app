/*
  # Create Function to Regenerate Evidence Requirements

  ## Purpose
  Provides a function to regenerate evidence requirements for existing properties
  that were created before the evidence system was set up.

  ## Functions Created

  1. **regenerate_property_requirements(property_id)**
     - Deletes all existing requirements for a property
     - Recreates requirements based on current templates and property type
     - Useful for fixing properties created before templates existed

  2. **regenerate_all_missing_requirements()**
     - Finds all properties with 0 requirements
     - Regenerates requirements for each one
     - Returns count of properties fixed

  ## Usage Examples

  ```sql
  -- Fix a specific property
  SELECT regenerate_property_requirements('property-uuid-here');

  -- Fix all properties with missing requirements
  SELECT regenerate_all_missing_requirements();
  ```

  ## Security
  No changes to RLS policies required.
*/

-- Function to regenerate requirements for a single property
CREATE OR REPLACE FUNCTION regenerate_property_requirements(p_property_id uuid)
RETURNS boolean AS $$
DECLARE
  v_property RECORD;
  rear_applicable boolean;
  other_pre_qty int;
  other_post_qty int;
BEGIN
  -- Get property details
  SELECT * INTO v_property
  FROM properties
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found: %', p_property_id;
  END IF;

  -- Delete existing requirements for this property
  DELETE FROM property_evidence_requirements
  WHERE property_id = p_property_id;

  -- Determine if rear elevation is applicable
  rear_applicable := v_property.property_type IN ('end_terrace', 'detached', 'semi_detached');

  -- Calculate "other" elevations count
  other_pre_qty := v_property.pre_elevation_count - 1 - CASE WHEN rear_applicable THEN 1 ELSE 0 END;
  other_post_qty := v_property.post_elevation_count - 1 - CASE WHEN rear_applicable THEN 1 ELSE 0 END;

  -- Insert property-level elevation requirements

  -- Front elevation (pre)
  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT p_property_id, id, 1, true, true
  FROM evidence_item_templates
  WHERE code = 'PRE_PROP_FRONT_ELEVATION';

  -- Rear elevation (pre)
  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT p_property_id, id, 1, true, rear_applicable
  FROM evidence_item_templates
  WHERE code = 'PRE_PROP_REAR_ELEVATION';

  -- Other elevations (pre)
  IF other_pre_qty > 0 THEN
    INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
    SELECT p_property_id, id, other_pre_qty, true, true
    FROM evidence_item_templates
    WHERE code = 'PRE_PROP_OTHER_ELEVATIONS';
  END IF;

  -- Front elevation (post)
  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT p_property_id, id, 1, true, true
  FROM evidence_item_templates
  WHERE code = 'POST_PROP_FRONT_ELEVATION';

  -- Rear elevation (post)
  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT p_property_id, id, 1, true, rear_applicable
  FROM evidence_item_templates
  WHERE code = 'POST_PROP_REAR_ELEVATION';

  -- Other elevations (post)
  IF other_post_qty > 0 THEN
    INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
    SELECT p_property_id, id, other_post_qty, true, true
    FROM evidence_item_templates
    WHERE code = 'POST_PROP_OTHER_ELEVATIONS';
  END IF;

  -- Insert opening-level requirements for all openings (will be applicable to all openings)
  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT p_property_id, id, default_required_qty, requirement_level = 'required', true
  FROM evidence_item_templates
  WHERE scope = 'opening';

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to regenerate requirements for all properties that have 0 requirements
CREATE OR REPLACE FUNCTION regenerate_all_missing_requirements()
RETURNS TABLE(property_id uuid, job_ref text, requirements_created int) AS $$
DECLARE
  v_property RECORD;
  v_req_count int;
BEGIN
  FOR v_property IN
    SELECT p.id, p.job_ref
    FROM properties p
    WHERE NOT EXISTS (
      SELECT 1
      FROM property_evidence_requirements per
      WHERE per.property_id = p.id
    )
  LOOP
    -- Regenerate requirements for this property
    PERFORM regenerate_property_requirements(v_property.id);

    -- Count how many requirements were created
    SELECT COUNT(*) INTO v_req_count
    FROM property_evidence_requirements per
    WHERE per.property_id = v_property.id;

    -- Return the result
    property_id := v_property.id;
    job_ref := v_property.job_ref;
    requirements_created := v_req_count;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
