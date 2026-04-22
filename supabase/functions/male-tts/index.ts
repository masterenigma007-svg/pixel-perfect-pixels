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
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const BUCKET = "tts-cache";

// Lily — warm British female voice (genuinely human, slightly sarcastic-ready)
const ELEVEN_VOICE_ID = "pFZP5JQG7iQjIQuC4Bku";
// Multilingual v2 = highest quality / most human (worth the small latency cost)
const ELEVEN_MODEL = "eleven_multilingual_v2";

// Lovable AI Gateway → OpenAI TTS (free during promo, no extra key needed)
// "shimmer" = warm, expressive female; great for sarcastic delivery
const LOVABLE_TTS_URL = "https://ai.gateway.lovable.dev/v1/audio/speech";
const LOVABLE_TTS_MODEL = "gpt-4o-mini-tts";
const LOVABLE_TTS_VOICE = "shimmer";

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

// ── Lovable AI Gateway (OpenAI TTS, free, no extra key) ──────
async function fetchLovableTts(text: string): Promise<Uint8Array | null> {
  if (!LOVABLE_API_KEY) {
    console.warn("[female-tts] LOVABLE_API_KEY not set");
    return null;
  }
  try {
    const res = await fetch(LOVABLE_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        model: LOVABLE_TTS_MODEL,
        voice: LOVABLE_TTS_VOICE,
        input: text,
        response_format: "mp3",
        // Slightly slower for deliberate, sardonic cadence
        speed: 0.95,
        // Steer the delivery toward warm, knowing sarcasm
        instructions:
          "Speak in a warm, witty, knowingly sarcastic female voice. Slightly amused, like you're gently teasing a partner. Natural human inflection, not robotic. Conversational pacing with subtle dry humor.",
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[female-tts] Lovable TTS ${res.status}: ${errText}`);
      return null;
    }
    return new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    console.warn("[female-tts] Lovable TTS exception:", err);
    return null;
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
            stability: 0.45,
            similarity_boost: 0.85,
            style: 0.55,
            use_speaker_boost: true,
            speed: 0.95,
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

// ── VoiceRSS (FREE demo key, no signup, real human voices) ────
// "Linda" = warm American female. Limit ~350 chars per call on demo key,
// so we chunk and concatenate.
const VOICERSS_MAX = 300;

function chunkForVoiceRss(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= VOICERSS_MAX) return [clean];
  const parts: string[] = [];
  const sentences = clean.match(/[^.!?]+[.!?]?/g) ?? [clean];
  let current = "";
  for (const s of sentences) {
    const t = s.trim();
    if (!t) continue;
    if ((current + " " + t).trim().length <= VOICERSS_MAX) {
      current = (current ? current + " " : "") + t;
    } else {
      if (current) parts.push(current);
      current = t.length <= VOICERSS_MAX ? t : t.slice(0, VOICERSS_MAX);
    }
  }
  if (current) parts.push(current);
  return parts;
}

async function fetchVoiceRssChunk(text: string): Promise<Uint8Array | null> {
  try {
    const url =
      "https://api.voicerss.org/?key=demo&hl=en-us&v=Linda&c=MP3&f=44khz_16bit_stereo&r=-2&src=" +
      encodeURIComponent(text);
    const res = await fetch(url, {
      headers: { Accept: "audio/mpeg, */*" },
    });
    if (!res.ok) {
      console.warn(`[female-tts] VoiceRSS ${res.status}`);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    // VoiceRSS returns text errors with 200 status sometimes
    if (buf.length < 500) {
      const txt = new TextDecoder().decode(buf);
      console.warn(`[female-tts] VoiceRSS suspicious payload: ${txt}`);
      return null;
    }
    return buf;
  } catch (err) {
    console.warn("[female-tts] VoiceRSS exception:", err);
    return null;
  }
}

async function fetchVoiceRss(text: string): Promise<Uint8Array | null> {
  const chunks = chunkForVoiceRss(text);
  if (!chunks.length) return null;
  const buffers: Uint8Array[] = [];
  for (const c of chunks) {
    const buf = await fetchVoiceRssChunk(c);
    if (!buf) return null;
    buffers.push(buf);
  }
  return concat(buffers);
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

    // Provider chain: ElevenLabs (Lily, premium British female) → Lovable AI (shimmer)
    // → VoiceRSS demo → Google fallback. ElevenLabs is the most human option.
    const providers: Array<{ name: string; fn: () => Promise<Uint8Array | null> }> = [
      { name: "elevenlabs", fn: () => fetchElevenLabs(text) },
      { name: "lovable", fn: () => fetchLovableTts(text) },
      { name: "voicerss", fn: () => fetchVoiceRss(text) },
    ];

    for (const provider of providers) {
      const audio = await provider.fn();
      if (audio && audio.length > 0) {
        console.log(`[female-tts] ${provider.name} success: ${audio.length} bytes`);
        try {
          await cachePut(path, audio);
          return new Response(JSON.stringify({ url, cached: false }), {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-TTS-Provider": provider.name,
            },
          });
        } catch (cacheError) {
          console.warn(`[female-tts] ${provider.name} cache failed; streaming direct`, cacheError);
          return new Response(audio, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
              "X-TTS-Provider": `${provider.name}-direct`,
            },
          });
        }
      }
    }

    console.warn("[female-tts] All premium providers failed; using Google fallback");
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
