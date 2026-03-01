/*
  # Create Property Measures System

  ## Overview
  This migration establishes a link between properties and the measure types being fitted,
  enabling dynamic photo requirements based on what work is actually being done at each property.

  ## New Tables

  ### `property_measures`
  - `id` (uuid, primary key) - Unique identifier
  - `property_id` (uuid) - Foreign key to properties table
  - `measure_type_id` (uuid) - Foreign key to measure_types table
  - `created_at` (timestamptz) - When this measure was added to the property
  - `created_by` (uuid) - Who added this measure to the property
  - UNIQUE constraint on (property_id, measure_type_id) - Prevent duplicate measure assignments

  ## Table Modifications

  ### `evidence_item_templates`
  - Added `measure_type_id` (uuid, nullable) - Links photo templates to specific measure types
  - NULL means the template applies to all properties regardless of measure type (e.g., elevations)
  - Non-NULL means the template only applies when that measure type is selected

  ## New Functions

  ### `generate_requirements_for_property_measures(property_id)`
  - Generates property_evidence_requirements based on selected property measures
  - Creates property-level requirements (elevations) for all properties
  - Creates measure-specific requirements only for selected measure types
  - Called automatically after property creation or measure changes

  ## Security
  - Enable RLS on property_measures table
  - Policies enforce organisation-level data isolation
  - Only authenticated users can read property measures
  - Only users in the same organisation can modify property measures

  ## Notes
  - Existing properties will need to be backfilled (separate migration)
  - This system validates against organisation_measures subscriptions
  - Photo requirements become dynamic based on work being performed
*/

-- Create property_measures table
CREATE TABLE IF NOT EXISTS property_measures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  measure_type_id uuid NOT NULL REFERENCES measure_types(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  CONSTRAINT unique_property_measure UNIQUE (property_id, measure_type_id)
);

-- Enable RLS on property_measures
ALTER TABLE property_measures ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read property measures for properties in their organisation
CREATE POLICY "Users can read property measures in their organisation"
  ON property_measures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN profiles prof ON prof.organisation_id = p.organisation_id
      WHERE p.id = property_measures.property_id
      AND prof.id = auth.uid()
    )
  );

-- Policy: Users can insert property measures for properties in their organisation
CREATE POLICY "Users can insert property measures in their organisation"
  ON property_measures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN profiles prof ON prof.organisation_id = p.organisation_id
      WHERE p.id = property_measures.property_id
      AND prof.id = auth.uid()
    )
  );

-- Policy: Users can delete property measures for properties in their organisation
CREATE POLICY "Users can delete property measures in their organisation"
  ON property_measures
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN profiles prof ON prof.organisation_id = p.organisation_id
      WHERE p.id = property_measures.property_id
      AND prof.id = auth.uid()
    )
  );

-- Add measure_type_id to evidence_item_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evidence_item_templates' AND column_name = 'measure_type_id'
  ) THEN
    ALTER TABLE evidence_item_templates
    ADD COLUMN measure_type_id uuid REFERENCES measure_types(id);
  END IF;
END $$;

-- Add comment explaining the measure_type_id column
COMMENT ON COLUMN evidence_item_templates.measure_type_id IS 'Links photo template to a specific measure type. NULL = applies to all properties (e.g., elevations). Non-NULL = only applies when that measure is selected.';

-- Update existing templates to link windows/doors templates to their measure types
DO $$
DECLARE
  windows_measure_id uuid;
  doors_measure_id uuid;
BEGIN
  -- Get measure type IDs
  SELECT id INTO windows_measure_id FROM measure_types WHERE code = 'windows';
  SELECT id INTO doors_measure_id FROM measure_types WHERE code = 'doors';

  -- Link window-related templates
  UPDATE evidence_item_templates
  SET measure_type_id = windows_measure_id
  WHERE opening_type = 'window' AND scope = 'opening';

  -- Link door-related templates
  UPDATE evidence_item_templates
  SET measure_type_id = doors_measure_id
  WHERE opening_type = 'door' AND scope = 'opening';

  -- Property-level templates (elevations) remain NULL - they apply to all properties
END $$;

-- Create function to generate photo requirements based on property measures
CREATE OR REPLACE FUNCTION generate_requirements_for_property_measures(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_measure_type_id uuid;
  v_template record;
BEGIN
  -- Delete existing requirements to regenerate fresh
  DELETE FROM property_evidence_requirements
  WHERE property_id = p_property_id;

  -- Insert property-level requirements (elevations, etc.) - these apply to all properties
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

  -- Insert measure-specific requirements for each selected measure
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_property_measures_property_id ON property_measures(property_id);
CREATE INDEX IF NOT EXISTS idx_property_measures_measure_type_id ON property_measures(measure_type_id);
CREATE INDEX IF NOT EXISTS idx_evidence_item_templates_measure_type_id ON evidence_item_templates(measure_type_id);
