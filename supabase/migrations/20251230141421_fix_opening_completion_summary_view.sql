/*
  # Fix Opening Completion Summary View

  ## Problem
  The opening_completion_summary view was missing critical columns that the frontend expects:
  - Missing: property_id, room_name, area_name
  - Using 'id' instead of 'opening_id'
  
  This caused the openings list to appear blank because the query was filtering by 
  property_id which didn't exist in the view.

  ## Changes
  1. Drop and recreate the opening_completion_summary view with all required columns:
     - opening_id (renamed from id)
     - property_id (joined from areas table)
     - opening_type
     - opening_number
     - room_name (from openings table)
     - area_name (from areas table)
     - completion_percentage (calculated)

  ## Security
  - Uses SECURITY INVOKER to respect RLS policies
  - No changes to RLS policies needed
*/

-- Drop and recreate the view with correct columns
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
  'Provides completion status for openings with all required columns for the frontend. Uses SECURITY INVOKER to respect RLS policies.';
