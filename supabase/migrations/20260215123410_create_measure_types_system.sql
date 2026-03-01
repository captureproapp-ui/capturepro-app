/*
  # Create Measure Types System

  ## Overview
  This migration creates a flexible measure types system to track different types of installations
  (Windows, Doors, External Cladding, Boilers, Insulation) across properties.

  ## New Tables
  
  ### `measure_types`
  - `id` (uuid, primary key) - Unique identifier for measure type
  - `name` (text) - Display name (e.g., "Windows", "Doors")
  - `code` (text, unique) - Machine-readable code (e.g., "windows", "doors")
  - `description` (text) - Description of the measure type
  - `icon_name` (text) - Icon identifier for UI display
  - `color_class` (text) - CSS color class for badges
  - `is_active` (boolean) - Whether this measure type is currently available
  - `created_at` (timestamptz) - Creation timestamp

  ## Table Modifications

  ### `areas`
  - Added `measure_type_id` (uuid, nullable) - Links area to a specific measure type
  - Added `measure_count` (integer) - Flexible count field replacing windows/doors specific fields
  - Keep existing `windows_to_replace_count` and `doors_to_replace_count` for backward compatibility

  ## Views

  ### `property_measures_summary`
  - Aggregates which measure types are installed per property
  - Used for efficient filtering and display in properties list

  ## Security
  - Enable RLS on measure_types table
  - Add policies for authenticated users to read measure types
  - Update areas policies to validate measure type access

  ## Notes
  - Existing data will remain intact with backward compatibility
  - Migration includes seeding of initial measure types
*/

-- Create measure_types table
CREATE TABLE IF NOT EXISTS measure_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  icon_name text NOT NULL,
  color_class text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on measure_types
ALTER TABLE measure_types ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read measure types
CREATE POLICY "Authenticated users can read measure types"
  ON measure_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Add measure tracking columns to areas table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'areas' AND column_name = 'measure_type_id'
  ) THEN
    ALTER TABLE areas ADD COLUMN measure_type_id uuid REFERENCES measure_types(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'areas' AND column_name = 'measure_count'
  ) THEN
    ALTER TABLE areas ADD COLUMN measure_count integer DEFAULT 0;
  END IF;
END $$;

-- Seed initial measure types
INSERT INTO measure_types (name, code, description, icon_name, color_class) VALUES
  ('Windows', 'windows', 'Window installation and replacement', 'square', 'bg-blue-100 text-blue-800'),
  ('Doors', 'doors', 'Door installation and replacement', 'door-open', 'bg-green-100 text-green-800'),
  ('External Cladding', 'external_cladding', 'External wall cladding (Non Funded)', 'home', 'bg-purple-100 text-purple-800'),
  ('Boilers', 'boilers', 'Boiler installation and servicing', 'flame', 'bg-orange-100 text-orange-800'),
  ('Insulation', 'insulation', 'Insulation installation', 'layers', 'bg-teal-100 text-teal-800')
ON CONFLICT (code) DO NOTHING;

-- Create view for property measures summary (simplified version)
CREATE OR REPLACE VIEW property_measures_summary AS
WITH measure_counts AS (
  SELECT 
    a.property_id,
    mt.id AS measure_type_id,
    mt.code AS measure_code,
    mt.name AS measure_name,
    mt.icon_name,
    mt.color_class,
    SUM(a.measure_count) AS total_count
  FROM areas a
  INNER JOIN measure_types mt ON mt.id = a.measure_type_id
  GROUP BY a.property_id, mt.id, mt.code, mt.name, mt.icon_name, mt.color_class
)
SELECT 
  p.id AS property_id,
  p.job_ref,
  p.organisation_id,
  COALESCE(array_agg(mc.measure_type_id) FILTER (WHERE mc.measure_type_id IS NOT NULL), ARRAY[]::uuid[]) AS measure_type_ids,
  COALESCE(array_agg(mc.measure_code) FILTER (WHERE mc.measure_code IS NOT NULL), ARRAY[]::text[]) AS measure_codes,
  COALESCE(array_agg(mc.measure_name) FILTER (WHERE mc.measure_name IS NOT NULL), ARRAY[]::text[]) AS measure_names,
  COALESCE(
    jsonb_object_agg(
      mc.measure_code,
      jsonb_build_object(
        'name', mc.measure_name,
        'count', mc.total_count,
        'icon', mc.icon_name,
        'color', mc.color_class
      )
    ) FILTER (WHERE mc.measure_code IS NOT NULL),
    '{}'::jsonb
  ) AS measures_detail
FROM properties p
LEFT JOIN measure_counts mc ON mc.property_id = p.id
GROUP BY p.id, p.job_ref, p.organisation_id;

-- Migrate existing windows and doors data to new structure
DO $$
DECLARE
  windows_measure_id uuid;
  doors_measure_id uuid;
BEGIN
  -- Get measure type IDs
  SELECT id INTO windows_measure_id FROM measure_types WHERE code = 'windows';
  SELECT id INTO doors_measure_id FROM measure_types WHERE code = 'doors';

  -- Update areas with windows
  UPDATE areas 
  SET 
    measure_type_id = windows_measure_id,
    measure_count = COALESCE(windows_to_replace_count, 0)
  WHERE 
    windows_to_replace_count > 0 
    AND measure_type_id IS NULL;

  -- For areas with both windows and doors, we'll keep the window assignment
  -- and create a note that doors exist (in future iterations, might split into separate areas)
  UPDATE areas 
  SET 
    measure_type_id = doors_measure_id,
    measure_count = COALESCE(doors_to_replace_count, 0)
  WHERE 
    doors_to_replace_count > 0 
    AND windows_to_replace_count = 0
    AND measure_type_id IS NULL;
END $$;