/*
  # Evidence Checklist System for PAS2030 Photo Evidence

  ## Overview
  Implements photo templates/evidence checklist system with requirements tracking,
  completion percentages, and property/opening-level photo management.

  ## New Tables

  ### 1. evidence_item_templates
  - `id` (uuid, primary key) - Unique template identifier
  - `code` (text, unique) - Template code (e.g., PRE_PROP_FRONT_ELEVATION)
  - `title` (text) - Human-readable title
  - `stage` (enum) - Pre/During/Post installation stage
  - `scope` (enum) - Property-level or opening-level
  - `opening_type` (enum) - Window/Door/Any (for opening-scoped only)
  - `default_required_qty` (int) - Default number of photos required
  - `requirement_level` (enum) - Required/Conditional/Optional
  - `help_text` (text) - Instructions for installers
  - `sort_order` (int) - Display order

  ### 2. property_evidence_requirements
  - `id` (uuid, primary key) - Unique requirement identifier
  - `property_id` (uuid) - Foreign key to properties
  - `template_id` (uuid) - Foreign key to evidence_item_templates
  - `required_qty` (int) - Number of photos required for this property
  - `is_required` (bool) - Whether this is mandatory
  - `is_applicable` (bool) - Whether this applies to this property

  ## Modified Tables

  ### openings
  - Add `room_name` (text) - Name of the room
  - Add `max_photos` (int) - Maximum photos per opening (default 45)

  ### photos
  - Add `template_id` (uuid) - Foreign key to evidence_item_templates
  - Add `stage` (enum) - Pre/During/Post (must match template)
  - Add `notes` (text) - Additional notes
  - Add `gps_lat` (numeric) - GPS latitude
  - Add `gps_lng` (numeric) - GPS longitude  
  - Add `gps_accuracy` (numeric) - GPS accuracy in meters
  - Remove old columns that conflict

  ### properties
  - Add `pre_elevation_count` (int) - Number of pre photos required
  - Add `post_elevation_count` (int) - Number of post photos required

  ## Security
  - Enable RLS on new tables
  - Policies enforce organisation-level data isolation
*/

-- Create enum types for evidence system
DO $$ BEGIN
  CREATE TYPE evidence_stage AS ENUM ('pre', 'during', 'post');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE evidence_scope AS ENUM ('property', 'opening');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE evidence_requirement_level AS ENUM ('required', 'conditional', 'optional');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create evidence_item_templates table
CREATE TABLE IF NOT EXISTS evidence_item_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  stage evidence_stage NOT NULL,
  scope evidence_scope NOT NULL,
  opening_type opening_type DEFAULT 'window',
  default_required_qty int DEFAULT 1,
  requirement_level evidence_requirement_level DEFAULT 'required',
  help_text text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create property_evidence_requirements table
CREATE TABLE IF NOT EXISTS property_evidence_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES evidence_item_templates(id) ON DELETE CASCADE,
  required_qty int DEFAULT 1,
  is_required boolean DEFAULT true,
  is_applicable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_property_template UNIQUE (property_id, template_id)
);

-- Add columns to openings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'openings' AND column_name = 'room_name'
  ) THEN
    ALTER TABLE openings ADD COLUMN room_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'openings' AND column_name = 'max_photos'
  ) THEN
    ALTER TABLE openings ADD COLUMN max_photos int DEFAULT 45;
  END IF;
END $$;

-- Add columns to properties table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'pre_elevation_count'
  ) THEN
    ALTER TABLE properties ADD COLUMN pre_elevation_count int DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'post_elevation_count'
  ) THEN
    ALTER TABLE properties ADD COLUMN post_elevation_count int DEFAULT 2;
  END IF;
END $$;

-- Modify photos table to support evidence templates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE photos ADD COLUMN template_id uuid REFERENCES evidence_item_templates(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'stage'
  ) THEN
    ALTER TABLE photos ADD COLUMN stage evidence_stage;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'notes'
  ) THEN
    ALTER TABLE photos ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'gps_lat'
  ) THEN
    ALTER TABLE photos ADD COLUMN gps_lat numeric(10, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'gps_lng'
  ) THEN
    ALTER TABLE photos ADD COLUMN gps_lng numeric(11, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'gps_accuracy'
  ) THEN
    ALTER TABLE photos ADD COLUMN gps_accuracy numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE photos ADD COLUMN property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_evidence_templates_code ON evidence_item_templates(code);
CREATE INDEX IF NOT EXISTS idx_evidence_templates_scope ON evidence_item_templates(scope);
CREATE INDEX IF NOT EXISTS idx_property_requirements_property ON property_evidence_requirements(property_id);
CREATE INDEX IF NOT EXISTS idx_property_requirements_template ON property_evidence_requirements(template_id);
CREATE INDEX IF NOT EXISTS idx_photos_template ON photos(template_id);
CREATE INDEX IF NOT EXISTS idx_photos_property ON photos(property_id);
CREATE INDEX IF NOT EXISTS idx_photos_stage ON photos(stage);

-- Enable RLS
ALTER TABLE evidence_item_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_evidence_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evidence_item_templates (readable by all authenticated users)
CREATE POLICY "All authenticated users can view evidence templates"
  ON evidence_item_templates FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for property_evidence_requirements
CREATE POLICY "Users can view requirements for properties in their organisation"
  ON property_evidence_requirements FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE organisation_id = get_user_organisation_id()
    )
  );

CREATE POLICY "Admins can create requirements"
  ON property_evidence_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('owner', 'admin')
    AND property_id IN (
      SELECT id FROM properties 
      WHERE organisation_id = get_user_organisation_id()
    )
  );

CREATE POLICY "Admins can update requirements"
  ON property_evidence_requirements FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('owner', 'admin')
    AND property_id IN (
      SELECT id FROM properties 
      WHERE organisation_id = get_user_organisation_id()
    )
  );

-- Function to set elevation counts based on property type
CREATE OR REPLACE FUNCTION set_elevation_counts_for_property()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.property_type
    WHEN 'mid_terrace' THEN
      NEW.pre_elevation_count := 2;
      NEW.post_elevation_count := 2;
    WHEN 'end_terrace' THEN
      NEW.pre_elevation_count := 3;
      NEW.post_elevation_count := 3;
    WHEN 'detached' THEN
      NEW.pre_elevation_count := 4;
      NEW.post_elevation_count := 4;
    WHEN 'semi_detached' THEN
      NEW.pre_elevation_count := 3;
      NEW.post_elevation_count := 3;
    ELSE
      NEW.pre_elevation_count := 2;
      NEW.post_elevation_count := 2;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set elevation counts
DROP TRIGGER IF EXISTS set_elevation_counts_trigger ON properties;
CREATE TRIGGER set_elevation_counts_trigger
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION set_elevation_counts_for_property();

-- Function to create property evidence requirements on property creation
CREATE OR REPLACE FUNCTION create_property_evidence_requirements()
RETURNS TRIGGER AS $$
DECLARE
  rear_applicable boolean;
  other_pre_qty int;
  other_post_qty int;
BEGIN
  -- Determine if rear elevation is applicable
  rear_applicable := NEW.property_type IN ('end_terrace', 'detached', 'semi_detached');
  
  -- Calculate "other" elevations count
  other_pre_qty := NEW.pre_elevation_count - 1 - CASE WHEN rear_applicable THEN 1 ELSE 0 END;
  other_post_qty := NEW.post_elevation_count - 1 - CASE WHEN rear_applicable THEN 1 ELSE 0 END;
  
  -- Insert property-level elevation requirements
  
  -- Front elevation (pre)
  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT NEW.id, id, 1, true, true
  FROM evidence_item_templates
  WHERE code = 'PRE_PROP_FRONT_ELEVATION';
  
  -- Rear elevation (pre)
  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT NEW.id, id, 1, true, rear_applicable
  FROM evidence_item_templates
  WHERE code = 'PRE_PROP_REAR_ELEVATION';
  
  -- Other elevations (pre)
  IF other_pre_qty > 0 THEN
    INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
    SELECT NEW.id, id, other_pre_qty, true, true
    FROM evidence_item_templates
    WHERE code = 'PRE_PROP_OTHER_ELEVATIONS';
  END IF;
  
  -- Front elevation (post)
  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT NEW.id, id, 1, true, true
  FROM evidence_item_templates
  WHERE code = 'POST_PROP_FRONT_ELEVATION';
  
  -- Rear elevation (post)
  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT NEW.id, id, 1, true, rear_applicable
  FROM evidence_item_templates
  WHERE code = 'POST_PROP_REAR_ELEVATION';
  
  -- Other elevations (post)
  IF other_post_qty > 0 THEN
    INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
    SELECT NEW.id, id, other_post_qty, true, true
    FROM evidence_item_templates
    WHERE code = 'POST_PROP_OTHER_ELEVATIONS';
  END IF;
  
  -- Insert opening-level requirements for all openings (will be applicable to all openings)
  INSERT INTO property_evidence_requirements (property_id, template_id, required_qty, is_required, is_applicable)
  SELECT NEW.id, id, default_required_qty, requirement_level = 'required', true
  FROM evidence_item_templates
  WHERE scope = 'opening';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create requirements on property creation
DROP TRIGGER IF EXISTS create_property_requirements_trigger ON properties;
CREATE TRIGGER create_property_requirements_trigger
  AFTER INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION create_property_evidence_requirements();

-- Update trigger for property_evidence_requirements
DROP TRIGGER IF EXISTS update_property_requirements_updated_at ON property_evidence_requirements;
CREATE TRIGGER update_property_requirements_updated_at
  BEFORE UPDATE ON property_evidence_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
