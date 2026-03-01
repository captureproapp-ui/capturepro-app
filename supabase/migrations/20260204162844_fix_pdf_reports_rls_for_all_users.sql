/*
  # Fix PDF Reports RLS Policies for All Organization Users

  ## Problem
  The current RLS policy on `pdf_reports` only allows admins and owners to view reports.
  This prevents installers and other users from viewing reports, including archived property reports.

  ## Changes
  1. Drop the existing restrictive SELECT policy
  2. Add new policy allowing all organization members to view their organization's reports
  3. This enables the "View Online" button to work for all users including installers

  ## Security
  - Users can only view reports from their own organization
  - Users must be authenticated
  - The policy checks organization_id to ensure data isolation
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins and owners can view organisation reports" ON pdf_reports;

-- Create new policy allowing all organization members to view reports
CREATE POLICY "Users can view reports from their organisation"
  ON pdf_reports
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );
