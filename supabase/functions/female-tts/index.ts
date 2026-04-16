// Edge function: returns MP3 audio for a given text using ElevenLabs TTS.
// Primary: ElevenLabs "Sarah" (warm, expressive female). Falls back to
// Google Translate's public TTS if ElevenLabs is unavailable.
// Audio is cached in Supabase Storage (tts-cache bucket) keyed by SHA-256.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CHUNK = 190;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
const BUCKET = "tts-cache";

// Sarah — warm, expressive, slightly sarcastic-friendly female voice
const ELEVEN_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const ELEVEN_MODEL = "eleven_turbo_v2_5";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function publicUrlFor(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function cacheHas(path: string): Promise<boolean> {
  const res = await fetch(publicUrlFor(path), { method: "HEAD" });
  return res.ok;
}

async function cachePut(path: string, audio: Uint8Array): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "audio/mpeg",
        "x-upsert": "true",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: audio,
    }
  );
  if (!res.ok) {
    const message = await res.text();
    console.warn(`[female-tts] cache upload failed ${res.status}: ${message}`);
    throw new Error(`Cache upload failed: ${res.status}`);
  }
}

// ── ElevenLabs ────────────────────────────────────────────────
async function fetchElevenLabs(text: string): Promise<Uint8Array | null> {
  if (!ELEVENLABS_API_KEY) {
    console.warn("[female-tts] ELEVENLABS_API_KEY not set");
    return null;
  }
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: ELEVEN_MODEL,
          voice_settings: {
            stability: 0.35,
            similarity_boost: 0.75,
            style: 0.65,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[female-tts] ElevenLabs ${res.status}: ${errText}`);
      return null;
    }
    return new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    console.warn("[female-tts] ElevenLabs exception:", err);
    return null;
  }
}

// ── Google fallback ───────────────────────────────────────────
function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= MAX_CHUNK) return [clean];
  const parts: string[] = [];
  const sentences = clean.match(/[^.!?]+[.!?]?/g) ?? [clean];
  let current = "";
  for (const sentence of sentences) {
    const s = sentence.trim();
    if (!s) continue;
    if ((current + " " + s).trim().length <= MAX_CHUNK) {
      current = (current ? current + " " : "") + s;
    } else {
      if (current) parts.push(current);
      if (s.length <= MAX_CHUNK) {
        current = s;
      } else {
        const words = s.split(" ");
        let buf = "";
        for (const w of words) {
          if ((buf + " " + w).trim().length <= MAX_CHUNK) {
            buf = (buf ? buf + " " : "") + w;
          } else {
            if (buf) parts.push(buf);
            buf = w;
          }
        }
        current = buf;
      }
    }
  }
  if (current) parts.push(current);
  return parts;
}

async function fetchGoogleChunk(text: string): Promise<Uint8Array> {
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&q=" +
    encodeURIComponent(text);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://translate.google.com/",
      Accept: "audio/mpeg, */*",
    },
  });
  if (!res.ok) throw new Error(`Google TTS failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

// ── Handler ──────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'text' string in body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const hash = await sha256Hex(text);
    const path = `${hash}.mp3`;
    const url = publicUrlFor(path);

    if (await cacheHas(path)) {
      console.log(`[female-tts] cache HIT ${hash.slice(0, 8)}`);
      return new Response(JSON.stringify({ url, cached: true }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-TTS-Cache": "hit",
        },
      });
    }

    console.log(`[female-tts] cache MISS ${hash.slice(0, 8)} — generating`);

    // Try ElevenLabs first
    const elevenAudio = await fetchElevenLabs(text);
    if (elevenAudio && elevenAudio.length > 0) {
      console.log(`[female-tts] ElevenLabs success: ${elevenAudio.length} bytes`);
      try {
        await cachePut(path, elevenAudio);
        return new Response(JSON.stringify({ url, cached: false }), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-TTS-Provider": "elevenlabs",
          },
        });
      } catch (cacheError) {
        console.warn("[female-tts] ElevenLabs cached failed; streaming direct", cacheError);
        return new Response(elevenAudio, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
            "X-TTS-Provider": "elevenlabs-direct",
          },
        });
      }
    }

    console.warn("[female-tts] ElevenLabs failed; using Google fallback");
    const chunks = chunkText(text);
    if (!chunks.length) {
      return new Response(JSON.stringify({ error: "Empty text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const buffers: Uint8Array[] = [];
    for (const c of chunks) buffers.push(await fetchGoogleChunk(c));
    const merged = concat(buffers);
    try {
      await cachePut(path, merged);
      return new Response(JSON.stringify({ url, cached: false }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-TTS-Provider": "google-fallback",
        },
      });
    } catch {
      return new Response(merged, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
          "X-TTS-Provider": "google-fallback-direct",
        },
      });
    }
  } catch (err) {
    console.error("[female-tts] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
