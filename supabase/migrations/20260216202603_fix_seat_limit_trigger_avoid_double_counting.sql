/*
  # Fix seat limit trigger to avoid double-counting

  1. Changes
    - Update `validate_seat_limit_before_insert` function
    - Previously counted `is_active = true OR invitation_status = 'pending'` separately
    - Now that pending invited users have `is_active = true`, just count `is_active = true`
    - This prevents double-counting pending users who are now active

  2. Important Notes
    - The invite-user edge function now creates users with is_active = true
    - The acceptance trigger keeps is_active = true (harmless no-op)
    - Seat counting is now simplified to just active users
*/

CREATE OR REPLACE FUNCTION validate_seat_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  org_seat_limit INTEGER;
  current_seat_usage INTEGER;
BEGIN
  IF NEW.invitation_status = 'pending' AND NEW.organisation_id IS NOT NULL THEN
    SELECT seat_limit INTO org_seat_limit
    FROM organisations
    WHERE id = NEW.organisation_id;

    SELECT COUNT(*) INTO current_seat_usage
    FROM profiles
    WHERE organisation_id = NEW.organisation_id
    AND is_active = true
    AND id != NEW.id;

    IF current_seat_usage >= org_seat_limit THEN
      RAISE EXCEPTION 'Seat limit reached. Your plan allows % seats and you have % active users',
        org_seat_limit, current_seat_usage;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
