/*
  # Make photos.opening_id Nullable for Property-Level Photos

  ## Summary
  This migration makes the `opening_id` column nullable in the `photos` table to support
  property-level photos (such as elevations) that don't belong to a specific opening.

  ## Changes Made

  1. **Drop NOT NULL constraint on opening_id**
     - Allows photos to be associated with properties without requiring an opening
     - Enables property-level elevation photos to be stored

  2. **Add data integrity constraint**
     - Ensures that either opening_id or property_id is always present
     - Prevents orphaned photos that don't belong to any entity

  ## Security Notes
  - Existing RLS policies remain unchanged
  - All photos must still be associated with a property
  - Authorization continues to be enforced at the organization level
*/

-- Make opening_id nullable to support property-level photos
ALTER TABLE photos
  ALTER COLUMN opening_id DROP NOT NULL;

-- Add constraint to ensure data integrity
-- Either opening_id or property_id must be present (at least one must be non-null)
ALTER TABLE photos
  ADD CONSTRAINT photos_must_have_property_or_opening
  CHECK (property_id IS NOT NULL);

-- Add comment explaining the data model
COMMENT ON COLUMN photos.opening_id IS 'Foreign key to openings table. NULL for property-level photos (e.g., elevations). NOT NULL for opening-specific photos (e.g., window/door installations).';
COMMENT ON COLUMN photos.property_id IS 'Foreign key to properties table. Required for all photos to ensure proper organization-level access control.';