DROP POLICY IF EXISTS "Anyone can upload tts cache" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update tts cache" ON storage.objects;
DROP POLICY IF EXISTS "Public can insert tts cache" ON storage.objects;
DROP POLICY IF EXISTS "Public can update tts cache" ON storage.objects;
DROP POLICY IF EXISTS "tts-cache insert" ON storage.objects;
DROP POLICY IF EXISTS "tts-cache update" ON storage.objects;
DROP POLICY IF EXISTS "Service role can write to tts-cache" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update tts-cache" ON storage.objects;
DROP POLICY IF EXISTS "Service role can insert tts-cache" ON storage.objects;

CREATE POLICY "Service role can insert tts-cache"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'tts-cache'
  AND auth.role() = 'service_role'
);

CREATE POLICY "Service role can update tts-cache"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'tts-cache'
  AND auth.role() = 'service_role'
)
WITH CHECK (
  bucket_id = 'tts-cache'
  AND auth.role() = 'service_role'
);