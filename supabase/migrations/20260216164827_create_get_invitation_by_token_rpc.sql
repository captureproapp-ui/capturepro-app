/*
  # Create get_invitation_by_token RPC Function
  
  1. Purpose
    - Compatibility shim for deployed frontend code that calls this RPC
    - Allows invitation acceptance flow to work while awaiting redeployment
    
  2. New Functions
    - `get_invitation_by_token(p_token uuid)` - Returns invitation details for validation
      - Returns: email, full_name, organisation_name, expires_at, is_valid, error_message
      - Validates: invitation status, expiry, and one-time link usage
      
  3. Security
    - Function is accessible without authentication (invite links are for unauthenticated users)
    - Uses SECURITY DEFINER to query profiles with elevated privileges
    - Only returns minimal necessary information
    
  4. Notes
    - This is a temporary compatibility function
    - Can be removed once frontend is redeployed with edge function calls
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
  v_result jsonb;
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
      'is_valid', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

  IF v_profile.invitation_status = 'accepted' THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'This invitation has already been accepted'
    );
  END IF;

  IF v_profile.invitation_link_used = true THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'This invitation link has already been used'
    );
  END IF;

  IF v_profile.invitation_expires_at IS NOT NULL AND v_profile.invitation_expires_at < now() THEN
    RETURN jsonb_build_object(
      'is_valid', false,
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
    'is_valid', true,
    'email', v_profile.email,
    'full_name', v_profile.full_name,
    'organisation_name', COALESCE(v_org_name, 'your organisation'),
    'expires_at', v_profile.invitation_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_invitation_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(uuid) TO authenticated;
