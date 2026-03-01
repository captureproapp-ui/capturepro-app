/*
  # Handle Invitation Acceptance

  1. Purpose
    - Automatically mark users as active and invitation as accepted when they confirm their email
    - This happens when a user clicks the invitation link and sets their password
    
  2. Changes
    - Create trigger function to handle invitation acceptance
    - Create trigger on auth.users table to detect email confirmation
    - Update profiles table when user confirms email
    
  3. Security
    - Function runs with SECURITY DEFINER to update profiles as system
    - Only updates users with pending invitations
*/

-- Create function to handle invitation acceptance
CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if email was just confirmed (changed from NULL to a timestamp)
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Update the profile to mark invitation as accepted and activate user
    UPDATE profiles
    SET 
      is_active = true,
      invitation_status = 'accepted',
      invitation_accepted_at = NEW.email_confirmed_at,
      updated_at = now()
    WHERE 
      id = NEW.id 
      AND invitation_status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION handle_invitation_acceptance();