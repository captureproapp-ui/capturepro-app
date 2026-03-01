/*
  # Fix profiles UPDATE RLS policy to include owner role

  1. Security Changes
    - Drop and recreate the "Users can update profiles" policy
    - Previously only allowed `admin` role to update other profiles in same org
    - Now allows both `admin` and `owner` roles
    - This fixes the bug where organisation owners could not reactivate/disable users

  2. Important Notes
    - The INSERT policy already correctly included both owner and admin
    - The UPDATE policy was the only one missing the owner role
*/

DROP POLICY IF EXISTS "Users can update profiles" ON profiles;

CREATE POLICY "Users can update profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (id = get_current_user_id())
    OR (
      (organisation_id = get_user_organisation_id())
      AND (get_user_role() = ANY(ARRAY['admin'::text, 'owner'::text]))
    )
  )
  WITH CHECK (
    (id = get_current_user_id())
    OR (
      (organisation_id = get_user_organisation_id())
      AND (get_user_role() = ANY(ARRAY['admin'::text, 'owner'::text]))
    )
  );
