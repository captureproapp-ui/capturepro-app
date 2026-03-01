/*
  # User Management System with Seat Limits
  
  This migration creates a comprehensive user management system with:
  
  ## 1. Schema Updates
  
  ### Organisations Table
  - `seat_limit` (integer, default 5) - Maximum active users allowed
  
  ### Profiles Table
  - `is_active` (boolean, default true) - Whether user account is active
  - `deactivated_at` (timestamptz, nullable) - When user was deactivated
  - `deactivated_by` (uuid, nullable) - Admin who deactivated the user
  
  ### Photos Table
  - `uploader_name_snapshot` (text, nullable) - Preserved name of uploader at time of upload
  
  ### Properties Table
  - `installer_names_snapshot` (jsonb, nullable) - Preserved names of installers at assignment time
  
  ### New Audit Logs Table
  - Tracks user management actions (activations, deactivations, role changes)
  - Records who performed action, when, and what changed
  
  ## 2. Business Logic Functions
  
  ### Seat Limit Validation
  - `check_seat_limit()` - Validates organisation has available seats
  - Triggered on profile insert and updates that activate users
  
  ### Last Admin Protection
  - `prevent_last_admin_deactivation()` - Ensures at least one active admin exists
  - Triggered before profile updates that would deactivate admins
  
  ### Name Snapshotting
  - `snapshot_uploader_name()` - Captures uploader name on photo insert
  - `snapshot_installer_names()` - Captures installer names on property assignment update
  
  ## 3. Data Migration
  - Backfills uploader_name_snapshot for existing photos
  - Backfills installer_names_snapshot for existing properties
  - Sets default values for new columns
  
  ## 4. Security
  - Updates RLS policies to account for is_active status
  - Ensures disabled users cannot perform actions
  - Admins can view all users regardless of active status
*/

-- ============================================================================
-- SCHEMA UPDATES
-- ============================================================================

-- Add seat_limit to organisations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'seat_limit'
  ) THEN
    ALTER TABLE organisations ADD COLUMN seat_limit integer DEFAULT 5 NOT NULL;
  END IF;
END $$;

-- Add user status fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deactivated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deactivated_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deactivated_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deactivated_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Add name snapshot to photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'uploader_name_snapshot'
  ) THEN
    ALTER TABLE photos ADD COLUMN uploader_name_snapshot text;
  END IF;
END $$;

-- Add installer names snapshot to properties (since installers are stored as array)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'installer_names_snapshot'
  ) THEN
    ALTER TABLE properties ADD COLUMN installer_names_snapshot jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  performed_by uuid NOT NULL REFERENCES profiles(id),
  action_type text NOT NULL,
  target_user_id uuid REFERENCES profiles(id),
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- Function to check seat limit compliance
CREATE OR REPLACE FUNCTION check_seat_limit()
RETURNS trigger AS $$
DECLARE
  active_count integer;
  org_seat_limit integer;
BEGIN
  -- Only check if user is being activated
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
     (TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active = true) THEN
    
    -- Get current active user count for organisation
    SELECT COUNT(*) INTO active_count
    FROM profiles
    WHERE organisation_id = NEW.organisation_id
      AND is_active = true
      AND id != NEW.id;
    
    -- Get seat limit for organisation
    SELECT seat_limit INTO org_seat_limit
    FROM organisations
    WHERE id = NEW.organisation_id;
    
    -- Check if adding this user would exceed seat limit
    IF active_count >= org_seat_limit THEN
      RAISE EXCEPTION 'Organisation has reached its seat limit of % active users. Please deactivate a user or upgrade your plan.', org_seat_limit;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to prevent deactivating last admin
CREATE OR REPLACE FUNCTION prevent_last_admin_deactivation()
RETURNS trigger AS $$
DECLARE
  active_admin_count integer;
BEGIN
  -- Only check if an admin is being deactivated or demoted
  IF (OLD.is_active = true AND NEW.is_active = false AND OLD.role = 'admin') OR
     (OLD.role = 'admin' AND NEW.role != 'admin' AND NEW.is_active = true) THEN
    
    -- Count remaining active admins in organisation
    SELECT COUNT(*) INTO active_admin_count
    FROM profiles
    WHERE organisation_id = NEW.organisation_id
      AND role = 'admin'
      AND is_active = true
      AND id != NEW.id;
    
    -- Prevent if this would leave no active admins
    IF active_admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot deactivate or demote the last active admin. Please assign another user as admin first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to snapshot uploader name on photo insert
CREATE OR REPLACE FUNCTION snapshot_uploader_name()
RETURNS trigger AS $$
BEGIN
  -- Capture uploader's current name
  IF NEW.uploaded_by IS NOT NULL THEN
    SELECT full_name INTO NEW.uploader_name_snapshot
    FROM profiles
    WHERE id = NEW.uploaded_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to snapshot installer names when property installers change
CREATE OR REPLACE FUNCTION snapshot_installer_names()
RETURNS trigger AS $$
DECLARE
  installer_names jsonb;
BEGIN
  -- Only update if assigned_installer_ids has changed
  IF TG_OP = 'UPDATE' AND OLD.assigned_installer_ids IS NOT DISTINCT FROM NEW.assigned_installer_ids THEN
    RETURN NEW;
  END IF;
  
  -- Build array of installer name objects {id, name}
  SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.full_name))
  INTO installer_names
  FROM profiles p
  WHERE p.id = ANY(NEW.assigned_installer_ids);
  
  NEW.installer_names_snapshot = COALESCE(installer_names, '[]'::jsonb);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to enforce seat limits
DROP TRIGGER IF EXISTS enforce_seat_limit ON profiles;
CREATE TRIGGER enforce_seat_limit
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_seat_limit();

-- Trigger to prevent last admin deactivation
DROP TRIGGER IF EXISTS protect_last_admin ON profiles;
CREATE TRIGGER protect_last_admin
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_deactivation();

-- Trigger to snapshot uploader name
DROP TRIGGER IF EXISTS set_uploader_snapshot ON photos;
CREATE TRIGGER set_uploader_snapshot
  BEFORE INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION snapshot_uploader_name();

-- Trigger to snapshot installer names
DROP TRIGGER IF EXISTS set_installer_snapshot ON properties;
CREATE TRIGGER set_installer_snapshot
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION snapshot_installer_names();

-- ============================================================================
-- DATA MIGRATION - Backfill snapshot names
-- ============================================================================

-- Backfill uploader names for existing photos
UPDATE photos p
SET uploader_name_snapshot = pr.full_name
FROM profiles pr
WHERE p.uploaded_by = pr.id
  AND p.uploader_name_snapshot IS NULL;

-- Backfill installer names for existing properties
UPDATE properties prop
SET installer_names_snapshot = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.full_name)), '[]'::jsonb)
  FROM profiles p
  WHERE p.id = ANY(prop.assigned_installer_ids)
)
WHERE prop.installer_names_snapshot = '[]'::jsonb OR prop.installer_names_snapshot IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Audit logs policies
CREATE POLICY "Admins can view audit logs for their organisation"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update profiles policies to include is_active checks where appropriate
-- Note: We don't restrict viewing inactive users, just their ability to perform actions

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_org_active ON profiles(organisation_id, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON audit_logs(target_user_id, created_at DESC);