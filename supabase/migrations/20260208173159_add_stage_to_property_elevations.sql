/*
  # Add Stage Field to Property Elevations

  1. Changes
    - Add `stage` column to `property_elevations` table
    - Stage can be 'pre' (before installation) or 'post' (after installation)
    - Default to 'pre' for existing records
    - Add check constraint to ensure valid values
    - Update existing records based on elevation_label naming convention

  2. Migration Details
    - Adds `stage` enum column with values 'pre' and 'post'
    - Updates existing records: labels containing 'post' or 'after' → 'post', others → 'pre'
    - Adds constraint to ensure only valid stage values
*/

-- Add stage column with default value
ALTER TABLE property_elevations 
ADD COLUMN IF NOT EXISTS stage text DEFAULT 'pre' CHECK (stage IN ('pre', 'post'));

-- Update existing records based on elevation_label
-- If the label contains 'post', 'after', or similar keywords, set to 'post'
UPDATE property_elevations
SET stage = CASE
  WHEN LOWER(elevation_label) LIKE '%post%' 
    OR LOWER(elevation_label) LIKE '%after%' 
    OR LOWER(elevation_label) LIKE '%complete%' 
    THEN 'post'
  ELSE 'pre'
END
WHERE stage = 'pre';

-- Create index for faster filtering by stage
CREATE INDEX IF NOT EXISTS idx_property_elevations_property_stage 
  ON property_elevations(property_id, stage);

-- Add comment to document the column
COMMENT ON COLUMN property_elevations.stage IS 'Installation stage: pre (before installation) or post (after installation)';
