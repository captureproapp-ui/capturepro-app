/*
  # Fix Profiles RLS Policy to Use Helper Function

  This migration fixes the login issue by updating the profiles RLS policy
  to use the existing `get_user_organisation_id()` helper function instead
  of a recursive subquery.

  ## Problem

  The current RLS policy for profiles has this condition:
  ```
  organisation_id = (
    SELECT organisation_id FROM profiles WHERE id = auth.uid() LIMIT 1
  )
  ```

  This creates a circular dependency:
  - User tries to fetch their profile after login
  - RLS policy checks if they can access profiles in their org
  - To check org, it queries profiles table again
  - This triggers the same RLS policy again → infinite recursion
  - Result: Login fails because profile cannot be fetched

  ## Solution

  Replace the recursive subquery with the existing `get_user_organisation_id()`
  helper function. This function is marked as SECURITY DEFINER so it can
  query the profiles table without triggering RLS, breaking the circular dependency.

  ## Changes

  1. Drop the problematic policy
  2. Recreate it using `get_user_organisation_id()` instead of the subquery
  3. This maintains the same access control while fixing the recursion issue
*/

-- ============================================================================
-- FIX PROFILES RLS POLICY
-- ============================================================================

-- Drop the problematic policy with circular dependency
DROP POLICY IF EXISTS "Users can view profiles in their organisation" ON profiles;

-- Recreate the policy using the helper function to avoid circular dependency
CREATE POLICY "Users can view profiles in their organisation"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own profile
    id = auth.uid()
    OR
    -- User can see profiles in their org (using helper function to avoid recursion)
    organisation_id = get_user_organisation_id()
  );

COMMENT ON POLICY "Users can view profiles in their organisation" ON profiles IS 
  'Allows users to view their own profile and profiles of other users in the same organisation. Uses get_user_organisation_id() helper function to avoid circular dependency that was preventing login.';