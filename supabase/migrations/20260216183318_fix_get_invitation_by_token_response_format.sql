/*
  # Fix get_invitation_by_token Response Format
  
  1. Purpose
    - Update RPC function to return camelCase keys matching edge function format
    - Remove is_valid wrapper and use error field directly
    
  2. Changes
    - Change full_name -> fullName
    - Change organisation_name -> organisationName
    - Change expires_at -> expiresAt
    - Remove is_valid wrapper
    - Return error as top-level field instead of nested
    
  3. Response Format
    - Success: { email, fullName, organisationName, expiresAt }
    - Error: { error: 'message' }
*/

CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_org_name text;
BEGIN
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.organisation_id,
    p.invitation_status,
    p.invitation_expires_at,
    p.invitation_link_used
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_token;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Invalid or expired invitation'
    );
  END IF;

  IF v_profile.invitation_status = 'accepted' THEN
    RETURN jsonb_build_object(
      'error', 'This invitation has already been accepted'
    );
  END IF;

  IF v_profile.invitation_link_used = true THEN
    RETURN jsonb_build_object(
      'error', 'This invitation link has already been used'
    );
  END IF;

  IF v_profile.invitation_expires_at IS NOT NULL AND v_profile.invitation_expires_at < now() THEN
    RETURN jsonb_build_object(
      'error', 'This invitation link has expired. Please contact your administrator for a new invitation.'
    );
  END IF;

  v_org_name := 'your organisation';
  IF v_profile.organisation_id IS NOT NULL THEN
    SELECT name INTO v_org_name
    FROM organisations
    WHERE id = v_profile.organisation_id;
  END IF;

  RETURN jsonb_build_object(
    'email', v_profile.email,
    'fullName', v_profile.full_name,
    'organisationName', COALESCE(v_org_name, 'your organisation'),
    'expiresAt', v_profile.invitation_expires_at
  );
END;
$$;