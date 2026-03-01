/*
  # Automatic Installer Name Synchronization

  1. Purpose
    - Automatically sync assigned_installer_name with actual profiles.full_name
    - Fixes issue where installer names don't update when profiles change
    - Handles multiple installers by concatenating names with commas
  
  2. Functions
    - `get_installer_names_from_ids()` - Joins installer IDs with profiles to get names
    - `sync_installer_names()` - Trigger function to update installer names
  
  3. Triggers
    - On properties INSERT/UPDATE of assigned_installer_ids
    - On profiles UPDATE of full_name (updates all properties assigned to that installer)
  
  4. Data Migration
    - Backfills all existing properties with correct installer names
*/

-- Function to get installer names from IDs
CREATE OR REPLACE FUNCTION get_installer_names_from_ids(installer_ids UUID[])
RETURNS TEXT AS $$
DECLARE
  names TEXT;
BEGIN
  -- If array is empty or null, return empty string
  IF installer_ids IS NULL OR array_length(installer_ids, 1) IS NULL THEN
    RETURN '';
  END IF;
  
  -- Join installer IDs with profiles to get names, concatenate with commas
  SELECT string_agg(p.full_name, ', ' ORDER BY p.full_name)
  INTO names
  FROM unnest(installer_ids) AS installer_id
  LEFT JOIN profiles p ON p.id = installer_id
  WHERE p.full_name IS NOT NULL;
  
  RETURN COALESCE(names, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync installer names when properties are inserted or updated
CREATE OR REPLACE FUNCTION sync_installer_names_on_property()
RETURNS TRIGGER AS $$
BEGIN
  -- Update assigned_installer_name based on assigned_installer_ids
  NEW.assigned_installer_name := get_installer_names_from_ids(NEW.assigned_installer_ids);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on properties table
DROP TRIGGER IF EXISTS trigger_sync_installer_names_on_property ON properties;
CREATE TRIGGER trigger_sync_installer_names_on_property
  BEFORE INSERT OR UPDATE OF assigned_installer_ids ON properties
  FOR EACH ROW
  EXECUTE FUNCTION sync_installer_names_on_property();

-- Function to sync installer names when a profile's full_name changes
CREATE OR REPLACE FUNCTION sync_installer_names_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If full_name has changed, update all properties where this user is an assigned installer
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    UPDATE properties
    SET assigned_installer_name = get_installer_names_from_ids(assigned_installer_ids)
    WHERE NEW.id = ANY(assigned_installer_ids);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles table
DROP TRIGGER IF EXISTS trigger_sync_installer_names_on_profile_update ON profiles;
CREATE TRIGGER trigger_sync_installer_names_on_profile_update
  AFTER UPDATE OF full_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_installer_names_on_profile_update();

-- Backfill all existing properties with correct installer names
UPDATE properties
SET assigned_installer_name = get_installer_names_from_ids(assigned_installer_ids);

COMMENT ON FUNCTION get_installer_names_from_ids IS 'Converts array of installer IDs to comma-separated list of installer names';
COMMENT ON FUNCTION sync_installer_names_on_property IS 'Automatically syncs installer names when property assignments change';
COMMENT ON FUNCTION sync_installer_names_on_profile_update IS 'Automatically syncs installer names when a profile name changes';
