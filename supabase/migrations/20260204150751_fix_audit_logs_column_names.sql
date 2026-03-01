/*
  # Fix Audit Logs Column Names

  1. Schema Changes
    - Rename `performed_by` to `admin_user_id` to match trigger function and component
    - Rename `old_value` to `old_values` (plural) to match trigger function and component
    - Rename `new_value` to `new_values` (plural) to match trigger function and component
    - Update foreign key constraint names for proper relationships
    
  2. Security
    - Update RLS policies to reference the new column names
    - Maintain existing security restrictions (admins only)
    
  3. Notes
    - The trigger function `log_profile_update()` already uses the correct column names
    - The AuditLogViewer component expects these column names
    - This migration aligns the actual table structure with the code expectations
*/

-- Drop existing policies that reference old column names
DROP POLICY IF EXISTS "Admins can view audit logs in their organisation" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs for their organisation" ON audit_logs;

-- Rename columns to match the trigger function and component expectations
ALTER TABLE audit_logs 
  RENAME COLUMN performed_by TO admin_user_id;

ALTER TABLE audit_logs 
  RENAME COLUMN old_value TO old_values;

ALTER TABLE audit_logs 
  RENAME COLUMN new_value TO new_values;

-- The foreign key constraint will be automatically renamed, but let's ensure it exists with the right name
-- First drop the old constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'audit_logs_performed_by_fkey' 
    AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_performed_by_fkey;
  END IF;
END $$;

-- Add the constraint with the correct name
ALTER TABLE audit_logs 
  ADD CONSTRAINT audit_logs_admin_user_id_fkey 
  FOREIGN KEY (admin_user_id) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

-- Recreate RLS policies with the new column name
CREATE POLICY "Admins can view audit logs for their organisation"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organisation_id = audit_logs.organisation_id
        AND profiles.role IN ('admin', 'owner')
    )
  );

-- Keep the system insert policy as is (it uses WITH CHECK true which doesn't reference columns)
-- Just ensure it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    AND policyname = 'System can insert audit logs'
  ) THEN
    CREATE POLICY "System can insert audit logs"
      ON audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
