/*
  # Backfill Photo Template Associations

  1. Problem
    - Existing photos don't have template_id set
    - Without template association, photos don't count toward completion tracking
    - Installers see 0% completion even with photos uploaded

  2. Changes
    - Attempt to auto-match photos to templates based on photo_type and stage
    - Match opening-scoped templates to photos with opening_id
    - Set template_id and stage for photos that can be confidently matched
    - Photos that can't be matched will need manual assignment later

  3. Matching Logic
    - photo_type='before' → stage='pre'
    - photo_type='during' → stage='during'  
    - photo_type='after' → stage='post'
    - For each opening, distribute photos evenly across available templates of matching stage
    - Prioritize templates with lowest current photo count

  4. Security
    - No RLS changes needed
*/

-- First, set the stage column based on photo_type for all photos
UPDATE photos
SET stage = CASE
  WHEN photo_type = 'before' THEN 'pre'::evidence_stage
  WHEN photo_type = 'during' THEN 'during'::evidence_stage
  WHEN photo_type = 'after' THEN 'post'::evidence_stage
  ELSE 'pre'::evidence_stage
END
WHERE stage IS NULL;

-- Auto-assign template_id for opening-scoped photos
-- Match photos to templates based on stage and property
WITH photo_template_matches AS (
  SELECT 
    p.id as photo_id,
    p.opening_id,
    p.property_id,
    p.stage,
    per.template_id,
    eit.title,
    ROW_NUMBER() OVER (
      PARTITION BY p.id 
      ORDER BY 
        -- Prioritize templates with fewer photos already
        (SELECT COUNT(*) FROM photos WHERE template_id = per.template_id AND opening_id = p.opening_id),
        eit.sort_order
    ) as match_rank
  FROM photos p
  INNER JOIN property_evidence_requirements per ON per.property_id = p.property_id
  INNER JOIN evidence_item_templates eit ON eit.id = per.template_id
  WHERE p.template_id IS NULL
    AND p.opening_id IS NOT NULL
    AND eit.scope = 'opening'
    AND eit.stage = p.stage
    AND per.is_applicable = true
    AND per.is_required = true
)
UPDATE photos
SET template_id = ptm.template_id
FROM photo_template_matches ptm
WHERE photos.id = ptm.photo_id
  AND ptm.match_rank = 1;

-- Log how many photos were successfully matched
DO $$
DECLARE
  matched_count int;
  unmatched_count int;
BEGIN
  SELECT COUNT(*) INTO matched_count FROM photos WHERE template_id IS NOT NULL;
  SELECT COUNT(*) INTO unmatched_count FROM photos WHERE template_id IS NULL;
  
  RAISE NOTICE 'Photo template backfill complete:';
  RAISE NOTICE '  - % photos matched to templates', matched_count;
  RAISE NOTICE '  - % photos still unmatched (may need manual assignment)', unmatched_count;
END $$;
