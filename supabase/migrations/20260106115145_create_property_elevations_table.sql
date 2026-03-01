/*
  # Create Property Elevations Table

  ## Overview
  Creates the missing property_elevations table to store whole-building elevation photos
  (front, back, side views) that are used in PDF reports to show the overall property.

  ## New Tables
  
  ### property_elevations
  - `id` (uuid, primary key) - Unique identifier for the elevation photo
  - `property_id` (uuid, foreign key) - Reference to the property
  - `elevation_label` (text) - Label for the elevation (e.g., "Front", "Back", "Left Side", "Right Side")
  - `photo_url` (text) - URL/path to the photo in storage
  - `uploaded_by` (uuid) - Reference to the user who uploaded the photo
  - `created_at` (timestamptz) - Timestamp of when the photo was uploaded
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on property_elevations table
  - Users can view elevations for properties in their organisation
  - Users can insert elevations for properties in their organisation
  - Users can update/delete their own uploaded elevations or if they're admins

  ## Indexes
  - Index on property_id for fast lookups
  - Index on elevation_label for filtering
*/

-- Create property_elevations table
CREATE TABLE IF NOT EXISTS property_elevations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  elevation_label text NOT NULL,
  photo_url text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_property_elevations_property_id ON property_elevations(property_id);
CREATE INDEX IF NOT EXISTS idx_property_elevations_elevation_label ON property_elevations(elevation_label);

-- Enable RLS
ALTER TABLE property_elevations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view elevations for properties in their organisation
CREATE POLICY "Users can view property elevations in their organisation"
  ON property_elevations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_elevations.property_id
      AND p.organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy: Users can insert elevations for properties in their organisation
CREATE POLICY "Users can insert property elevations in their organisation"
  ON property_elevations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_elevations.property_id
      AND p.organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    )
    AND uploaded_by = auth.uid()
  );

-- Policy: Users can update their own elevations or if they're admins
CREATE POLICY "Users can update own elevations or admins can update any"
  ON property_elevations FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
      AND organisation_id = (
        SELECT p.organisation_id FROM properties p
        WHERE p.id = property_elevations.property_id
      )
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
      AND organisation_id = (
        SELECT p.organisation_id FROM properties p
        WHERE p.id = property_elevations.property_id
      )
    )
  );

-- Policy: Users can delete their own elevations or if they're admins
CREATE POLICY "Users can delete own elevations or admins can delete any"
  ON property_elevations FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
      AND organisation_id = (
        SELECT p.organisation_id FROM properties p
        WHERE p.id = property_elevations.property_id
      )
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_property_elevations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_property_elevations_updated_at
  BEFORE UPDATE ON property_elevations
  FOR EACH ROW
  EXECUTE FUNCTION update_property_elevations_updated_at();
