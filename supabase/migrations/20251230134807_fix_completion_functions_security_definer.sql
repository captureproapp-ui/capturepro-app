/*
  # Fix Completion Functions with SECURITY DEFINER

  ## Summary
  Makes completion calculation functions use SECURITY DEFINER to allow them to query
  across multiple tables for aggregation while views remain SECURITY INVOKER for access control.

  ## Changes Made
  1. **Function Updates**
     - `get_property_completion_percentage` - Changed to SECURITY DEFINER
     - `get_opening_completion_percentage` - Changed to SECURITY DEFINER
  2. **View Recreation**
     - Drops and recreates dependent views to apply function changes
     
  ## Rationale
  - Completion percentages are aggregated statistical data, not sensitive information
  - Functions need to query across multiple tables (openings, areas, property_evidence_requirements, photos, evidence_item_templates)
  - Views remain SECURITY INVOKER to respect RLS on base tables
  - Users still only see properties they have access to via RLS policies
  - This follows the principle of least privilege while allowing necessary calculations

  ## Security Notes
  - Functions include `SET search_path = public, pg_temp` for security
  - Views maintain SECURITY INVOKER for proper access control
  - RLS policies on base tables continue to restrict user access appropriately
*/

-- Drop dependent views first
DROP VIEW IF EXISTS property_completion_summary;
DROP VIEW IF EXISTS opening_completion_summary;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_property_completion_percentage(uuid);
DROP FUNCTION IF EXISTS get_opening_completion_percentage(uuid);

-- Recreate get_property_completion_percentage with SECURITY DEFINER
CREATE FUNCTION get_property_completion_percentage(p_property_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_requirements int;
  completed_requirements int;
  property_scoped_total int;
  property_scoped_completed int;
  opening_scoped_total int;
  opening_scoped_completed int;
  total_openings int;
BEGIN
  -- Get total number of openings for this property
  SELECT COUNT(*) INTO total_openings
  FROM openings o
  JOIN areas a ON a.id = o.area_id
  WHERE a.property_id = p_property_id;

  -- Count property-scoped requirements (total and completed)
  SELECT 
    COUNT(*) FILTER (WHERE per.is_required AND per.is_applicable),
    COUNT(*) FILTER (WHERE per.is_required AND per.is_applicable AND (COALESCE(pc.photo_count, 0) >= per.required_qty OR pc.marked_na IS NOT NULL))
  INTO property_scoped_total, property_scoped_completed
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  LEFT JOIN (
    SELECT template_id, COUNT(*) as photo_count, MAX(marked_not_available_at) as marked_na
    FROM photos
    WHERE property_id = p_property_id AND opening_id IS NULL
    GROUP BY template_id
  ) pc ON pc.template_id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'property';

  -- Count opening-scoped requirements across ALL openings (total and completed)
  SELECT 
    COUNT(DISTINCT per.id) * total_openings,
    COUNT(DISTINCT CASE WHEN (COALESCE(pc.photo_count, 0) >= per.required_qty OR pc.marked_na IS NOT NULL) THEN per.id::text || '_' || o.id::text END)
  INTO opening_scoped_total, opening_scoped_completed
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  CROSS JOIN openings o
  JOIN areas a ON a.id = o.area_id AND a.property_id = p_property_id
  LEFT JOIN (
    SELECT opening_id, template_id, COUNT(*) as photo_count, MAX(marked_not_available_at) as marked_na
    FROM photos
    WHERE property_id = p_property_id AND opening_id IS NOT NULL
    GROUP BY opening_id, template_id
  ) pc ON pc.opening_id = o.id AND pc.template_id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'opening'
    AND per.is_required = true
    AND per.is_applicable = true;

  total_requirements := COALESCE(property_scoped_total, 0) + COALESCE(opening_scoped_total, 0);
  completed_requirements := COALESCE(property_scoped_completed, 0) + COALESCE(opening_scoped_completed, 0);

  IF total_requirements = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((completed_requirements::numeric / total_requirements::numeric) * 100, 1);
END;
$$;

-- Recreate get_opening_completion_percentage with SECURITY DEFINER
CREATE FUNCTION get_opening_completion_percentage(p_opening_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_requirements int;
  completed_requirements int;
  p_property_id uuid;
BEGIN
  -- Get the property_id for this opening (through areas)
  SELECT a.property_id INTO p_property_id
  FROM openings o
  JOIN areas a ON a.id = o.area_id
  WHERE o.id = p_opening_id;

  IF p_property_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Count total opening-scoped requirements that are required and applicable
  SELECT COUNT(*)
  INTO total_requirements
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'opening'
    AND per.is_required = true
    AND per.is_applicable = true;

  IF total_requirements = 0 THEN
    RETURN 0;
  END IF;

  -- Count completed requirements (where satisfied_qty >= required_qty OR marked as N/A)
  SELECT COUNT(*)
  INTO completed_requirements
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  LEFT JOIN (
    SELECT template_id, 
           COUNT(*) as photo_count,
           MAX(marked_not_available_at) as marked_na
    FROM photos
    WHERE opening_id = p_opening_id
    GROUP BY template_id
  ) pc ON pc.template_id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'opening'
    AND per.is_required = true
    AND per.is_applicable = true
    AND (
      COALESCE(pc.photo_count, 0) >= per.required_qty
      OR pc.marked_na IS NOT NULL
    );

  RETURN ROUND((completed_requirements::numeric / total_requirements::numeric) * 100, 1);
END;
$$;

-- Recreate property_completion_summary view with SECURITY INVOKER
CREATE VIEW property_completion_summary
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.job_ref,
  p.address_line_1,
  p.city,
  p.postcode,
  p.assigned_installer_ids,
  p.status,
  p.created_at,
  get_property_completion_percentage(p.id) as completion_percentage,
  COUNT(DISTINCT o.id) as total_openings
FROM properties p
LEFT JOIN areas a ON a.property_id = p.id
LEFT JOIN openings o ON o.area_id = a.id
GROUP BY p.id, p.job_ref, p.address_line_1, p.city, p.postcode, p.assigned_installer_ids, p.status, p.created_at;

-- Recreate opening_completion_summary view with SECURITY INVOKER
CREATE VIEW opening_completion_summary
WITH (security_invoker = true)
AS
SELECT 
  o.id,
  o.area_id,
  o.opening_type,
  o.opening_number,
  o.created_at,
  get_opening_completion_percentage(o.id) as completion_percentage
FROM openings o;