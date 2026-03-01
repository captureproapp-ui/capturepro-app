/*
  # Admin Profile Updates and Audit System

  1. New RLS Policies
    - Allow admins to update specific profile fields for users in their organisation
    - Restrict updates to: is_active, role, deactivated_at, deactivated_by
    - Prevent modification of: id, organisation_id, email, auth_user_id

  2. Audit Logging System
    - `audit_logs` table for tracking admin actions
    - Columns: id, organisation_id, admin_user_id, target_user_id, action_type, old_values, new_values, created_at
    - Automatic trigger to log profile updates
    - RLS policies for viewing logs

  3. Field Validation
    - Trigger to validate which fields can be updated by admins
    - Ensure proper data integrity

  4. Security
    - Enable RLS on audit_logs table
    - Add policies for admins to view logs in their organisation
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE NOT NULL,
  admin_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS audit_logs_organisation_id_idx ON audit_logs(organisation_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_target_user_id_idx ON audit_logs(target_user_id);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view audit logs in their organisation
CREATE POLICY "Admins can view audit logs in their organisation"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
    AND get_user_role() = 'admin'
  );

-- Create function to validate admin profile updates
CREATE OR REPLACE FUNCTION validate_admin_profile_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  admin_org_id uuid;
  admin_role text;
BEGIN
  -- Get the admin's organisation and role
  SELECT get_user_organisation_id(), get_user_role()
  INTO admin_org_id, admin_role;

  -- Only admins can use this update path
  IF admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update other user profiles';
  END IF;

  -- Ensure admin is in the same organisation as the target user
  IF admin_org_id != OLD.organisation_id THEN
    RAISE EXCEPTION 'Cannot update users in other organisations';
  END IF;

  -- Prevent modification of protected fields
  IF NEW.id != OLD.id THEN
    RAISE EXCEPTION 'Cannot modify user id';
  END IF;

  IF NEW.organisation_id != OLD.organisation_id THEN
    RAISE EXCEPTION 'Cannot modify organisation_id';
  END IF;

  IF NEW.email != OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email through this endpoint';
  END IF;

  IF NEW.auth_user_id != OLD.auth_user_id THEN
    RAISE EXCEPTION 'Cannot modify auth_user_id';
  END IF;

  -- Set deactivated_by when deactivating a user
  IF NEW.is_active = false AND OLD.is_active = true THEN
    NEW.deactivated_at = now();
    NEW.deactivated_by = auth.uid();
  END IF;

  -- Clear deactivated fields when reactivating
  IF NEW.is_active = true AND OLD.is_active = false THEN
    NEW.deactivated_at = NULL;
    NEW.deactivated_by = NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for profile update validation
DROP TRIGGER IF EXISTS validate_admin_profile_update_trigger ON profiles;
CREATE TRIGGER validate_admin_profile_update_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    auth.uid() IS NOT NULL
    AND OLD.id != auth.uid()
  )
  EXECUTE FUNCTION validate_admin_profile_update();

-- Create function to log profile updates to audit_logs
CREATE OR REPLACE FUNCTION log_profile_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  action_type text;
  admin_org_id uuid;
BEGIN
  -- Only log updates made by admins to other users
  IF auth.uid() IS NULL OR OLD.id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Get admin's organisation
  admin_org_id := get_user_organisation_id();

  -- Determine action type
  IF NEW.is_active != OLD.is_active THEN
    IF NEW.is_active = false THEN
      action_type := 'user_deactivated';
    ELSE
      action_type := 'user_reactivated';
    END IF;
  ELSIF NEW.role != OLD.role THEN
    action_type := 'role_changed';
  ELSE
    action_type := 'profile_updated';
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    organisation_id,
    admin_user_id,
    target_user_id,
    action_type,
    old_values,
    new_values
  ) VALUES (
    admin_org_id,
    auth.uid(),
    NEW.id,
    action_type,
    jsonb_build_object(
      'is_active', OLD.is_active,
      'role', OLD.role,
      'deactivated_at', OLD.deactivated_at
    ),
    jsonb_build_object(
      'is_active', NEW.is_active,
      'role', NEW.role,
      'deactivated_at', NEW.deactivated_at
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS log_profile_update_trigger ON profiles;
CREATE TRIGGER log_profile_update_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_update();

-- Add RLS policy for admins to update profiles
CREATE POLICY "Admins can update profiles in their organisation"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id = get_user_organisation_id()
    AND get_user_role() = 'admin'
  )
  WITH CHECK (
    organisation_id = get_user_organisation_id()
    AND get_user_role() = 'admin'
  );
