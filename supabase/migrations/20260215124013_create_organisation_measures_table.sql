/*
  # Create organisation_measures table

  1. New Tables
    - `organisation_measures`
      - `id` (uuid, primary key) - Unique identifier for the measure assignment
      - `organisation_id` (uuid, foreign key) - Links to organisations table
      - `measure_type_id` (uuid, foreign key) - Links to measure_types table
      - `is_primary` (boolean) - Whether this is the primary/starting measure for the org
      - `created_at` (timestamp) - When the measure was added to the organisation
      - `created_by` (uuid, nullable) - User who added the measure (nullable for system-created)

  2. Security
    - Enable RLS on `organisation_measures` table
    - Add policy for authenticated users to read their own organisation's measures
    - Add policy for owners/admins to insert measures for their organisation

  3. Constraints
    - Unique constraint on (organisation_id, measure_type_id) to prevent duplicates
    - Foreign key constraints for data integrity
*/

-- Create organisation_measures table
CREATE TABLE IF NOT EXISTS organisation_measures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  measure_type_id uuid NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  CONSTRAINT organisation_measures_organisation_fkey 
    FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  CONSTRAINT organisation_measures_measure_type_fkey 
    FOREIGN KEY (measure_type_id) REFERENCES measure_types(id) ON DELETE CASCADE,
  CONSTRAINT organisation_measures_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT organisation_measures_unique 
    UNIQUE (organisation_id, measure_type_id)
);

-- Enable RLS
ALTER TABLE organisation_measures ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read measures for their organisation
CREATE POLICY "Users can read own organisation measures"
  ON organisation_measures
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Owners and admins can insert measures for their organisation
CREATE POLICY "Owners and admins can insert organisation measures"
  ON organisation_measures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Owners and admins can update measures for their organisation
CREATE POLICY "Owners and admins can update organisation measures"
  ON organisation_measures
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Owners and admins can delete measures from their organisation
CREATE POLICY "Owners and admins can delete organisation measures"
  ON organisation_measures
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organisation_measures_org_id 
  ON organisation_measures(organisation_id);

CREATE INDEX IF NOT EXISTS idx_organisation_measures_measure_type_id 
  ON organisation_measures(measure_type_id);
