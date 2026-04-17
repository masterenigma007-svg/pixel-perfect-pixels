-- Restore public reads (needed for audio playback via public URLs)
UPDATE storage.buckets
SET public = true
WHERE id = 'tts-cache';