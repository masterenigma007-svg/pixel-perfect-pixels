-- Public bucket for cached TTS audio (MP3s keyed by SHA-256 of text)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-cache', 'tts-cache', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can read cached audio (it's public synthesized speech, no PII)
CREATE POLICY "Public read access to tts-cache"
ON storage.objects FOR SELECT
USING (bucket_id = 'tts-cache');

-- Only service role can write (edge function uses service role key)
CREATE POLICY "Service role can insert into tts-cache"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tts-cache');

CREATE POLICY "Service role can update tts-cache"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tts-cache');