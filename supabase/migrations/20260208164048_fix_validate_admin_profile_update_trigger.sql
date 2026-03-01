/*
  # Fix validate_admin_profile_update() Trigger Function

  ## Problem
  The trigger function was checking for a non-existent field `auth_user_id` in the profiles table,
  causing errors when admins try to disable users.

  ## Solution
  Remove the invalid check for `auth_user_id` field since:
  - The `profiles.id` field already serves as the auth user identifier
  - It's linked to `auth.users.id` via a foreign key
  - The `id` field is already protected by existing validation checks

  ## Changes
  - Update `validate_admin_profile_update()` function to remove lines checking auth_user_id
  - Keep all other validation checks intact (id, organisation_id, email)
  - Maintain deactivation logic for setting deactivated_at and deactivated_by fields
*/

-- Update the validation function to remove the invalid auth_user_id check
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