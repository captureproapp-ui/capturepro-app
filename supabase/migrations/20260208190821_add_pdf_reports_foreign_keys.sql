/*
  # Add foreign key constraints to pdf_reports

  The pdf_reports table was missing all foreign key constraints, which caused
  PostgREST (Supabase) to fail when resolving relationship joins like
  `profiles(full_name, email)` in select queries.

  1. Changes
    - Add FK from `pdf_reports.generated_by` -> `profiles.id` (SET NULL on delete)
    - Add FK from `pdf_reports.property_id` -> `properties.id` (CASCADE on delete)
    - Add FK from `pdf_reports.organisation_id` -> `organisations.id` (SET NULL on delete)

  2. Notes
    - `generated_by` and `organisation_id` are nullable, so SET NULL is appropriate
    - `property_id` is NOT NULL, so CASCADE ensures cleanup when a property is removed
    - These constraints are required for PostgREST to resolve join queries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pdf_reports_generated_by_fkey'
      AND table_name = 'pdf_reports'
  ) THEN
    ALTER TABLE pdf_reports
      ADD CONSTRAINT pdf_reports_generated_by_fkey
      FOREIGN KEY (generated_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pdf_reports_property_id_fkey'
      AND table_name = 'pdf_reports'
  ) THEN
    ALTER TABLE pdf_reports
      ADD CONSTRAINT pdf_reports_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pdf_reports_organisation_id_fkey'
      AND table_name = 'pdf_reports'
  ) THEN
    ALTER TABLE pdf_reports
      ADD CONSTRAINT pdf_reports_organisation_id_fkey
      FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE SET NULL;
  END IF;
END $$;
