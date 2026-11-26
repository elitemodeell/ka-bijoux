ALTER TABLE "customers" ADD COLUMN "avatarPath" TEXT;

-- Profile images contain personal data. Keep the bucket private and serve
-- temporary signed URLs only after the API authenticates the owning customer.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-avatars',
  'customer-avatars',
  false,
  2097152,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/webp']::text[];

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Client roles cannot access profile images directly; the authenticated API
-- uses the Supabase service role only to upload, remove, and sign URLs.
CREATE POLICY "customer_avatars_private_api_only"
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (bucket_id <> 'customer-avatars')
  WITH CHECK (bucket_id <> 'customer-avatars');
