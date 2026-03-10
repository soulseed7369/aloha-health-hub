-- Create the practitioner-images storage bucket
-- Used for practitioner and center avatar uploads from the admin panel,
-- provider dashboard, and the data pipeline (08_upload_and_upsert.py).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'practitioner-images',
  'practitioner-images',
  true,
  10485760,   -- 10 MB limit
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read: anyone can view images (bucket is public, but explicit policy is best practice)
CREATE POLICY "practitioner_images_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'practitioner-images');

-- Authenticated upload: any logged-in user (admin or practitioner) can upload
CREATE POLICY "practitioner_images_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'practitioner-images');

-- Authenticated update: allow replacing an existing image
CREATE POLICY "practitioner_images_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'practitioner-images');

-- Authenticated delete: allow removing images (e.g. when replacing avatar)
CREATE POLICY "practitioner_images_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'practitioner-images');
