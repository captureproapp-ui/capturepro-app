/*
  # Create Archived Organisations Table

  1. New Tables
    - `archived_organisations`
      - `id` (uuid, primary key)
      - `original_organisation_id` (uuid) - Reference to the original organisations.id
      - `organisation_data` (jsonb) - Complete snapshot of organisation and related data
      - `archived_at` (timestamptz) - When the organisation was archived
      - `archived_by` (uuid) - Super admin who performed the archive
      - `archived_reason` (text) - Why the organisation was archived
      - `auto_delete_at` (timestamptz) - When manual deletion option appears (90 days)
      - `stripe_subscription_status` (text) - Status of Stripe subscription (paused/cancelled)
      - `can_be_restored` (boolean) - Whether restoration is still possible
      - `user_count` (integer) - Number of users in the organisation
      - `property_count` (integer) - Number of properties
      - `total_storage_bytes` (bigint) - Total storage used
      
  2. Security
    - Enable RLS on `archived_organisations` table
    - Super admins can view all archived organisations
    - Super admins can restore archived organisations
    
  3. Notes
    - Archived organisations have Stripe subscription paused
    - 90-day retention before manual deletion option appears
    - Complete data snapshot for restoration
*/

-- Create archived_organisations table
CREATE TABLE IF NOT EXISTS archived_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_organisation_id uuid NOT NULL,
  organisation_data jsonb NOT NULL,
  archived_at timestamptz DEFAULT now(),
  archived_by uuid REFERENCES profiles(id),
  archived_reason text,
  auto_delete_at timestamptz DEFAULT (now() + interval '90 days'),
  stripe_subscription_status text DEFAULT 'paused',
  can_be_restored boolean DEFAULT true,
  user_count integer DEFAULT 0,
  property_count integer DEFAULT 0,
  total_storage_bytes bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE archived_organisations ENABLE ROW LEVEL SECURITY;

-- Super admins can view all archived organisations
CREATE POLICY "Super admins can view all archived organisations"
  ON archived_organisations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.super_admin = true
    )
  );

-- Super admins can insert archived organisations
CREATE POLICY "Super admins can archive organisations"
  ON archived_organisations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.super_admin = true
    )
  );

-- Super admins can update archived organisations
CREATE POLICY "Super admins can update archived organisations"
  ON archived_organisations
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

-- Super admins can delete archived organisations
CREATE POLICY "Super admins can delete archived organisations"
  ON archived_organisations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.super_admin = true
    )
  );

-- Create index for auto-deletion queries
CREATE INDEX IF NOT EXISTS idx_archived_organisations_auto_delete 
  ON archived_organisations(auto_delete_at) 
  WHERE can_be_restored = true;

-- Create index for Stripe subscription status
CREATE INDEX IF NOT EXISTS idx_archived_organisations_stripe_status 
  ON archived_organisations(stripe_subscription_status);

COMMENT ON TABLE archived_organisations IS 'Stores archived organisations with 90-day retention. Stripe subscriptions are paused, and complete data snapshots are stored for restoration.';