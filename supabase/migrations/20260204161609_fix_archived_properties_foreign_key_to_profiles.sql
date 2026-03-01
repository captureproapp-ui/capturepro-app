/*
  # Fix Archived Properties Foreign Key to Profiles

  ## Problem
  The `archived_properties.archived_by` foreign key currently points to `auth.users(id)`, 
  but the application queries use `profiles!archived_properties_archived_by_fkey(full_name)`.
  This causes the error: "Could not find a relationship between 'archived_properties' and 'profiles'".

  ## Solution
  1. Drop the existing foreign key constraint that points to `auth.users(id)`
  2. Create a new foreign key constraint that points to `profiles(id)`
  3. Keep the same constraint name so existing queries continue to work without modification

  ## Why This Is Safe
  - `profiles.id` is already a foreign key to `auth.users(id`, so all existing `archived_by` values are valid
  - No data is lost or modified during this migration
  - The application already expects to join with the `profiles` table
  - This aligns the database schema with application usage patterns

  ## Impact
  - The query in ArchiveManagement.tsx will now work correctly
  - The "Archived By" column will display user full names from the profiles table
  - Better consistency across the codebase (profiles table used everywhere)
*/

-- Drop the existing foreign key constraint that points to auth.users
ALTER TABLE archived_properties 
DROP CONSTRAINT IF EXISTS archived_properties_archived_by_fkey;

-- Create new foreign key constraint that points to profiles
-- Using the same constraint name so existing queries don't need to change
ALTER TABLE archived_properties
ADD CONSTRAINT archived_properties_archived_by_fkey 
FOREIGN KEY (archived_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Add a comment to document this design decision
COMMENT ON CONSTRAINT archived_properties_archived_by_fkey ON archived_properties IS 
'Foreign key to profiles table (not auth.users) to align with application query patterns. Since profiles.id = auth.users.id, data integrity is maintained.';
