/*
  # Platform Super Admin Analytics System

  ## Overview
  This migration creates a comprehensive super admin system for platform-wide analytics,
  monitoring, and management across all organisations.

  ## 1. Schema Changes

  ### Profiles Table
  - Add `super_admin` boolean flag (default false) to identify platform administrators

  ### Organisations Table
  - Add `suspended_at` (timestamptz) - When organisation was suspended
  - Add `suspended_by` (uuid) - Super admin who suspended the organisation
  - Add `subscription_started_at` (timestamptz) - When current subscription started
  - Add `subscription_ended_at` (timestamptz) - When subscription ended/cancelled
  - Add `monthly_revenue_cents` (integer) - Monthly recurring revenue in cents
  - Add `stripe_price_id` (text) - Stripe price ID for subscription tracking

  ## 2. Audit Logging
  - Create `super_admin_audit_logs` table to track all super admin actions
  - Includes action type, target organisation, changes made, and timestamps

  ## 3. Security
  - RLS policies allowing super admins to read all organisations
  - RLS policies allowing super admins to read all profiles
  - RPC functions for super admin actions with proper authorization checks
  - Audit logging for all sensitive operations

  ## 4. Performance
  - Indexes on organisations(subscription_status) for analytics queries
  - Indexes on organisations(created_at) for growth metrics
  - Indexes on audit logs for efficient history queries

  ## 5. Analytics Functions
  - Helper functions for calculating platform-wide metrics
  - Aggregation functions for storage, revenue, and user statistics
*/

-- Add super_admin flag to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS super_admin boolean DEFAULT false;

-- Add organisation management fields
ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
ADD COLUMN IF NOT EXISTS subscription_ended_at timestamptz,
ADD COLUMN IF NOT EXISTS monthly_revenue_cents integer DEFAULT 0;

-- Add stripe_price_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE organisations ADD COLUMN stripe_price_id text;
  END IF;
END $$;

-- Create audit logs table for super admin actions
CREATE TABLE IF NOT EXISTS super_admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  performed_by uuid REFERENCES profiles(id) NOT NULL,
  action_type text NOT NULL,
  target_organisation_id uuid REFERENCES organisations(id),
  target_user_id uuid REFERENCES profiles(id),
  changes_made jsonb,
  reason text,
  metadata jsonb
);

-- Enable RLS on audit logs
ALTER TABLE super_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organisations_subscription_status 
  ON organisations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organisations_created_at 
  ON organisations(created_at);
CREATE INDEX IF NOT EXISTS idx_organisations_suspended_at 
  ON organisations(suspended_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
  ON super_admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by 
  ON super_admin_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_org 
  ON super_admin_audit_logs(target_organisation_id);

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND super_admin = true
  );
END;
$$;

-- RLS Policies for Super Admin Access

-- Super admins can read all organisations
CREATE POLICY "Super admins can read all organisations"
  ON organisations FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all profiles
CREATE POLICY "Super admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all audit logs
CREATE POLICY "Super admins can read audit logs"
  ON super_admin_audit_logs FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can insert audit logs
CREATE POLICY "Super admins can insert audit logs"
  ON super_admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin() AND performed_by = auth.uid());

-- RPC Function: Adjust Organisation Seats
CREATE OR REPLACE FUNCTION adjust_organisation_seats(
  org_id uuid,
  new_seat_limit integer,
  reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_seat_limit integer;
  org_name text;
  result json;
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Super admin access required';
  END IF;

  -- Get current seat limit and org name
  SELECT seat_limit, name INTO old_seat_limit, org_name
  FROM organisations
  WHERE id = org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  -- Update seat limit
  UPDATE organisations
  SET seat_limit = new_seat_limit
  WHERE id = org_id;

  -- Log the action
  INSERT INTO super_admin_audit_logs (
    performed_by,
    action_type,
    target_organisation_id,
    changes_made,
    reason
  ) VALUES (
    auth.uid(),
    'adjust_seats',
    org_id,
    jsonb_build_object(
      'old_seat_limit', old_seat_limit,
      'new_seat_limit', new_seat_limit,
      'organisation_name', org_name
    ),
    reason
  );

  result := json_build_object(
    'success', true,
    'organisation_id', org_id,
    'old_seat_limit', old_seat_limit,
    'new_seat_limit', new_seat_limit
  );

  RETURN result;
END;
$$;

-- RPC Function: Suspend Organisation
CREATE OR REPLACE FUNCTION suspend_organisation(
  org_id uuid,
  reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_name text;
  org_suspended_at timestamptz;
  result json;
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Super admin access required';
  END IF;

  -- Get org details
  SELECT name, suspended_at INTO org_name, org_suspended_at
  FROM organisations
  WHERE id = org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  IF org_suspended_at IS NOT NULL THEN
    RAISE EXCEPTION 'Organisation is already suspended';
  END IF;

  -- Suspend the organisation
  UPDATE organisations
  SET 
    suspended_at = now(),
    suspended_by = auth.uid()
  WHERE id = org_id;

  -- Log the action
  INSERT INTO super_admin_audit_logs (
    performed_by,
    action_type,
    target_organisation_id,
    changes_made,
    reason
  ) VALUES (
    auth.uid(),
    'suspend_organisation',
    org_id,
    jsonb_build_object(
      'organisation_name', org_name,
      'suspended_at', now()
    ),
    reason
  );

  result := json_build_object(
    'success', true,
    'organisation_id', org_id,
    'suspended_at', now()
  );

  RETURN result;
END;
$$;

-- RPC Function: Reactivate Organisation
CREATE OR REPLACE FUNCTION reactivate_organisation(
  org_id uuid,
  reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_name text;
  old_suspended_at timestamptz;
  result json;
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Super admin access required';
  END IF;

  -- Get org details
  SELECT name, suspended_at INTO org_name, old_suspended_at
  FROM organisations
  WHERE id = org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  IF old_suspended_at IS NULL THEN
    RAISE EXCEPTION 'Organisation is not suspended';
  END IF;

  -- Reactivate the organisation
  UPDATE organisations
  SET 
    suspended_at = NULL,
    suspended_by = NULL
  WHERE id = org_id;

  -- Log the action
  INSERT INTO super_admin_audit_logs (
    performed_by,
    action_type,
    target_organisation_id,
    changes_made,
    reason
  ) VALUES (
    auth.uid(),
    'reactivate_organisation',
    org_id,
    jsonb_build_object(
      'organisation_name', org_name,
      'was_suspended_at', old_suspended_at,
      'reactivated_at', now()
    ),
    reason
  );

  result := json_build_object(
    'success', true,
    'organisation_id', org_id,
    'reactivated_at', now()
  );

  RETURN result;
END;
$$;

-- RPC Function: Update Organisation Subscription
CREATE OR REPLACE FUNCTION update_organisation_subscription(
  org_id uuid,
  new_status text,
  new_plan_id text DEFAULT NULL,
  new_mrr_cents integer DEFAULT NULL,
  reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_name text;
  old_status text;
  old_plan_id text;
  old_mrr integer;
  result json;
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Super admin access required';
  END IF;

  -- Get current values
  SELECT name, subscription_status, stripe_price_id, monthly_revenue_cents
  INTO org_name, old_status, old_plan_id, old_mrr
  FROM organisations
  WHERE id = org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  -- Update subscription
  UPDATE organisations
  SET 
    subscription_status = new_status,
    stripe_price_id = COALESCE(new_plan_id, stripe_price_id),
    monthly_revenue_cents = COALESCE(new_mrr_cents, monthly_revenue_cents),
    subscription_started_at = CASE 
      WHEN new_status = 'active' AND old_status != 'active' THEN now()
      ELSE subscription_started_at
    END,
    subscription_ended_at = CASE 
      WHEN new_status IN ('canceled', 'expired') AND old_status = 'active' THEN now()
      ELSE subscription_ended_at
    END
  WHERE id = org_id;

  -- Log the action
  INSERT INTO super_admin_audit_logs (
    performed_by,
    action_type,
    target_organisation_id,
    changes_made,
    reason
  ) VALUES (
    auth.uid(),
    'update_subscription',
    org_id,
    jsonb_build_object(
      'organisation_name', org_name,
      'old_status', old_status,
      'new_status', new_status,
      'old_plan_id', old_plan_id,
      'new_plan_id', new_plan_id,
      'old_mrr_cents', old_mrr,
      'new_mrr_cents', new_mrr_cents
    ),
    reason
  );

  result := json_build_object(
    'success', true,
    'organisation_id', org_id,
    'new_status', new_status
  );

  RETURN result;
END;
$$;

-- Create a view for platform analytics (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS platform_analytics_summary AS
SELECT
  COUNT(DISTINCT o.id) as total_organisations,
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT CASE WHEN o.subscription_status = 'active' THEN o.id END) as active_subscriptions,
  COUNT(DISTINCT CASE WHEN o.suspended_at IS NOT NULL THEN o.id END) as suspended_organisations,
  SUM(CASE WHEN o.subscription_status = 'active' THEN o.monthly_revenue_cents ELSE 0 END) as total_mrr_cents,
  AVG(CASE WHEN o.subscription_status = 'active' THEN o.monthly_revenue_cents END) as avg_mrr_per_org_cents,
  now() as last_updated
FROM organisations o
LEFT JOIN profiles p ON p.organisation_id = o.id;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_analytics_summary_single_row 
  ON platform_analytics_summary ((1));

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_platform_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY platform_analytics_summary;
END;
$$;

-- Set up the first super admin (using the first user created)
DO $$
BEGIN
  -- Set the first profile as super admin
  UPDATE profiles
  SET super_admin = true
  WHERE id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1);
END $$;
