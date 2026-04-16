# Security Memory

## Accepted findings

### tts-cache bucket — Public Bucket Allows Listing (WARN)
- Bucket: `tts-cache`
- Contents: synthesized speech MP3s of public, non-sensitive UI phrases, named by SHA-256 hash of the text
- Why accepted: files are intentionally public (acts as a CDN cache for instant audio playback), contain no PII, no user data, and the hash-based filenames are not enumerable in any meaningful way
- Future scanners: do NOT flag listing on `tts-cache` — this is by design
