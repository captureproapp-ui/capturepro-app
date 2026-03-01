/*
  # Create Archived Users Table

  1. New Tables
    - `archived_users`
      - `id` (uuid, primary key)
      - `original_user_id` (uuid) - Reference to the original profiles.id
      - `user_data` (jsonb) - Complete snapshot of user profile data
      - `organisation_id` (uuid) - Organisation the user belonged to
      - `archived_at` (timestamptz) - When the user was archived
      - `archived_by` (uuid) - Super admin who performed the archive
      - `archived_reason` (text) - Why the user was archived
      - `auto_delete_at` (timestamptz) - When to automatically delete (30 days from archive)
      - `can_be_restored` (boolean) - Whether restoration is still possible
      
  2. Security
    - Enable RLS on `archived_users` table
    - Super admins can view all archived users
    - Super admins can restore archived users
    
  3. Notes
    - Archived users immediately lose access via auth account disable
    - Archived users do NOT count toward seat limits
    - 30-day retention before auto-deletion option
*/

-- Create archived_users table
CREATE TABLE IF NOT EXISTS archived_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id uuid NOT NULL,
  user_data jsonb NOT NULL,
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  archived_at timestamptz DEFAULT now(),
  archived_by uuid REFERENCES profiles(id),
  archived_reason text,
  auto_delete_at timestamptz DEFAULT (now() + interval '30 days'),
  can_be_restored boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE archived_users ENABLE ROW LEVEL SECURITY;

-- Super admins can view all archived users
CREATE POLICY "Super admins can view all archived users"
  ON archived_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.super_admin = true
    )
  );

-- Super admins can insert archived users
CREATE POLICY "Super admins can archive users"
  ON archived_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.super_admin = true
    )
  );

-- Super admins can update archived users (for restoration flag)
CREATE POLICY "Super admins can update archived users"
  ON archived_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.super_admin = true
    )
  );

-- Super admins can delete archived users
CREATE POLICY "Super admins can delete archived users"
  ON archived_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.super_admin = true
    )
  );

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_archived_users_organisation 
  ON archived_users(organisation_id);

-- Create index for auto-deletion queries
CREATE INDEX IF NOT EXISTS idx_archived_users_auto_delete 
  ON archived_users(auto_delete_at) 
  WHERE can_be_restored = true;

COMMENT ON TABLE archived_users IS 'Stores archived user profiles with 30-day retention. Archived users lose access immediately and do not count toward seat limits.';