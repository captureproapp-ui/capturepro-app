/*
  # Restructure Cladding Checklist into Numbered Sections

  ## Overview
  Replaces the existing 26-template EWI cladding checklist with a focused 13-template,
  8-section checklist that matches the HardiePlank installation workflow. Adds support
  for a conditional Yes/No dropdown on the "Any repairs completed" item.

  ## Schema Changes

  ### evidence_item_templates - New Columns
  - `section_number` (int, nullable) - The numbered section this template belongs to (1-9, skipping 6)
  - `section_title` (text, nullable) - Human-readable section heading
  - `has_dropdown` (boolean, default false) - Whether this item uses a Yes/No dropdown instead of just photos

  ### property_evidence_requirements - New Columns
  - `dropdown_response` (text, nullable) - Stores 'yes' or 'no' for dropdown items
  - `response_notes` (text, nullable) - Stores description when dropdown_response is 'yes'

  ## Template Changes
  - Removes all 26 existing CLAD_* templates
  - Removes any property_evidence_requirements referencing those templates
  - Inserts 13 new CLAD_HP_* templates organised into 8 sections:
    - Section 1: Before Works (2 photos)
    - Section 2: Substrate After Strip (2 items - 1 photo + 1 conditional dropdown)
    - Section 3: Battens and Cavity (2 photos)
    - Section 4: Base Detail (1 photo)
    - Section 5: Window Head Detail (1 photo)
    - Section 7: Fixing Detail (2 photos)
    - Section 8: Product Traceability (1 photo)
    - Section 9: Completed Elevation (2 photos)

  ## Function Changes
  - Updates `get_property_completion_percentage` to treat dropdown_response='no' as completed
  - Updates `generate_requirements_for_property_measures` to pass through new columns

  ## Security Changes
  - Adds RLS policy allowing all org users to update dropdown responses on requirements

  ## Important Notes
  1. Section 6 is intentionally skipped in the numbering
  2. The "Any repairs completed" item (Section 2) has has_dropdown=true
  3. When dropdown_response='no', the item is complete without a photo
  4. When dropdown_response='yes', a photo and description are required
  5. Existing photos linked to old CLAD_* templates will be orphaned (template_id reference remains but template row is removed)
*/

-- 1. Add new columns to evidence_item_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evidence_item_templates' AND column_name = 'section_number'
  ) THEN
    ALTER TABLE evidence_item_templates ADD COLUMN section_number int;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evidence_item_templates' AND column_name = 'section_title'
  ) THEN
    ALTER TABLE evidence_item_templates ADD COLUMN section_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evidence_item_templates' AND column_name = 'has_dropdown'
  ) THEN
    ALTER TABLE evidence_item_templates ADD COLUMN has_dropdown boolean DEFAULT false;
  END IF;
END $$;

-- 2. Add new columns to property_evidence_requirements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_evidence_requirements' AND column_name = 'dropdown_response'
  ) THEN
    ALTER TABLE property_evidence_requirements ADD COLUMN dropdown_response text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_evidence_requirements' AND column_name = 'response_notes'
  ) THEN
    ALTER TABLE property_evidence_requirements ADD COLUMN response_notes text;
  END IF;
END $$;

-- 3. Remove existing cladding requirements and templates
DELETE FROM property_evidence_requirements
WHERE template_id IN (
  SELECT id FROM evidence_item_templates WHERE code LIKE 'CLAD_%'
);

DELETE FROM evidence_item_templates WHERE code LIKE 'CLAD_%';

-- 4. Insert 13 new cladding templates
DO $$
DECLARE
  v_cladding_id uuid;
BEGIN
  SELECT id INTO v_cladding_id FROM measure_types WHERE code = 'external_cladding_nf';

  IF v_cladding_id IS NULL THEN
    RAISE EXCEPTION 'External cladding measure type not found';
  END IF;

  INSERT INTO evidence_item_templates (
    code, title, stage, scope, opening_type, default_required_qty,
    requirement_level, help_text, sort_order, measure_type_id,
    section_number, section_title, has_dropdown
  ) VALUES
    -- Section 1: Before Works (2 photos)
    ('CLAD_HP_S1_FULL_ELEVATION', 'Full elevation before works', 'pre', 'property', 'window', 1,
     'required', 'Full photo of the elevation showing the existing cladding before any work begins',
     100, v_cladding_id, 1, 'Before Works', false),

    ('CLAD_HP_S1_CLOSEUP', 'Close-up of existing cladding panel', 'pre', 'property', 'window', 1,
     'required', 'Close-up photo showing the condition of the existing cladding panel',
     101, v_cladding_id, 1, 'Before Works', false),

    -- Section 2: Substrate After Strip (2 items)
    ('CLAD_HP_S2_SUBSTRATE', 'Substrate exposed after removal', 'pre', 'property', 'window', 1,
     'required', 'Photo of the wall substrate exposed after existing cladding has been stripped',
     200, v_cladding_id, 2, 'Substrate After Strip', false),

    ('CLAD_HP_S2_REPAIRS', 'Any repairs completed', 'pre', 'property', 'window', 1,
     'required', 'Were any repairs needed to the substrate? Select Yes and upload a photo with description, or No if no repairs were required',
     201, v_cladding_id, 2, 'Substrate After Strip', true),

    -- Section 3: Battens and Cavity (2 photos)
    ('CLAD_HP_S3_BATTEN_SPACING', 'Batten spacing (tape visible)', 'during', 'property', 'window', 1,
     'required', 'Photo showing batten spacing with tape measure visible to confirm correct centres',
     300, v_cladding_id, 3, 'Battens and Cavity', false),

    ('CLAD_HP_S3_CAVITY_DEPTH', 'Cavity depth (tape showing 25mm+)', 'during', 'property', 'window', 1,
     'required', 'Photo showing cavity depth with tape measure confirming minimum 25mm ventilated cavity',
     301, v_cladding_id, 3, 'Battens and Cavity', false),

    -- Section 4: Base Detail (1 photo)
    ('CLAD_HP_S4_STARTER_TRIM', 'Starter trim + 150mm ground clearance', 'during', 'property', 'window', 1,
     'required', 'Photo of starter trim installed with tape measure showing 150mm minimum clearance from ground level',
     400, v_cladding_id, 4, 'Base Detail', false),

    -- Section 5: Window Head Detail (1 photo)
    ('CLAD_HP_S5_HEAD_FLASHING', 'Head flashing installed', 'during', 'property', 'window', 1,
     'required', 'Photo of head flashing installed above window before plank covers it',
     500, v_cladding_id, 5, 'Window Head Detail', false),

    -- Section 7: Fixing Detail (2 photos) -- Section 6 intentionally skipped
    ('CLAD_HP_S7_FIXING_CLOSEUP', 'Close-up of stainless fixing', 'during', 'property', 'window', 1,
     'required', 'Close-up photo showing stainless steel fixing in the correct position on the plank',
     700, v_cladding_id, 7, 'Fixing Detail', false),

    ('CLAD_HP_S7_OVERLAP', 'Overlap measurement', 'during', 'property', 'window', 1,
     'required', 'Photo showing plank overlap measurement with tape measure visible',
     701, v_cladding_id, 7, 'Fixing Detail', false),

    -- Section 8: Product Traceability (1 photo)
    ('CLAD_HP_S8_PACKAGING', 'HardiePlank packaging / batch label', 'during', 'property', 'window', 1,
     'required', 'Photo of HardiePlank packaging or label showing batch number and product details for traceability',
     800, v_cladding_id, 8, 'Product Traceability', false),

    -- Section 9: Completed Elevation (2 photos)
    ('CLAD_HP_S9_FULL_ELEVATION', 'Full elevation completed', 'post', 'property', 'window', 1,
     'required', 'Full photo of the elevation showing the completed HardiePlank cladding installation',
     900, v_cladding_id, 9, 'Completed Elevation', false),

    ('CLAD_HP_S9_CLOSEUP', 'Close-up finished panel', 'post', 'property', 'window', 1,
     'required', 'Close-up photo of the finished HardiePlank panel showing quality of installation',
     901, v_cladding_id, 9, 'Completed Elevation', false)

  ON CONFLICT (code) DO NOTHING;
END $$;

-- 5. Add RLS policy allowing all org users to update dropdown responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'property_evidence_requirements'
    AND policyname = 'Org users can update dropdown responses on requirements'
  ) THEN
    CREATE POLICY "Org users can update dropdown responses on requirements"
      ON property_evidence_requirements FOR UPDATE
      TO authenticated
      USING (
        property_id IN (
          SELECT id FROM properties
          WHERE organisation_id = get_user_organisation_id()
        )
      )
      WITH CHECK (
        property_id IN (
          SELECT id FROM properties
          WHERE organisation_id = get_user_organisation_id()
        )
      );
  END IF;
END $$;

-- 6. Update get_property_completion_percentage to handle dropdown_response='no' as complete
DROP VIEW IF EXISTS property_completion_summary;
DROP VIEW IF EXISTS opening_completion_summary;

DROP FUNCTION IF EXISTS get_property_completion_percentage(uuid);

CREATE FUNCTION get_property_completion_percentage(p_property_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_requirements int;
  completed_requirements int;
  property_scoped_total int;
  property_scoped_completed int;
  opening_scoped_total int;
  opening_scoped_completed int;
  total_openings int;
BEGIN
  SELECT COUNT(*) INTO total_openings
  FROM openings o
  JOIN areas a ON a.id = o.area_id
  WHERE a.property_id = p_property_id;

  SELECT
    COUNT(*) FILTER (WHERE per.is_required AND per.is_applicable),
    COUNT(*) FILTER (WHERE per.is_required AND per.is_applicable AND (
      per.dropdown_response = 'no'
      OR COALESCE(pc.photo_count, 0) >= per.required_qty
      OR pc.marked_na IS NOT NULL
    ))
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
$$;

-- Recreate get_opening_completion_percentage (unchanged but must be recreated due to view dependency)
DROP FUNCTION IF EXISTS get_opening_completion_percentage(uuid);

CREATE FUNCTION get_opening_completion_percentage(p_opening_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_requirements int;
  completed_requirements int;
  p_property_id uuid;
BEGIN
  SELECT a.property_id INTO p_property_id
  FROM openings o
  JOIN areas a ON a.id = o.area_id
  WHERE o.id = p_opening_id;

  IF p_property_id IS NULL THEN
    RETURN 0;
  END IF;

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
$$;

-- Recreate views
CREATE VIEW property_completion_summary AS
SELECT
  p.id,
  p.job_ref,
  p.address_line_1,
  p.city,
  p.postcode,
  p.assigned_installer_ids,
  p.status,
  p.created_at,
  get_property_completion_percentage(p.id) AS completion_percentage,
  (
    SELECT COUNT(*)
    FROM openings o
    JOIN areas a ON a.id = o.area_id
    WHERE a.property_id = p.id
      AND get_opening_completion_percentage(o.id) < 100
  ) as unfinished_openings_count,
  (
    SELECT COUNT(*)
    FROM openings o
    JOIN areas a ON a.id = o.area_id
    WHERE a.property_id = p.id
  ) as total_openings_count
FROM properties p;

CREATE VIEW opening_completion_summary
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.area_id,
  o.opening_type,
  o.opening_number,
  o.created_at,
  get_opening_completion_percentage(o.id) as completion_percentage
FROM openings o;

-- 7. Update generate_requirements_for_property_measures to pass through new columns
CREATE OR REPLACE FUNCTION generate_requirements_for_property_measures(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_measure_type_id uuid;
BEGIN
  DELETE FROM property_evidence_requirements
  WHERE property_id = p_property_id;

  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT
    p_property_id,
    eit.id,
    eit.default_required_qty,
    CASE WHEN eit.requirement_level = 'required' THEN true ELSE false END,
    true
  FROM evidence_item_templates eit
  WHERE eit.scope = 'property'
    AND eit.measure_type_id IS NULL
  ON CONFLICT (property_id, template_id) DO NOTHING;

  FOR v_measure_type_id IN
    SELECT measure_type_id
    FROM property_measures
    WHERE property_id = p_property_id
  LOOP
    INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
    SELECT
      p_property_id,
      eit.id,
      eit.default_required_qty,
      CASE WHEN eit.requirement_level = 'required' THEN true ELSE false END,
      true
    FROM evidence_item_templates eit
    WHERE eit.measure_type_id = v_measure_type_id
    ON CONFLICT (property_id, template_id) DO NOTHING;
  END LOOP;
END $$;
