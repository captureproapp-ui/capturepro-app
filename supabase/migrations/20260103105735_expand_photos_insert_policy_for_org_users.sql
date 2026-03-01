/*
  # Expand Photos INSERT Policy for Organization Users

  ## Summary
  This migration updates the RLS policy on the photos table to allow all authenticated users
  from the same organization to upload photos, not just assigned installers.

  ## Changes Made
  
  1. **Updated RLS Policy: "Assigned installers can upload photos"**
     - Renamed to: "Organization users can upload photos"
     - Allows authenticated users to upload photos if they belong to the same organization as the property
     - Supports admin, owner, and installer roles
     - Maintains security by checking organization membership through the profiles table
  
  ## Security Notes
  - Users can only upload photos for properties within their organization
  - The policy checks organization_id match between the user's profile and the property
  - Authentication is still required (TO authenticated)
  - Property_id is required in the INSERT to validate permissions
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Assigned installers can upload photos" ON photos;

-- Create the new expanded policy for organization members
CREATE POLICY "Organization users can upload photos"
  ON photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM properties p
      INNER JOIN profiles pr ON pr.organisation_id = p.organisation_id
      WHERE p.id = photos.property_id 
      AND pr.id = auth.uid()
      AND pr.role IN ('admin', 'owner', 'installer')
    )
  );
