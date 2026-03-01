/*
  # Seed Evidence Item Templates

  ## Overview
  Populates the evidence_item_templates table with standard PAS2030 photo requirements
  for both property-level elevations and opening-level (window/door) photos.

  ## Templates Created
  
  ### Property-Level Elevations (6 templates)
  - Pre: Front, Rear, Other elevations
  - Post: Front, Rear, Other elevations
  
  ### Opening-Level Requirements (15 templates)
  - Pre: 3 required photos (exterior open/closed, interior closeup)
  - During: 6 required photos (after removal, fixings, packing, level/square, insulation, airtight seal)
  - Post: 6 required photos (ext/int views, sealant closeups, operation, lock)
*/

-- Property-level elevation templates (PRE)
INSERT INTO evidence_item_templates (code, title, stage, scope, opening_type, default_required_qty, requirement_level, help_text, sort_order)
VALUES 
  ('PRE_PROP_FRONT_ELEVATION', 'Front Elevation (Pre)', 'pre', 'property', 'window', 1, 'required', 'Photo of the front of the property before installation', 10),
  ('PRE_PROP_REAR_ELEVATION', 'Rear Elevation (Pre)', 'pre', 'property', 'window', 1, 'conditional', 'Photo of the rear of the property before installation (if accessible)', 20),
  ('PRE_PROP_OTHER_ELEVATIONS', 'Other Elevations (Pre)', 'pre', 'property', 'window', 1, 'required', 'Photos of other sides of the property before installation', 30)
ON CONFLICT (code) DO NOTHING;

-- Property-level elevation templates (POST)
INSERT INTO evidence_item_templates (code, title, stage, scope, opening_type, default_required_qty, requirement_level, help_text, sort_order)
VALUES 
  ('POST_PROP_FRONT_ELEVATION', 'Front Elevation (Post)', 'post', 'property', 'window', 1, 'required', 'Photo of the front of the property after installation', 310),
  ('POST_PROP_REAR_ELEVATION', 'Rear Elevation (Post)', 'post', 'property', 'window', 1, 'conditional', 'Photo of the rear of the property after installation (if accessible)', 320),
  ('POST_PROP_OTHER_ELEVATIONS', 'Other Elevations (Post)', 'post', 'property', 'window', 1, 'required', 'Photos of other sides of the property after installation', 330)
ON CONFLICT (code) DO NOTHING;

-- Opening-level PRE templates
INSERT INTO evidence_item_templates (code, title, stage, scope, opening_type, default_required_qty, requirement_level, help_text, sort_order)
VALUES 
  ('PRE_EXISTING_EXT_CLOSEUP_OPEN', 'Existing External (Open)', 'pre', 'opening', 'window', 1, 'required', 'Close-up photo of the existing window/door from outside, shown open', 110),
  ('PRE_EXISTING_EXT_CLOSEUP_CLOSED', 'Existing External (Closed)', 'pre', 'opening', 'window', 1, 'required', 'Close-up photo of the existing window/door from outside, shown closed', 120),
  ('PRE_EXISTING_INT_CLOSEUP', 'Existing Internal Close-up', 'pre', 'opening', 'window', 1, 'required', 'Close-up photo of the existing window/door from inside', 130)
ON CONFLICT (code) DO NOTHING;

-- Opening-level DURING templates
INSERT INTO evidence_item_templates (code, title, stage, scope, opening_type, default_required_qty, requirement_level, help_text, sort_order)
VALUES 
  ('DUR_OPENING_AFTER_REMOVAL', 'Opening After Removal', 'during', 'opening', 'window', 1, 'required', 'Photo showing the opening after the old window/door has been removed', 210),
  ('DUR_FIXINGS_VISIBLE', 'Fixings Visible', 'during', 'opening', 'window', 1, 'required', 'Photo clearly showing the fixings used to secure the new frame', 220),
  ('DUR_PACKING_SHIMMING', 'Packing & Shimming', 'during', 'opening', 'window', 1, 'required', 'Photo showing packing and shimming around the frame', 230),
  ('DUR_LEVEL_SQUARE', 'Level & Square Check', 'during', 'opening', 'window', 1, 'required', 'Photo showing level and square measurements being checked', 240),
  ('DUR_INSULATION_AROUND_FRAME', 'Insulation Around Frame', 'during', 'opening', 'window', 1, 'required', 'Photo showing insulation installed around the frame', 250),
  ('DUR_AIRTIGHT_SEAL_BEFORE_TRIMS', 'Airtight Seal (Before Trims)', 'during', 'opening', 'window', 1, 'required', 'Photo showing airtight seal before internal trims are fitted', 260)
ON CONFLICT (code) DO NOTHING;

-- Opening-level POST templates
INSERT INTO evidence_item_templates (code, title, stage, scope, opening_type, default_required_qty, requirement_level, help_text, sort_order)
VALUES 
  ('POST_EXT_VIEW_INSTALLED', 'External View (Installed)', 'post', 'opening', 'window', 1, 'required', 'Photo of the installed window/door from outside', 340),
  ('POST_EXT_SEALANT_CLOSEUP', 'External Sealant Close-up', 'post', 'opening', 'window', 1, 'required', 'Close-up photo of external sealant and finishing', 350),
  ('POST_INT_VIEW_INSTALLED', 'Internal View (Installed)', 'post', 'opening', 'window', 1, 'required', 'Photo of the installed window/door from inside', 360),
  ('POST_INT_SEALANT_CLOSEUP', 'Internal Sealant Close-up', 'post', 'opening', 'window', 1, 'required', 'Close-up photo of internal sealant and finishing', 370),
  ('POST_OPERATION_OPEN', 'Operation Check (Open)', 'post', 'opening', 'window', 1, 'required', 'Photo showing the window/door opened to demonstrate operation', 380),
  ('POST_LOCK_ENGAGED', 'Lock Engaged', 'post', 'opening', 'window', 1, 'required', 'Photo showing the lock mechanism engaged', 390)
ON CONFLICT (code) DO NOTHING;
