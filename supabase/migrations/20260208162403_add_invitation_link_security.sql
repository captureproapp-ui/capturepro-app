/*
  # Add Invitation Link Security and Expiration

  1. New Columns
    - `profiles.invitation_expires_at` (timestamptz) - When the invitation link expires
    - `profiles.invitation_link_used` (boolean) - Whether the link has been used (one-time use)

  2. Functions
    - `validate_seat_limit_before_insert()` - Validates seat limits before creating new users
    - `mark_expired_invitations()` - Marks invitations as expired when past expiration date

  3. Triggers
    - `check_seat_limit_before_user_creation` - Enforces seat limits on user creation
    - `validate_invitation_before_acceptance` - Prevents acceptance of expired/used invitations

  4. Security
    - Seat limits enforced at database level
    - Active users + pending invitations must not exceed organisation seat_limit
    - Expired invitations don't count toward seat limit
    - One-time use enforcement prevents link reuse

  5. Indexes
    - Index on invitation_expires_at for efficient expiration queries
*/

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS invitation_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS invitation_link_used boolean DEFAULT false;

-- Set default expiration for existing pending invitations (7 days from now)
UPDATE profiles
SET
  invitation_expires_at = now() + interval '7 days',
  invitation_link_used = COALESCE(invitation_link_used, false)
WHERE invitation_status = 'pending'
  AND invitation_expires_at IS NULL;

-- Create index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_expires_at
ON profiles(invitation_expires_at)
WHERE invitation_status = 'pending';

-- Function to validate seat limits before user creation
CREATE OR REPLACE FUNCTION validate_seat_limit_before_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_seat_limit INTEGER;
  current_seat_usage INTEGER;
BEGIN
  -- Only check for new users with pending invitations
  IF NEW.invitation_status = 'pending' AND NEW.organisation_id IS NOT NULL THEN
    -- Get the organisation's seat limit
    SELECT seat_limit INTO org_seat_limit
    FROM organisations
    WHERE id = NEW.organisation_id;

    -- Count active users + pending invitations for this organisation
    SELECT COUNT(*) INTO current_seat_usage
    FROM profiles
    WHERE organisation_id = NEW.organisation_id
      AND (
        is_active = true
        OR invitation_status = 'pending'
      )
      AND id != NEW.id; -- Exclude the current user being inserted

    -- Check if adding this user would exceed the limit
    IF current_seat_usage >= org_seat_limit THEN
      RAISE EXCEPTION 'Seat limit reached. Your plan allows % seats and you have % active/pending users',
        org_seat_limit, current_seat_usage;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce seat limits
DROP TRIGGER IF EXISTS check_seat_limit_before_user_creation ON profiles;
CREATE TRIGGER check_seat_limit_before_user_creation
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_seat_limit_before_insert();

-- Function to mark expired invitations
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS TABLE(expired_count INTEGER)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Update profiles where invitation has expired
  UPDATE profiles
  SET
    invitation_status = 'expired',
    updated_at = now()
  WHERE
    invitation_status = 'pending'
    AND invitation_expires_at IS NOT NULL
    AND invitation_expires_at < now();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Function to validate invitation before acceptance (called by trigger)
CREATE OR REPLACE FUNCTION validate_invitation_before_acceptance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This trigger runs on the auth.users table when email is confirmed
  -- We need to check the corresponding profile
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Check if the invitation has expired or been used
    DECLARE
      profile_record RECORD;
    BEGIN
      SELECT
        invitation_status,
        invitation_expires_at,
        invitation_link_used
      INTO profile_record
      FROM profiles
      WHERE id = NEW.id;

      -- Check if invitation has expired
      IF profile_record.invitation_expires_at IS NOT NULL
         AND profile_record.invitation_expires_at < now() THEN
        RAISE EXCEPTION 'Invitation link has expired';
      END IF;

      -- Check if invitation link has already been used
      IF profile_record.invitation_link_used = true THEN
        RAISE EXCEPTION 'Invitation link has already been used';
      END IF;

      -- Check if invitation has already been accepted
      IF profile_record.invitation_status = 'accepted' THEN
        RAISE EXCEPTION 'This invitation has already been accepted';
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the existing invitation acceptance trigger to include validation
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

-- Create new trigger that validates before accepting
CREATE TRIGGER on_auth_user_email_confirmed
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION validate_invitation_before_acceptance();

-- Recreate the original acceptance handler to run AFTER validation
CREATE OR REPLACE FUNCTION handle_invitation_acceptance_after_validation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This runs after validation, so we know the invitation is valid
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Update the profile to mark invitation as accepted, set link as used, and activate user
    UPDATE profiles
    SET
      is_active = true,
      invitation_status = 'accepted',
      invitation_accepted_at = NEW.email_confirmed_at,
      invitation_link_used = true,
      updated_at = now()
    WHERE
      id = NEW.id
      AND invitation_status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create AFTER trigger for acceptance (runs after BEFORE validation trigger)
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed_acceptance ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed_acceptance
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION handle_invitation_acceptance_after_validation();

-- Add check constraint to ensure pending invitations have expiration dates
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS check_pending_invitations_have_expiration;

ALTER TABLE profiles
ADD CONSTRAINT check_pending_invitations_have_expiration
CHECK (
  invitation_status != 'pending'
  OR invitation_expires_at IS NOT NULL
);