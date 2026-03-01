/*
  # Add Web Report Viewing Support

  1. Changes to pdf_reports Table
    - `web_report_html` (text) - Stores the HTML version of the report
    - `view_count` (integer) - Tracks how many times the web report has been viewed
    - `last_viewed_at` (timestamptz) - Timestamp of last web report access
  
  2. Security
    - RLS policies remain the same (admins/owners can view their org's reports)
    - Web report content uses existing access controls

  3. Notes
    - Web reports provide instant viewing without downloading large PDFs
    - HTML content is generated alongside PDF during report creation
    - View tracking helps understand usage patterns
*/

-- Add web report columns to pdf_reports table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_reports' AND column_name = 'web_report_html'
  ) THEN
    ALTER TABLE pdf_reports ADD COLUMN web_report_html text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_reports' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE pdf_reports ADD COLUMN view_count integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_reports' AND column_name = 'last_viewed_at'
  ) THEN
    ALTER TABLE pdf_reports ADD COLUMN last_viewed_at timestamptz;
  END IF;
END $$;

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_report_view_count(report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pdf_reports
  SET 
    view_count = view_count + 1,
    last_viewed_at = now()
  WHERE id = report_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_report_view_count(uuid) TO authenticated;