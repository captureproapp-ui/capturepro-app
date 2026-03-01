/*
  # Create Cladding (EWI) Evidence Item Templates

  ## Overview
  Adds ~26 photo evidence templates for External Wall Insulation (Cladding) installations.
  These templates are linked to the 'external_cladding_nf' measure type and use scope = 'property'
  since cladding work is all exterior (no room/opening-level breakdown).

  ## New Templates

  ### Pre-Installation (8 templates, sort_order 1000-1007)
  - Front elevation showing existing wall condition
  - Rear elevation showing existing wall condition
  - Side elevation(s) showing existing wall condition
  - Wall surface close-up (substrate condition)
  - Existing defects or damage
  - Ground level / DPC detail
  - Eaves / soffit junction
  - Window/door reveals (existing condition)

  ### During Installation (9 templates, sort_order 1100-1108)
  - Wall preparation / surface cleaning
  - Starter track / base rail installed
  - Insulation boards being applied
  - Mechanical fixings pattern
  - Insulation layer complete (before render)
  - Corner and edge detailing
  - Window/door reveal detailing
  - Mesh and basecoat application
  - Bellcast / drip bead detail

  ### Post-Installation (9 templates, sort_order 1200-1208)
  - Front elevation completed
  - Rear elevation completed
  - Side elevation(s) completed
  - Rendered finish close-up
  - Ground level / DPC detail (completed)
  - Eaves junction (completed)
  - Window/door reveals (completed)
  - Sealant and joint detail
  - Penetrations sealed (pipes, cables, vents)

  ## Notes
  - All templates use scope = 'property' (no room/opening concept for cladding)
  - All templates are linked to the external_cladding_nf measure type
  - The existing generate_requirements_for_property_measures function will
    automatically pick these up when cladding is assigned to a property
*/

DO $$
DECLARE
  v_cladding_id uuid;
BEGIN
  SELECT id INTO v_cladding_id FROM measure_types WHERE code = 'external_cladding_nf';

  IF v_cladding_id IS NULL THEN
    RAISE EXCEPTION 'External cladding measure type not found';
  END IF;

  -- Pre-Installation Templates (8)
  INSERT INTO evidence_item_templates (code, title, stage, scope, opening_type, default_required_qty, requirement_level, help_text, sort_order, measure_type_id)
  VALUES
    ('CLAD_PRE_FRONT_ELEVATION', 'Front elevation (existing)', 'pre', 'property', 'window', 1, 'required',
     'Photo of the front of the property showing the existing wall condition before cladding work begins', 1000, v_cladding_id),
    ('CLAD_PRE_REAR_ELEVATION', 'Rear elevation (existing)', 'pre', 'property', 'window', 1, 'required',
     'Photo of the rear of the property showing the existing wall condition', 1001, v_cladding_id),
    ('CLAD_PRE_SIDE_ELEVATIONS', 'Side elevation(s) (existing)', 'pre', 'property', 'window', 1, 'required',
     'Photo of the side(s) of the property showing existing wall condition. Take one per accessible side.', 1002, v_cladding_id),
    ('CLAD_PRE_WALL_SURFACE', 'Wall surface close-up', 'pre', 'property', 'window', 1, 'required',
     'Close-up photo of the wall surface showing substrate condition (render, brick, block, etc.)', 1003, v_cladding_id),
    ('CLAD_PRE_DEFECTS', 'Existing defects or damage', 'pre', 'property', 'window', 1, 'required',
     'Photo documenting any existing cracks, damp, damage or defects on the wall surface', 1004, v_cladding_id),
    ('CLAD_PRE_GROUND_DPC', 'Ground level / DPC detail', 'pre', 'property', 'window', 1, 'required',
     'Photo showing the ground level and damp proof course (DPC) area before installation', 1005, v_cladding_id),
    ('CLAD_PRE_EAVES_SOFFIT', 'Eaves / soffit junction', 'pre', 'property', 'window', 1, 'required',
     'Photo of the eaves and soffit area showing existing condition and clearances', 1006, v_cladding_id),
    ('CLAD_PRE_REVEALS', 'Window/door reveals (existing)', 'pre', 'property', 'window', 1, 'required',
     'Photo of window and door reveals showing existing condition before cladding', 1007, v_cladding_id)
  ON CONFLICT (code) DO NOTHING;

  -- During Installation Templates (9)
  INSERT INTO evidence_item_templates (code, title, stage, scope, opening_type, default_required_qty, requirement_level, help_text, sort_order, measure_type_id)
  VALUES
    ('CLAD_DUR_WALL_PREP', 'Wall preparation / cleaning', 'during', 'property', 'window', 1, 'required',
     'Photo showing the wall surface after preparation and cleaning, ready for insulation', 1100, v_cladding_id),
    ('CLAD_DUR_STARTER_TRACK', 'Starter track / base rail', 'during', 'property', 'window', 1, 'required',
     'Photo showing the starter track or base rail installed at the correct height above DPC', 1101, v_cladding_id),
    ('CLAD_DUR_INSULATION_BOARDS', 'Insulation boards applied', 'during', 'property', 'window', 1, 'required',
     'Photo showing insulation boards being applied to the wall surface with correct bonding pattern', 1102, v_cladding_id),
    ('CLAD_DUR_MECH_FIXINGS', 'Mechanical fixings pattern', 'during', 'property', 'window', 1, 'required',
     'Photo showing mechanical fixings installed in the correct pattern and quantity per board', 1103, v_cladding_id),
    ('CLAD_DUR_INSULATION_COMPLETE', 'Insulation complete (before render)', 'during', 'property', 'window', 1, 'required',
     'Photo showing the full insulation layer complete before mesh and render application', 1104, v_cladding_id),
    ('CLAD_DUR_CORNER_DETAIL', 'Corner and edge detailing', 'during', 'property', 'window', 1, 'required',
     'Photo showing corner beads, edge profiles, and reinforcement mesh at corners', 1105, v_cladding_id),
    ('CLAD_DUR_REVEAL_DETAIL', 'Window/door reveal detailing', 'during', 'property', 'window', 1, 'required',
     'Photo showing insulation and detailing around window and door reveals', 1106, v_cladding_id),
    ('CLAD_DUR_MESH_BASECOAT', 'Mesh and basecoat application', 'during', 'property', 'window', 1, 'required',
     'Photo showing reinforcement mesh embedded in basecoat render', 1107, v_cladding_id),
    ('CLAD_DUR_BELLCAST', 'Bellcast / drip bead detail', 'during', 'property', 'window', 1, 'required',
     'Photo showing bellcast bead or drip detail at the base of the system', 1108, v_cladding_id)
  ON CONFLICT (code) DO NOTHING;

  -- Post-Installation Templates (9)
  INSERT INTO evidence_item_templates (code, title, stage, scope, opening_type, default_required_qty, requirement_level, help_text, sort_order, measure_type_id)
  VALUES
    ('CLAD_POST_FRONT_ELEVATION', 'Front elevation (completed)', 'post', 'property', 'window', 1, 'required',
     'Photo of the front of the property showing the completed cladding finish', 1200, v_cladding_id),
    ('CLAD_POST_REAR_ELEVATION', 'Rear elevation (completed)', 'post', 'property', 'window', 1, 'required',
     'Photo of the rear of the property showing the completed cladding finish', 1201, v_cladding_id),
    ('CLAD_POST_SIDE_ELEVATIONS', 'Side elevation(s) (completed)', 'post', 'property', 'window', 1, 'required',
     'Photo of the side(s) of the property showing the completed cladding finish', 1202, v_cladding_id),
    ('CLAD_POST_FINISH_CLOSEUP', 'Rendered finish close-up', 'post', 'property', 'window', 1, 'required',
     'Close-up photo of the finished render surface showing texture and quality', 1203, v_cladding_id),
    ('CLAD_POST_GROUND_DPC', 'Ground level / DPC detail (completed)', 'post', 'property', 'window', 1, 'required',
     'Photo showing the completed ground level detail and DPC clearance', 1204, v_cladding_id),
    ('CLAD_POST_EAVES', 'Eaves junction (completed)', 'post', 'property', 'window', 1, 'required',
     'Photo showing the completed junction between cladding and eaves/soffit', 1205, v_cladding_id),
    ('CLAD_POST_REVEALS', 'Window/door reveals (completed)', 'post', 'property', 'window', 1, 'required',
     'Photo of completed window and door reveals with finished cladding detail', 1206, v_cladding_id),
    ('CLAD_POST_SEALANT', 'Sealant and joint detail', 'post', 'property', 'window', 1, 'required',
     'Close-up photo of sealant joints, expansion joints, and movement joints', 1207, v_cladding_id),
    ('CLAD_POST_PENETRATIONS', 'Penetrations sealed (pipes, cables)', 'post', 'property', 'window', 1, 'required',
     'Photo showing service penetrations (pipes, cables, vents) properly sealed through the cladding', 1208, v_cladding_id)
  ON CONFLICT (code) DO NOTHING;

  RAISE NOTICE 'Cladding evidence templates created successfully with measure_type_id: %', v_cladding_id;
END $$;
