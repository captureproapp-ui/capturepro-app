/*
  # Add direct foreign key from pdf_reports to profiles

  1. Changes
    - Add FK constraint from `pdf_reports.generated_by` to `public.profiles(id)`
    - This allows PostgREST to resolve joins between pdf_reports and profiles
    - The existing FK to auth.users remains intact

  2. Why
    - PostgREST cannot traverse through auth.users to reach profiles
    - A direct FK is required for the `.select('profiles(full_name, email)')` syntax to work
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pdf_reports_generated_by_profiles_fkey'
  ) THEN
    ALTER TABLE public.pdf_reports
      ADD CONSTRAINT pdf_reports_generated_by_profiles_fkey
      FOREIGN KEY (generated_by) REFERENCES public.profiles(id);
  END IF;
END $$;
