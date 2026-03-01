/*
  # Fix Profiles RLS Circular Dependency

  1. Problem
    - The current SELECT policy on profiles has a circular dependency
    - It tries to SELECT from profiles to check if user can SELECT from profiles
    - This causes the profile fetch to fail during login

  2. Solution
    - Create a security definer function to check profile access
    - This function bypasses RLS and can safely query profiles
    - Update the SELECT policy to use this function

  3. Changes
    - Drop existing SELECT policy
    - Create `can_view_profile()` security definer function
    - Create new simplified SELECT policy using the function
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view accessible profiles" ON profiles;

-- Create a security definer function to check profile access
-- This bypasses RLS to avoid circular dependency
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_id uuid, profile_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_user_org_id uuid;
  is_super_admin boolean;
BEGIN
  current_user_id := auth.uid();
  
  -- Can always view own profile
  IF current_user_id = profile_id THEN
    RETURN true;
  END IF;
  
  -- Get current user's org and super_admin status
  SELECT organisation_id, super_admin
  INTO current_user_org_id, is_super_admin
  FROM profiles
  WHERE id = current_user_id;
  
  -- Super admins can view all profiles
  IF is_super_admin = true THEN
    RETURN true;
  END IF;
  
  -- Users can view profiles in same organisation
  IF profile_org_id IS NOT NULL 
     AND current_user_org_id IS NOT NULL 
     AND profile_org_id = current_user_org_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create new SELECT policy using the security definer function
CREATE POLICY "Users can view accessible profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (can_view_profile(id, organisation_id));
