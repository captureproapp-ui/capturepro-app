/*
  # Fix Infinite Recursion in Profiles RLS Policies

  ## Problem
  The existing RLS policies for the profiles table create infinite recursion because they
  query the profiles table while checking permissions on the profiles table.

  ## Solution
  Reorder and simplify policies to ensure the "own profile" policy is checked first and
  doesn't reference the profiles table in its subqueries.

  ## Changes
  1. Drop existing problematic policies
  2. Recreate policies in correct order with proper logic
  3. Ensure "view own profile" is simple and doesn't cause recursion
*/

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view profiles in their organisation" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles in their organisation" ON profiles;

-- Recreate policies in correct order

-- 1. Most important: Users must be able to see their own profile (no subquery needed)
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 2. Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Users can view other profiles in same organisation
-- This policy will only apply AFTER the user's own profile is accessible
CREATE POLICY "Users can view profiles in same organisation"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- 4. Owners can view all profiles
CREATE POLICY "Owners can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- 5. Admins can create profiles in their organisation
CREATE POLICY "Admins can create profiles in their organisation"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
