/*
  # Migrate Owner Role to Admin Role

  1. Changes
    - Update all profiles with role='owner' to role='admin'
    - This ensures consistency across the system where admin is the primary organizational admin role
    - No data loss occurs - this is purely a role label migration
  
  2. Context
    - New users registering through Stripe checkout now receive 'admin' role
    - Existing 'owner' users need to be migrated to maintain consistency
    - Both roles have identical permissions in the system
  
  3. Security
    - No RLS policy changes needed in this migration
    - All existing policies that check for 'owner' OR 'admin' will continue to work
    - Next migration will clean up RLS policies to only reference 'admin'
*/

-- Migrate all owner roles to admin
UPDATE profiles 
SET role = 'admin' 
WHERE role = 'owner';
