/*
  # Completion Calculation Functions (Fixed)

  ## Overview
  Functions and views to calculate completion percentages for properties and openings.
  Fixed to account for openings -> areas -> properties relationship.

  ## Functions Created
  1. get_opening_completion_percentage(opening_id) - Returns completion % for an opening
  2. get_property_completion_percentage(property_id) - Returns completion % for a property
  3. get_opening_missing_requirements(opening_id) - Returns list of missing requirements
  4. get_property_missing_requirements(property_id) - Returns list of missing requirements
*/

-- Function to get completion percentage for an opening
CREATE OR REPLACE FUNCTION get_opening_completion_percentage(p_opening_id uuid)
RETURNS numeric AS $$
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
    RETURN 100;
  END IF;
  
  -- Count completed requirements (where satisfied_qty >= required_qty)
  SELECT COUNT(*)
  INTO completed_requirements
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  LEFT JOIN (
    SELECT template_id, COUNT(*) as photo_count
    FROM photos
    WHERE opening_id = p_opening_id
    GROUP BY template_id
  ) pc ON pc.template_id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'opening'
    AND per.is_required = true
    AND per.is_applicable = true
    AND COALESCE(pc.photo_count, 0) >= per.required_qty;
  
  RETURN ROUND((completed_requirements::numeric / total_requirements::numeric) * 100, 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get completion percentage for a property
CREATE OR REPLACE FUNCTION get_property_completion_percentage(p_property_id uuid)
RETURNS numeric AS $$
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
    COUNT(*) FILTER (WHERE per.is_required AND per.is_applicable AND COALESCE(pc.photo_count, 0) >= per.required_qty)
  INTO property_scoped_total, property_scoped_completed
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  LEFT JOIN (
    SELECT template_id, COUNT(*) as photo_count
    FROM photos
    WHERE property_id = p_property_id AND opening_id IS NULL
    GROUP BY template_id
  ) pc ON pc.template_id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'property';
  
  -- Count opening-scoped requirements across ALL openings (total and completed)
  SELECT 
    COUNT(DISTINCT per.id) * total_openings,
    COUNT(DISTINCT CASE WHEN COALESCE(pc.photo_count, 0) >= per.required_qty THEN per.id::text || '_' || o.id::text END)
  INTO opening_scoped_total, opening_scoped_completed
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  CROSS JOIN openings o
  JOIN areas a ON a.id = o.area_id AND a.property_id = p_property_id
  LEFT JOIN (
    SELECT opening_id, template_id, COUNT(*) as photo_count
    FROM photos
    WHERE property_id = p_property_id AND opening_id IS NOT NULL
    GROUP BY opening_id, template_id
  ) pc ON pc.template_id = per.template_id AND pc.opening_id = o.id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'opening'
    AND per.is_required = true
    AND per.is_applicable = true;
  
  total_requirements := COALESCE(property_scoped_total, 0) + COALESCE(opening_scoped_total, 0);
  completed_requirements := COALESCE(property_scoped_completed, 0) + COALESCE(opening_scoped_completed, 0);
  
  IF total_requirements = 0 THEN
    RETURN 100;
  END IF;
  
  RETURN ROUND((completed_requirements::numeric / total_requirements::numeric) * 100, 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get missing requirements for an opening (top N)
CREATE OR REPLACE FUNCTION get_opening_missing_requirements(p_opening_id uuid, p_limit int DEFAULT 3)
RETURNS TABLE(template_title text, required_qty int, satisfied_qty int, missing_qty int) AS $$
DECLARE
  p_property_id uuid;
BEGIN
  SELECT a.property_id INTO p_property_id 
  FROM openings o
  JOIN areas a ON a.id = o.area_id
  WHERE o.id = p_opening_id;
  
  RETURN QUERY
  SELECT 
    eit.title,
    per.required_qty,
    COALESCE(pc.photo_count, 0)::int,
    GREATEST(per.required_qty - COALESCE(pc.photo_count, 0), 0)::int
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  LEFT JOIN (
    SELECT template_id, COUNT(*) as photo_count
    FROM photos
    WHERE opening_id = p_opening_id
    GROUP BY template_id
  ) pc ON pc.template_id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'opening'
    AND per.is_required = true
    AND per.is_applicable = true
    AND COALESCE(pc.photo_count, 0) < per.required_qty
  ORDER BY eit.sort_order
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get missing requirements for a property
CREATE OR REPLACE FUNCTION get_property_missing_requirements(p_property_id uuid)
RETURNS TABLE(
  scope text,
  template_title text,
  required_qty int,
  satisfied_qty int,
  missing_qty int,
  stage text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eit.scope::text,
    eit.title,
    per.required_qty,
    COALESCE(pc.photo_count, 0)::int,
    GREATEST(per.required_qty - COALESCE(pc.photo_count, 0), 0)::int,
    eit.stage::text
  FROM property_evidence_requirements per
  JOIN evidence_item_templates eit ON eit.id = per.template_id
  LEFT JOIN (
    SELECT template_id, COUNT(*) as photo_count
    FROM photos
    WHERE property_id = p_property_id AND opening_id IS NULL
    GROUP BY template_id
  ) pc ON pc.template_id = per.template_id
  WHERE per.property_id = p_property_id
    AND eit.scope = 'property'
    AND per.is_required = true
    AND per.is_applicable = true
    AND COALESCE(pc.photo_count, 0) < per.required_qty
  ORDER BY eit.sort_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- View for property completion summary
CREATE OR REPLACE VIEW property_completion_summary AS
SELECT 
  p.id as property_id,
  p.job_ref,
  p.address_line_1,
  p.city,
  p.postcode,
  p.status,
  get_property_completion_percentage(p.id) as completion_percentage,
  (
    SELECT COUNT(*)
    FROM openings o
    JOIN areas a ON a.id = o.area_id
    WHERE a.property_id = p.id
      AND get_opening_completion_percentage(o.id) < 100
  ) as unfinished_openings_count,
  (
    SELECT COUNT(*)
    FROM openings o
    JOIN areas a ON a.id = o.area_id
    WHERE a.property_id = p.id
  ) as total_openings_count
FROM properties p;

-- View for opening completion summary  
CREATE OR REPLACE VIEW opening_completion_summary AS
SELECT 
  o.id as opening_id,
  a.property_id,
  o.opening_type,
  o.opening_number,
  o.room_name,
  a.area_name,
  get_opening_completion_percentage(o.id) as completion_percentage
FROM openings o
JOIN areas a ON a.id = o.area_id;
