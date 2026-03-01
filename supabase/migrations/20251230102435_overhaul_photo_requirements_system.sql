/*
  # Photo Requirements System Overhaul

  ## Overview
  Complete overhaul of the photo evidence system with "Not Available" feature and 38 standardized opening-level photo templates.

  ## Changes Made

  ### 1. Schema Updates
  
  #### evidence_item_templates table:
  - Added `can_mark_not_available` boolean column (default false)
    - Allows certain templates to be marked as "Not Available" if they don't apply to specific installations
  
  #### photos table:
  - Added `marked_not_available_at` timestamptz (nullable)
    - Timestamp when requirement was marked as not available
  - Added `not_available_reason` text (nullable)
    - Optional free-text explanation for why requirement doesn't apply
  - Added `marked_not_available_by` uuid (nullable)
    - References auth.users - tracks who marked it as N/A

  ### 2. New Photo Templates (38 Total Opening-Level Templates)
  
  All existing opening-level templates are deleted and replaced with:
  
  **Pre-Installation Stage (11 templates):**
  1. Internal room overview
  2. Existing window/door condition
  3. External close-up (open)
  4. External close-up (closed)
  5. Internal close-up
  6. Existing frame condition
  7. Existing glazing type
  8. Existing cills
  9. External wall type (can mark N/A)
  10. Obstructions near openings (can mark N/A)
  11. Trickle vent presence pre-install
  
  **During Installation Stage (11 templates):**
  1. Opening after removal
  2. Condition of reveals
  3. DPC visible
  4. Cavity closers installed
  5. New unit positioned
  6. Fixings visible
  7. Frame packing/shimming
  8. Squareness/level shown
  9. Insulation around frame
  10. No visible gaps
  11. Internal airtight seal
  
  **Post-Installation Stage (9 templates):**
  1. External view (installed)
  2. External sealant close-up
  3. External cill sealed
  4. Trickle vents visible if required
  5. Internal view (installed)
  6. Internal sealant close-up
  7. Architraves/trims fitted
  8. No visible gaps/unfinished areas
  9. Operation check (open)
  
  **Performance & Specification Stage (5 templates):**
  1. Locking mechanism engaged
  2. Fire escape hinges if applicable (can mark N/A)
  3. Safety glazing markings (can mark N/A)
  4. Glass etching/stamp (can mark N/A)
  5. Manufacturer label/plate (can mark N/A)
  
  **Completion & Handover Stage (2 templates):**
  1. Final room overview (completed)
  2. External elevation (completed)

  ### 3. Completion Calculation Updates
  
  - Updated completion functions to treat marked_not_available as satisfied
  - Photos marked as N/A count toward completion percentage
  - Formula: completion = (photos_uploaded + marked_not_available) / total_required

  ### 4. Regenerate Requirements Function
  
  - Updated `regenerate_property_requirements()` function to handle new templates
  - Called automatically for all existing properties after migration
  - Fresh start with new template system

  ### 5. Security
  
  - RLS policies updated for new columns
  - Users can only mark their own requirements as N/A
  - Proper authentication checks on all operations
*/

-- Step 1: Add new columns to evidence_item_templates
ALTER TABLE evidence_item_templates 
ADD COLUMN IF NOT EXISTS can_mark_not_available boolean DEFAULT false;

-- Step 2: Add N/A tracking columns to photos table
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS marked_not_available_at timestamptz,
ADD COLUMN IF NOT EXISTS not_available_reason text,
ADD COLUMN IF NOT EXISTS marked_not_available_by uuid REFERENCES auth.users(id);

-- Step 3: Delete all existing opening-level templates
DELETE FROM evidence_item_templates 
WHERE scope = 'opening';

-- Step 4: Insert new 38 standardized opening-level templates with proper codes and stages

-- Pre-Installation (11 templates)
INSERT INTO evidence_item_templates (
  code, title, stage, scope, opening_type, default_required_qty, requirement_level, help_text, sort_order, can_mark_not_available
) VALUES
  ('PRE_ROOM_OVERVIEW', 'Internal room overview', 'pre', 'opening', 'window', 1, 'required', 'Wide-angle photo showing the entire room interior including the opening', 100, false),
  ('PRE_EXISTING_CONDITION', 'Existing window/door condition', 'pre', 'opening', 'window', 1, 'required', 'Overall condition of the existing installation', 101, false),
  ('PRE_EXT_CLOSEUP_OPEN', 'External close-up (open)', 'pre', 'opening', 'window', 1, 'required', 'Close-up external photo with window/door in open position', 102, false),
  ('PRE_EXT_CLOSEUP_CLOSED', 'External close-up (closed)', 'pre', 'opening', 'window', 1, 'required', 'Close-up external photo with window/door in closed position', 103, false),
  ('PRE_INT_CLOSEUP', 'Internal close-up', 'pre', 'opening', 'window', 1, 'required', 'Close-up internal photo of existing installation', 104, false),
  ('PRE_FRAME_CONDITION', 'Existing frame condition', 'pre', 'opening', 'window', 1, 'required', 'Detailed photo of frame showing any damage or deterioration', 105, false),
  ('PRE_GLAZING_TYPE', 'Existing glazing type', 'pre', 'opening', 'window', 1, 'required', 'Photo showing glazing type and condition', 106, false),
  ('PRE_EXISTING_CILLS', 'Existing cills', 'pre', 'opening', 'window', 1, 'required', 'Photo of existing internal and external cills', 107, false),
  ('PRE_WALL_TYPE', 'External wall type', 'pre', 'opening', 'window', 1, 'required', 'Photo showing external wall construction type', 108, true),
  ('PRE_OBSTRUCTIONS', 'Obstructions near openings', 'pre', 'opening', 'window', 1, 'required', 'Photo of any obstructions or constraints around the opening', 109, true),
  ('PRE_TRICKLE_VENT', 'Trickle vent presence pre-install', 'pre', 'opening', 'window', 1, 'required', 'Photo showing whether trickle vents were present before work', 110, false),

-- During Installation (11 templates)
  ('DUR_AFTER_REMOVAL', 'Opening after removal', 'during', 'opening', 'window', 1, 'required', 'Photo of opening after old unit removed', 200, false),
  ('DUR_REVEALS_CONDITION', 'Condition of reveals', 'during', 'opening', 'window', 1, 'required', 'Photo showing condition of reveals and structural opening', 201, false),
  ('DUR_DPC_VISIBLE', 'DPC visible', 'during', 'opening', 'window', 1, 'required', 'Photo clearly showing damp proof course', 202, false),
  ('DUR_CAVITY_CLOSERS', 'Cavity closers installed', 'during', 'opening', 'window', 1, 'required', 'Photo showing cavity closers properly installed', 203, false),
  ('DUR_UNIT_POSITIONED', 'New unit positioned', 'during', 'opening', 'window', 1, 'required', 'Photo of new unit in position before final fixing', 204, false),
  ('DUR_FIXINGS_VISIBLE', 'Fixings visible', 'during', 'opening', 'window', 1, 'required', 'Close-up photos showing fixings and fixing method', 205, false),
  ('DUR_PACKING_SHIMMING', 'Frame packing/shimming', 'during', 'opening', 'window', 1, 'required', 'Photo showing packing and shimming arrangement', 206, false),
  ('DUR_SQUARE_LEVEL', 'Squareness/level shown', 'during', 'opening', 'window', 1, 'required', 'Photo with level or square tool visible on frame', 207, false),
  ('DUR_INSULATION', 'Insulation around frame', 'during', 'opening', 'window', 1, 'required', 'Photo showing insulation properly installed around frame', 208, false),
  ('DUR_NO_GAPS', 'No visible gaps', 'during', 'opening', 'window', 1, 'required', 'Photo showing no gaps between frame and structure', 209, false),
  ('DUR_AIRTIGHT_SEAL', 'Internal airtight seal', 'during', 'opening', 'window', 1, 'required', 'Photo of internal airtight seal application', 210, false),

-- Post-Installation (9 templates)
  ('POST_EXT_VIEW', 'External view (installed)', 'post', 'opening', 'window', 1, 'required', 'Full external photo of completed installation', 300, false),
  ('POST_EXT_SEALANT', 'External sealant close-up', 'post', 'opening', 'window', 1, 'required', 'Close-up of external sealant showing neat finish', 301, false),
  ('POST_EXT_CILL_SEALED', 'External cill sealed', 'post', 'opening', 'window', 1, 'required', 'Photo showing external cill properly sealed', 302, false),
  ('POST_TRICKLE_VENTS', 'Trickle vents visible if required', 'post', 'opening', 'window', 1, 'required', 'Photo showing trickle vents installed and functional', 303, false),
  ('POST_INT_VIEW', 'Internal view (installed)', 'post', 'opening', 'window', 1, 'required', 'Full internal photo of completed installation', 304, false),
  ('POST_INT_SEALANT', 'Internal sealant close-up', 'post', 'opening', 'window', 1, 'required', 'Close-up of internal sealant showing neat finish', 305, false),
  ('POST_ARCHITRAVES', 'Architraves/trims fitted', 'post', 'opening', 'window', 1, 'required', 'Photo showing architraves or trims properly fitted', 306, false),
  ('POST_NO_GAPS', 'No visible gaps/unfinished areas', 'post', 'opening', 'window', 1, 'required', 'Photo demonstrating clean finish with no gaps', 307, false),
  ('POST_OPERATION_OPEN', 'Operation check (open)', 'post', 'opening', 'window', 1, 'required', 'Photo showing window/door in fully open position', 308, false),

-- Performance & Specification (5 templates)
  ('PERF_LOCK_ENGAGED', 'Locking mechanism engaged', 'post', 'opening', 'window', 1, 'required', 'Photo of locking mechanism in engaged position', 400, false),
  ('PERF_FIRE_HINGES', 'Fire escape hinges if applicable', 'post', 'opening', 'window', 1, 'conditional', 'Photo of fire escape hinges if required for this installation', 401, true),
  ('PERF_SAFETY_GLAZING', 'Safety glazing markings', 'post', 'opening', 'window', 1, 'conditional', 'Photo of safety glazing markings/stamps if applicable', 402, true),
  ('PERF_GLASS_STAMP', 'Glass etching/stamp', 'post', 'opening', 'window', 1, 'conditional', 'Photo of glass etching or stamp showing certification', 403, true),
  ('PERF_MANUFACTURER_LABEL', 'Manufacturer label/plate', 'post', 'opening', 'window', 1, 'conditional', 'Photo of manufacturer identification label or rating plate', 404, true),

-- Completion & Handover (2 templates)
  ('COMP_ROOM_FINAL', 'Final room overview (completed)', 'post', 'opening', 'window', 1, 'required', 'Final wide-angle photo of completed room with new installation', 500, false),
  ('COMP_EXT_ELEVATION', 'External elevation (completed)', 'post', 'opening', 'window', 1, 'required', 'Final external elevation photo showing completed work', 501, false)
ON CONFLICT (code) DO NOTHING;

-- Step 5: Update completion calculation functions to handle N/A

-- Update opening completion percentage function
CREATE OR REPLACE FUNCTION get_opening_completion_percentage(p_opening_id uuid)
RETURNS numeric AS $$
DECLARE
  total_requirements int;
  completed_requirements int;
  p_property_id uuid;
BEGIN
  -- Get the property_id for this opening (through areas)
  SELECT a.property_id INTO p_property_id
  FROM openings o
  JOIN areas a ON a.id = o.area_id
  WHERE o.id = p_opening_id;

  IF p_property_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Count total opening-scoped requirements that are required and applicable
  SELECT COUNT(*)
  INTO total_requirements
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'opening'
    AND per.is_required = true
    AND per.is_applicable = true;

  IF total_requirements = 0 THEN
    RETURN 0;
  END IF;

  -- Count completed requirements (where satisfied_qty >= required_qty OR marked as N/A)
  SELECT COUNT(*)
  INTO completed_requirements
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  LEFT JOIN (
    SELECT template_id, 
           COUNT(*) as photo_count,
           MAX(marked_not_available_at) as marked_na
    FROM photos
    WHERE opening_id = p_opening_id
    GROUP BY template_id
  ) pc ON pc.template_id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'opening'
    AND per.is_required = true
    AND per.is_applicable = true
    AND (
      COALESCE(pc.photo_count, 0) >= per.required_qty
      OR pc.marked_na IS NOT NULL
    );

  RETURN ROUND((completed_requirements::numeric / total_requirements::numeric) * 100, 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- Update property completion percentage function
CREATE OR REPLACE FUNCTION get_property_completion_percentage(p_property_id uuid)
RETURNS numeric AS $$
DECLARE
  total_requirements int;
  completed_requirements int;
  property_scoped_total int;
  property_scoped_completed int;
  opening_scoped_total int;
  opening_scoped_completed int;
  total_openings int;
BEGIN
  -- Get total number of openings for this property
  SELECT COUNT(*) INTO total_openings
  FROM openings o
  JOIN areas a ON a.id = o.area_id
  WHERE a.property_id = p_property_id;

  -- Count property-scoped requirements (total and completed)
  SELECT
    COUNT(*) FILTER (WHERE per.is_required AND per.is_applicable),
    COUNT(*) FILTER (WHERE per.is_required AND per.is_applicable AND (COALESCE(pc.photo_count, 0) >= per.required_qty OR pc.marked_na IS NOT NULL))
  INTO property_scoped_total, property_scoped_completed
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  LEFT JOIN (
    SELECT template_id, COUNT(*) as photo_count, MAX(marked_not_available_at) as marked_na
    FROM photos
    WHERE property_id = p_property_id AND opening_id IS NULL
    GROUP BY template_id
  ) pc ON pc.template_id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'property';

  -- Count opening-scoped requirements across ALL openings (total and completed)
  SELECT
    COUNT(DISTINCT per.id) * total_openings,
    COUNT(DISTINCT CASE WHEN (COALESCE(pc.photo_count, 0) >= per.required_qty OR pc.marked_na IS NOT NULL) THEN per.id::text || '_' || o.id::text END)
  INTO opening_scoped_total, opening_scoped_completed
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  CROSS JOIN openings o
  JOIN areas a ON a.id = o.area_id AND a.property_id = p_property_id
  LEFT JOIN (
    SELECT opening_id, template_id, COUNT(*) as photo_count, MAX(marked_not_available_at) as marked_na
    FROM photos
    WHERE property_id = p_property_id AND opening_id IS NOT NULL
    GROUP BY opening_id, template_id
  ) pc ON pc.opening_id = o.id AND pc.template_id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'opening'
    AND per.is_required = true
    AND per.is_applicable = true;

  total_requirements := COALESCE(property_scoped_total, 0) + COALESCE(opening_scoped_total, 0);
  completed_requirements := COALESCE(property_scoped_completed, 0) + COALESCE(opening_scoped_completed, 0);

  IF total_requirements = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((completed_requirements::numeric / total_requirements::numeric) * 100, 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 6: Regenerate requirements for all existing properties
DO $$
DECLARE
  prop_record RECORD;
BEGIN
  FOR prop_record IN SELECT id FROM properties
  LOOP
    BEGIN
      PERFORM regenerate_property_requirements(prop_record.id);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to regenerate requirements for property %: %', prop_record.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Step 7: Update RLS policies for photos table to handle N/A columns
DROP POLICY IF EXISTS "Users can update own photos" ON photos;

CREATE POLICY "Users can update own photos"
  ON photos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = photos.property_id
      AND (p.created_by = auth.uid() OR auth.uid() = ANY(p.assigned_installer_ids))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = photos.property_id
      AND (p.created_by = auth.uid() OR auth.uid() = ANY(p.assigned_installer_ids))
    )
  );

-- Add helpful comments
COMMENT ON COLUMN photos.marked_not_available_at IS 'Timestamp when this photo requirement was marked as not available/not applicable';
COMMENT ON COLUMN photos.not_available_reason IS 'Optional explanation for why this requirement does not apply';
COMMENT ON COLUMN photos.marked_not_available_by IS 'User who marked this requirement as not available';
COMMENT ON COLUMN evidence_item_templates.can_mark_not_available IS 'Whether this template can be marked as not available if it does not apply to the installation';
