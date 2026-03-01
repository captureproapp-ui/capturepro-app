/*
  # Fix GPS Column Usage

  1. Problem
    - Photos table has both old columns (latitude, longitude) and new columns (gps_lat, gps_lng)
    - PhotoUploadForm saves to latitude/longitude
    - Report generators read from gps_lat/gps_lng
    - This causes all locations to show as "not available"

  2. Changes
    - Copy existing GPS data from latitude/longitude to gps_lat/gps_lng
    - Remove duplicate latitude/longitude columns
    - Add indexes for performance on GPS columns

  3. Security
    - No RLS changes needed
*/

-- Copy existing GPS data to the correct columns
UPDATE photos
SET
  gps_lat = latitude,
  gps_lng = longitude
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND (gps_lat IS NULL OR gps_lng IS NULL);

-- Drop the old duplicate columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE photos DROP COLUMN latitude;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE photos DROP COLUMN longitude;
  END IF;
END $$;

-- Add indexes for GPS queries (useful for future geolocation features)
CREATE INDEX IF NOT EXISTS idx_photos_gps_lat ON photos(gps_lat) WHERE gps_lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_gps_lng ON photos(gps_lng) WHERE gps_lng IS NOT NULL;
