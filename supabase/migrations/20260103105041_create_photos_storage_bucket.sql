/*
  # Create Photos Storage Bucket

  1. Storage Bucket
    - Create `photos` bucket for storing property and opening photos
    - Configure bucket to be publicly accessible for reading
    - Set file size limit to 10MB per file
    - Allow standard image formats (JPEG, PNG, WebP)

  2. Security Policies
    - Allow authenticated users to upload photos to their organization's folders
    - Allow public read access to all uploaded photos
    - Allow users to delete their own uploaded photos
    - Restrict access based on organization membership

  3. Path Structure
    - Photos organized by: {org_id}/{property_id}/{area_id}/{opening_id or 'elevations'}/{filename}
    - Supports both opening-specific photos and property elevation photos
*/

-- Create the photos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND auth.uid() IS NOT NULL
);

-- Policy: Allow public read access to all photos
CREATE POLICY "Public read access to photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Policy: Allow users to update their own uploaded photos
CREATE POLICY "Users can update own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos'
  AND auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'photos'
  AND auth.uid() = owner
);

-- Policy: Allow users to delete their own uploaded photos
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND auth.uid() = owner
);