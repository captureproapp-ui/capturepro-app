/*
  # Fix Security and Performance Issues

  ## 1. Add Missing Foreign Key Indexes
    - Add index on `organisations.suspended_by`
    - Add index on `super_admin_audit_logs.performed_by`
    - Add index on `super_admin_audit_logs.target_user_id`

  ## 2. Optimize RLS Policies for Performance
    - Fix `profiles` table policy to use `(select auth.uid())`
    - Fix `photos` table policy to use `(select auth.uid())`
    - Fix `super_admin_audit_logs` table policy to use subquery

  ## 3. Fix Multiple Permissive Policies
    - Combine multiple SELECT policies into single policies using OR conditions
    - This prevents unexpected behavior from policy stacking

  ## 4. Set Function Search Paths
    - Set secure search_path for all SECURITY DEFINER functions
    - Prevents search path hijacking attacks

  ## 5. Remove Unused Indexes
    - Drop indexes that have not been used to reduce maintenance overhead
    - Improves write performance and reduces storage

  ## Security Notes
    - Password breach protection must be enabled manually in Supabase Dashboard
    - Go to Authentication > Settings > Enable "Check for compromised passwords"
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_organisations_suspended_by 
  ON organisations(suspended_by);

CREATE INDEX IF NOT EXISTS idx_super_admin_audit_logs_performed_by 
  ON super_admin_audit_logs(performed_by);

CREATE INDEX IF NOT EXISTS idx_super_admin_audit_logs_target_user_id 
  ON super_admin_audit_logs(target_user_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- =====================================================

-- Fix profiles table policy
DROP POLICY IF EXISTS "Users can view profiles in their organisation" ON profiles;

CREATE POLICY "Users can view profiles in their organisation"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- Fix photos table policy
DROP POLICY IF EXISTS "Organization users can upload photos" ON photos;

CREATE POLICY "Organization users can upload photos"
  ON photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM properties p
      JOIN profiles pr ON pr.organisation_id = p.organisation_id
      WHERE p.id = photos.property_id
        AND pr.id = (select auth.uid())
    )
  );

-- Fix super_admin_audit_logs policy
DROP POLICY IF EXISTS "Super admins can insert audit logs" ON super_admin_audit_logs;

CREATE POLICY "Super admins can insert audit logs"
  ON super_admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = (select auth.uid()) 
        AND super_admin = true
    )
  );

-- =====================================================
-- 3. FIX MULTIPLE PERMISSIVE POLICIES
-- =====================================================

-- Combine organisations SELECT policies
DROP POLICY IF EXISTS "Super admins can read all organisations" ON organisations;
DROP POLICY IF EXISTS "Users can view their organisation" ON organisations;

CREATE POLICY "Users can view accessible organisations"
  ON organisations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = (select auth.uid()) 
        AND super_admin = true
    )
    OR
    id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- Combine profiles SELECT policies
DROP POLICY IF EXISTS "Super admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organisation" ON profiles;

CREATE POLICY "Users can view accessible profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = (select auth.uid()) 
        AND p.super_admin = true
    )
    OR
    organisation_id IN (
      SELECT organisation_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- =====================================================
-- 4. SET SECURE SEARCH PATHS FOR FUNCTIONS
-- =====================================================

ALTER FUNCTION is_super_admin() 
  SET search_path = public, pg_temp;

ALTER FUNCTION adjust_organisation_seats(uuid, integer, text) 
  SET search_path = public, pg_temp;

ALTER FUNCTION suspend_organisation(uuid, text) 
  SET search_path = public, pg_temp;

ALTER FUNCTION reactivate_organisation(uuid, text) 
  SET search_path = public, pg_temp;

ALTER FUNCTION update_organisation_subscription(uuid, text, text, integer, text) 
  SET search_path = public, pg_temp;

ALTER FUNCTION refresh_platform_analytics() 
  SET search_path = public, pg_temp;

ALTER FUNCTION get_organisation_storage_usage(uuid) 
  SET search_path = public, pg_temp;

-- =====================================================
-- 5. DROP UNUSED INDEXES
-- =====================================================

-- Drop unused foreign key indexes
DROP INDEX IF EXISTS idx_archived_properties_archived_by;
DROP INDEX IF EXISTS idx_audit_logs_performed_by;
DROP INDEX IF EXISTS idx_checklist_completions_completed_by;
DROP INDEX IF EXISTS idx_checklist_completions_template_id;
DROP INDEX IF EXISTS idx_checklist_templates_created_by;
DROP INDEX IF EXISTS idx_pdf_reports_generated_by;
DROP INDEX IF EXISTS idx_photos_marked_not_available_by;
DROP INDEX IF EXISTS idx_profiles_deactivated_by;
DROP INDEX IF EXISTS idx_properties_created_by;
DROP INDEX IF EXISTS idx_archived_properties_pdf_report_id;
DROP INDEX IF EXISTS idx_audit_logs_organisation_id;
DROP INDEX IF EXISTS idx_audit_logs_target_user_id;
DROP INDEX IF EXISTS idx_checklist_templates_organisation_id;
DROP INDEX IF EXISTS idx_pdf_reports_organisation_id;
DROP INDEX IF EXISTS idx_pdf_reports_property_id;
DROP INDEX IF EXISTS idx_photos_uploaded_by;

-- Drop unused lookup indexes
DROP INDEX IF EXISTS idx_organisations_stripe_customer_id;
DROP INDEX IF EXISTS idx_organisations_stripe_subscription_id;
DROP INDEX IF EXISTS idx_profiles_invitation_status;
DROP INDEX IF EXISTS idx_profiles_invited_by;
DROP INDEX IF EXISTS idx_organisations_subscription_status;

-- Drop unused timestamp indexes
DROP INDEX IF EXISTS idx_organisations_created_at;
DROP INDEX IF EXISTS idx_organisations_suspended_at;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_target_org;
