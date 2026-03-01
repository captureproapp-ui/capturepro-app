/*
  # Create Organisation Deletion Function

  1. Purpose
    - Safely delete an organisation and all associated data
    - Handles deletion in correct order to respect foreign key constraints
    - Returns summary of what was deleted

  2. What Gets Deleted
    - Property elevations
    - Property measures
    - Photos (database records)
    - Property evidence requirements
    - Openings
    - Areas
    - PDF reports
    - Archived properties
    - Properties
    - Organisation measures
    - Audit logs (both org-level and user-level)
    - Notifications
    - User profiles
    - Organisation record

  3. Security
    - Function is SECURITY DEFINER to allow deletion of all records
    - Only callable by super admins (enforced in edge function)
*/

CREATE OR REPLACE FUNCTION delete_organisation_cascade(org_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  property_ids uuid[];
  area_ids uuid[];
  user_ids uuid[];
  result jsonb;
  deleted_counts jsonb;
BEGIN
  -- Get all property IDs for this organisation
  SELECT array_agg(id) INTO property_ids
  FROM properties
  WHERE organisation_id = org_id;

  -- Get all area IDs for these properties
  IF property_ids IS NOT NULL THEN
    SELECT array_agg(id) INTO area_ids
    FROM areas
    WHERE property_id = ANY(property_ids);
  END IF;

  -- Get all user IDs for this organisation
  SELECT array_agg(id) INTO user_ids
  FROM profiles
  WHERE organisation_id = org_id;

  -- Initialize result object
  deleted_counts := jsonb_build_object();

  -- Delete in correct order to respect foreign key constraints

  -- 1. Delete property elevations
  IF property_ids IS NOT NULL THEN
    WITH deleted AS (
      DELETE FROM property_elevations
      WHERE property_id = ANY(property_ids)
      RETURNING 1
    )
    SELECT count(*) INTO result FROM deleted;
    deleted_counts := deleted_counts || jsonb_build_object('property_elevations', result);
  END IF;

  -- 2. Delete property measures
  IF property_ids IS NOT NULL THEN
    WITH deleted AS (
      DELETE FROM property_measures
      WHERE property_id = ANY(property_ids)
      RETURNING 1
    )
    SELECT count(*) INTO result FROM deleted;
    deleted_counts := deleted_counts || jsonb_build_object('property_measures', result);
  END IF;

  -- 3. Delete photos (database records only, storage files handled by edge function)
  IF property_ids IS NOT NULL THEN
    WITH deleted AS (
      DELETE FROM photos
      WHERE property_id = ANY(property_ids)
      RETURNING 1
    )
    SELECT count(*) INTO result FROM deleted;
    deleted_counts := deleted_counts || jsonb_build_object('photos', result);
  END IF;

  -- 4. Delete property evidence requirements
  IF property_ids IS NOT NULL THEN
    WITH deleted AS (
      DELETE FROM property_evidence_requirements
      WHERE property_id = ANY(property_ids)
      RETURNING 1
    )
    SELECT count(*) INTO result FROM deleted;
    deleted_counts := deleted_counts || jsonb_build_object('property_evidence_requirements', result);
  END IF;

  -- 5. Delete openings
  IF area_ids IS NOT NULL THEN
    WITH deleted AS (
      DELETE FROM openings
      WHERE area_id = ANY(area_ids)
      RETURNING 1
    )
    SELECT count(*) INTO result FROM deleted;
    deleted_counts := deleted_counts || jsonb_build_object('openings', result);
  END IF;

  -- 6. Delete areas
  IF property_ids IS NOT NULL THEN
    WITH deleted AS (
      DELETE FROM areas
      WHERE property_id = ANY(property_ids)
      RETURNING 1
    )
    SELECT count(*) INTO result FROM deleted;
    deleted_counts := deleted_counts || jsonb_build_object('areas', result);
  END IF;

  -- 7. Delete PDF reports
  IF property_ids IS NOT NULL THEN
    WITH deleted AS (
      DELETE FROM pdf_reports
      WHERE property_id = ANY(property_ids)
      RETURNING 1
    )
    SELECT count(*) INTO result FROM deleted;
    deleted_counts := deleted_counts || jsonb_build_object('pdf_reports', result);
  END IF;

  -- 8. Delete archived properties
  WITH deleted AS (
    DELETE FROM archived_properties
    WHERE organisation_id = org_id
    RETURNING 1
  )
  SELECT count(*) INTO result FROM deleted;
  deleted_counts := deleted_counts || jsonb_build_object('archived_properties', result);

  -- 9. Delete properties
  WITH deleted AS (
    DELETE FROM properties
    WHERE organisation_id = org_id
    RETURNING 1
  )
  SELECT count(*) INTO result FROM deleted;
  deleted_counts := deleted_counts || jsonb_build_object('properties', result);

  -- 10. Delete organisation measures
  WITH deleted AS (
    DELETE FROM organisation_measures
    WHERE organisation_id = org_id
    RETURNING 1
  )
  SELECT count(*) INTO result FROM deleted;
  deleted_counts := deleted_counts || jsonb_build_object('organisation_measures', result);

  -- 11. Delete notifications for users in this org
  IF user_ids IS NOT NULL THEN
    WITH deleted AS (
      DELETE FROM notifications
      WHERE user_id = ANY(user_ids)
      RETURNING 1
    )
    SELECT count(*) INTO result FROM deleted;
    deleted_counts := deleted_counts || jsonb_build_object('notifications', result);
  END IF;

  -- 12. Delete audit logs that reference users as targets
  IF user_ids IS NOT NULL THEN
    WITH deleted AS (
      DELETE FROM audit_logs
      WHERE target_user_id = ANY(user_ids)
      RETURNING 1
    )
    SELECT count(*) INTO result FROM deleted;
    deleted_counts := deleted_counts || jsonb_build_object('audit_logs_target_users', result);
  END IF;

  -- 13. Delete audit logs for this organisation
  WITH deleted AS (
    DELETE FROM audit_logs
    WHERE organisation_id = org_id
    RETURNING 1
  )
  SELECT count(*) INTO result FROM deleted;
  deleted_counts := deleted_counts || jsonb_build_object('audit_logs', result);

  -- 14. Delete user profiles
  WITH deleted AS (
    DELETE FROM profiles
    WHERE organisation_id = org_id
    RETURNING 1
  )
  SELECT count(*) INTO result FROM deleted;
  deleted_counts := deleted_counts || jsonb_build_object('profiles', result);

  -- 15. Delete organisation
  WITH deleted AS (
    DELETE FROM organisations
    WHERE id = org_id
    RETURNING 1
  )
  SELECT count(*) INTO result FROM deleted;
  deleted_counts := deleted_counts || jsonb_build_object('organisations', result);

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'organisation_id', org_id,
    'deleted_counts', deleted_counts,
    'user_ids', user_ids
  );
END;
$$;

-- Grant execute permission to authenticated users
-- (Edge function will verify super admin role)
GRANT EXECUTE ON FUNCTION delete_organisation_cascade(uuid) TO authenticated;
