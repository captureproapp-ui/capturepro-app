/*
  # Add Invitation Tracking to Profiles

  1. Changes
    - Add `invitation_status` column to track invitation state (pending, accepted, expired)
    - Add `invited_at` timestamp to track when invitation was sent
    - Add `invitation_accepted_at` timestamp to track when user accepted invitation
    - Add `invited_by` to track which admin sent the invitation
    - Add index on invitation_status for efficient queries
    
  2. Notes
    - Existing users will have NULL invitation status (they were created before invitation system)
    - New users will have 'pending' status when invited
    - Status changes to 'accepted' when user completes registration
    - Invitations can be marked 'expired' via background job or manual process
*/

-- Add invitation tracking columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'invitation_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN invitation_status text CHECK (invitation_status IN ('pending', 'accepted', 'expired'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'invited_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN invited_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'invitation_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN invitation_accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN invited_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Create index for efficient invitation status queries
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_status ON profiles(invitation_status) WHERE invitation_status IS NOT NULL;

-- Create index for invited_by lookups
CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON profiles(invited_by) WHERE invited_by IS NOT NULL;