/*
  # Fix Opening Completion Summary View

  ## Problem
  The opening_completion_summary view was incorrectly recreated by migration 20260215143941
  without the necessary JOIN to the areas table. This caused the view to be missing:
  - property_id column (needed for frontend queries)
  - room_name column
  - area_name column

  The frontend component OpeningsList.tsx queries this view by property_id, so without
  that column, the query fails and shows "No openings found for this room".

  ## Solution
  Recreate the view with proper JOIN to areas table to include all required columns:
  - opening_id (from openings.id)
  - property_id (from areas.property_id via JOIN)
  - opening_type
  - opening_number
  - room_name (from openings.room_name)
  - area_name (from areas.area_name via JOIN)
  - completion_percentage (calculated via get_opening_completion_percentage function)

  ## Security
  Uses SECURITY INVOKER to respect RLS policies on underlying tables
*/

-- Drop and recreate the view with correct structure
DROP VIEW IF EXISTS opening_completion_summary CASCADE;

CREATE VIEW opening_completion_summary 
WITH (security_invoker = true) AS
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
  'Provides completion status for openings with all required columns for the frontend. Includes property_id via JOIN to areas table. Uses SECURITY INVOKER to respect RLS policies.';
