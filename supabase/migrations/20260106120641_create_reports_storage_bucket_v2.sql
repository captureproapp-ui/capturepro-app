/*
  # Create Reports Storage Bucket
  
  1. New Storage Bucket
    - `reports` - Public bucket for storing PDF reports
    - File structure: `org/{org_id}/properties/{property_id}/reports/v{version}/{filename}.pdf`
  
  2. Security
    - Policy: Authenticated users can upload reports to their organization's folder
    - Policy: Public read access to all reports (for sharing PDF URLs)
    - Policy: Organization members can delete their organization's reports
  
  3. Notes
    - Bucket is public to allow PDF URLs to be accessible without authentication
    - Upload is restricted to authenticated users only
    - Files are organized by organization and property for easy management
*/

-- Create the reports storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  true,
  104857600, -- 100MB limit per file
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload reports to their organization's folder
DROP POLICY IF EXISTS "Authenticated users can upload reports to their org folder" ON storage.objects;
CREATE POLICY "Authenticated users can upload reports to their org folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organisation_id::text = (storage.foldername(name))[2]
    )
  );

-- Policy: Public read access to all reports (for PDF URL sharing)
DROP POLICY IF EXISTS "Public read access to all reports" ON storage.objects;
CREATE POLICY "Public read access to all reports"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'reports');

-- Policy: Organization members can delete their organization's reports
DROP POLICY IF EXISTS "Org members can delete their org reports" ON storage.objects;
CREATE POLICY "Org members can delete their org reports"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organisation_id::text = (storage.foldername(name))[2]
    )
  );

-- Policy: Organization members can update their organization's reports
DROP POLICY IF EXISTS "Org members can update their org reports" ON storage.objects;
CREATE POLICY "Org members can update their org reports"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organisation_id::text = (storage.foldername(name))[2]
    )
  );
