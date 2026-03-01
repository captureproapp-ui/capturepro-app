/*
  # Create Robin Star Account

  1. Creates auth user for robin@etc.team
  2. Creates profile linked to the organisation in pending invitation state
  3. Sets Robin as the owner of the organisation

  Security:
  - Uses auth.users table for authentication
  - Links profile to existing organisation (b7d40a37-9763-43ad-b874-1ed87bb0ba24)
  - Sets appropriate role (owner)
  - Sets invitation_status to 'pending' so Robin can choose measures during onboarding
  - Sets invitation expiration to 7 days from now

  Note:
  - No measures are pre-assigned; Robin will choose them during the onboarding flow
*/

DO $$
DECLARE
  new_user_id uuid;
  org_id uuid := 'b7d40a37-9763-43ad-b874-1ed87bb0ba24';
BEGIN
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Insert into auth.users table
  -- Note: This creates the user with email_confirmed_at set to bypass email confirmation
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'robin@etc.team',
    crypt('temporary_password_' || gen_random_uuid()::text, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Robin Star"}',
    'authenticated',
    'authenticated'
  );
  
  -- Create profile for Robin
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    organisation_id,
    is_active,
    invitation_status,
    invited_at,
    invitation_expires_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'robin@etc.team',
    'Robin Star',
    'owner',
    org_id,
    false,
    'pending',
    now(),
    now() + interval '7 days',
    now(),
    now()
  );
  
  -- Update organisation to set Robin as owner
  UPDATE organisations
  SET owner_user_id = new_user_id
  WHERE id = org_id;

  RAISE NOTICE 'Successfully created user % for Robin Star', new_user_id;
END $$;
