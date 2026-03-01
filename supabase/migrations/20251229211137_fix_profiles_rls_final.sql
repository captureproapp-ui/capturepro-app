/*
  # Fix Profiles RLS - Final Solution

  ## Problem
  RLS policies that query the same table they're protecting cause infinite recursion.
  
  ## Solution
  Create a security definer function in public schema that bypasses RLS to get 
  the user's organisation_id and role, then use these in policies.

  ## Changes
  1. Create helper functions to get user's organisation and role (bypasses RLS)
  2. Simplify policies to avoid recursion
*/

-- Create security definer functions to get current user's data (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_organisation_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organisation_id FROM profiles WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid() LIMIT 1
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same organisation" ON profiles;
DROP POLICY IF EXISTS "Owners can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles in their organisation" ON profiles;

-- Recreate simplified policies

-- 1. Users can always view their own profile (most important - checked first)
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 2. Users can view other profiles in same organisation
CREATE POLICY "Users can view same org profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (organisation_id = get_user_organisation_id());

-- 3. Users can update their own profile  
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 4. Admins and owners can insert new profiles in their organisation
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('owner', 'admin')
    AND organisation_id = get_user_organisation_id()
  );
