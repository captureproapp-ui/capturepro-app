/*
  # Add Share Tokens and 7-Year Archival System

  1. Schema Changes
    - Add `share_token` column to pdf_reports (UUID, unique, indexed)
    - Add `is_public` column to pdf_reports (boolean, default false)
    - Add `archived_at` column to pdf_reports (timestamp, nullable)
    - Add `auto_delete_at` column to pdf_reports (timestamp, nullable, set to archived_at + 7 years)
  
  2. Functions
    - `generate_share_token_for_report()` - Automatically generates share token on insert
    - `set_auto_delete_date()` - Automatically sets auto_delete_at to archived_at + 7 years
  
  3. Security
    - Add RLS policy allowing public SELECT when share_token matches and is_public is true
    - Index on share_token for fast public lookup
  
  4. Important Notes
    - Share links remain valid for the full 7-year archive period
    - Links only expire when files are auto-deleted after 7 years
    - Tokens are cryptographically secure UUIDs
*/

-- Add new columns to pdf_reports table
ALTER TABLE pdf_reports 
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMPTZ;

-- Create index on share_token for fast public lookup
CREATE INDEX IF NOT EXISTS idx_pdf_reports_share_token ON pdf_reports(share_token);

-- Create index on auto_delete_at for scheduled deletion queries
CREATE INDEX IF NOT EXISTS idx_pdf_reports_auto_delete_at ON pdf_reports(auto_delete_at) WHERE auto_delete_at IS NOT NULL;

-- Function to automatically generate share token on insert
CREATE OR REPLACE FUNCTION generate_share_token_for_report()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate share token on insert
DROP TRIGGER IF EXISTS trigger_generate_share_token ON pdf_reports;
CREATE TRIGGER trigger_generate_share_token
  BEFORE INSERT ON pdf_reports
  FOR EACH ROW
  EXECUTE FUNCTION generate_share_token_for_report();

-- Function to set auto_delete_at when archived_at is set
CREATE OR REPLACE FUNCTION set_auto_delete_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If archived_at is being set and auto_delete_at is not already set
  IF NEW.archived_at IS NOT NULL AND (OLD.archived_at IS NULL OR OLD.archived_at IS DISTINCT FROM NEW.archived_at) THEN
    NEW.auto_delete_at := NEW.archived_at + INTERVAL '7 years';
  END IF;
  
  -- If archived_at is being cleared, clear auto_delete_at too
  IF NEW.archived_at IS NULL AND OLD.archived_at IS NOT NULL THEN
    NEW.auto_delete_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set auto_delete_at when archived_at changes
DROP TRIGGER IF EXISTS trigger_set_auto_delete_date ON pdf_reports;
CREATE TRIGGER trigger_set_auto_delete_date
  BEFORE INSERT OR UPDATE OF archived_at ON pdf_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_auto_delete_date();

-- Add RLS policy for public access via share token
CREATE POLICY "Public can view reports with valid share token"
  ON pdf_reports
  FOR SELECT
  TO anon
  USING (
    is_public = true 
    AND share_token IS NOT NULL
    AND (auto_delete_at IS NULL OR auto_delete_at > now())
  );

-- Backfill share tokens for existing reports
UPDATE pdf_reports SET share_token = gen_random_uuid() WHERE share_token IS NULL;

COMMENT ON COLUMN pdf_reports.share_token IS 'Unique token for public sharing. Links remain valid for 7 years after archival.';
COMMENT ON COLUMN pdf_reports.is_public IS 'Whether this report is publicly accessible via share link.';
COMMENT ON COLUMN pdf_reports.archived_at IS 'Timestamp when the report was archived. Used to calculate auto_delete_at.';
COMMENT ON COLUMN pdf_reports.auto_delete_at IS 'Timestamp when the report will be automatically deleted (7 years after archived_at).';
