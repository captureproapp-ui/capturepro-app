/*
  # Fix Remaining Security Issues
  
  This migration addresses the remaining security and performance issues identified
  by the Supabase security audit.
  
  ## Changes
  
  1. **Add Missing Foreign Key Indexes (7 indexes)**
     - archived_properties.pdf_report_id
     - audit_logs.organisation_id
     - audit_logs.target_user_id
     - checklist_templates.organisation_id
     - pdf_reports.organisation_id
     - pdf_reports.property_id
     - photos.uploaded_by
  
  2. **Fix SECURITY DEFINER Views**
     - Recreate property_completion_summary and opening_completion_summary
     - Remove SECURITY DEFINER to respect RLS policies
     - These views should use SECURITY INVOKER (default) to enforce proper access control
  
  3. **Unused Index Notes**
     - The 9 unused indexes from the previous migration are expected to be unused
     - The database is new/empty, so no queries have run yet
     - These indexes will be used as the application scales
     - They are critical for performance and should NOT be removed
  
  ## Security Notes
  
  - SECURITY DEFINER views bypass RLS and can expose all data
  - By converting to SECURITY INVOKER (default), views now respect underlying table RLS
  - This ensures users can only see data they have permission to access
*/

-- ============================================================================
-- SECTION 1: ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index for archived_properties.pdf_report_id
CREATE INDEX IF NOT EXISTS idx_archived_properties_pdf_report_id 
  ON archived_properties(pdf_report_id);

-- Index for audit_logs.organisation_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_organisation_id 
  ON audit_logs(organisation_id);

-- Index for audit_logs.target_user_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id 
  ON audit_logs(target_user_id);

-- Index for checklist_templates.organisation_id
CREATE INDEX IF NOT EXISTS idx_checklist_templates_organisation_id 
  ON checklist_templates(organisation_id);

-- Index for pdf_reports.organisation_id
CREATE INDEX IF NOT EXISTS idx_pdf_reports_organisation_id 
  ON pdf_reports(organisation_id);

-- Index for pdf_reports.property_id
CREATE INDEX IF NOT EXISTS idx_pdf_reports_property_id 
  ON pdf_reports(property_id);

-- Index for photos.uploaded_by
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by 
  ON photos(uploaded_by);

-- ============================================================================
-- SECTION 2: FIX SECURITY DEFINER VIEWS
-- ============================================================================

-- Drop and recreate property_completion_summary without SECURITY DEFINER
DROP VIEW IF EXISTS property_completion_summary CASCADE;

CREATE VIEW property_completion_summary 
WITH (security_invoker = on) AS
SELECT 
  id AS property_id,
  job_ref,
  address_line_1,
  city,
  postcode,
  status,
  assigned_installer_ids,
  installation_date,
  get_property_completion_percentage(id) AS completion_percentage,
  (
    SELECT count(*) 
    FROM openings o
    JOIN areas a ON a.id = o.area_id
    WHERE a.property_id = p.id 
    AND get_opening_completion_percentage(o.id) < 100
  ) AS unfinished_openings_count,
  (
    SELECT count(*) 
    FROM openings o
    JOIN areas a ON a.id = o.area_id
    WHERE a.property_id = p.id
  ) AS total_openings_count
FROM properties p;

COMMENT ON VIEW property_completion_summary IS 
  'Provides completion status for properties. Uses SECURITY INVOKER to respect RLS policies. Users can only see properties they have access to.';

-- Drop and recreate opening_completion_summary without SECURITY DEFINER
DROP VIEW IF EXISTS opening_completion_summary CASCADE;

CREATE VIEW opening_completion_summary 
WITH (security_invoker = on) AS
SELECT 
  o.id AS opening_id,
  a.property_id,
  o.opening_type,
  o.opening_number,
  o.room_name,
  a.area_name,
  get_opening_completion_percentage(o.id) AS completion_percentage
FROM openings o
JOIN areas a ON a.id = o.area_id;

COMMENT ON VIEW opening_completion_summary IS 
  'Provides completion status for openings. Uses SECURITY INVOKER to respect RLS policies. Users can only see openings they have access to.';
