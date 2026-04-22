// Edge function: returns MP3 audio for a given text using premium male TTS.
// Primary: Lovable AI Gateway/OpenAI TTS with a human British male delivery.
// Falls back to VoiceRSS, then Google Translate if premium providers fail.
// Audio is cached in Supabase Storage (tts-cache bucket) keyed by direction + text hash.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CHUNK = 190;
const VOICERSS_MAX = 300;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const BUCKET = "tts-cache";

const LOVABLE_TTS_URL = "https://ai.gateway.lovable.dev/v1/audio/speech";
const LOVABLE_TTS_MODEL = "gpt-4o-mini-tts";
const LOVABLE_TTS_VOICE = "onyx";

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
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "audio/mpeg",
      "x-upsert": "true",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: audio,
  });

  if (!res.ok) {
    const message = await res.text();
    console.warn(`[male-tts] cache upload failed ${res.status}: ${message}`);
    throw new Error(`Cache upload failed: ${res.status}`);
  }
}

async function fetchLovableTts(text: string): Promise<Uint8Array | null> {
  if (!LOVABLE_API_KEY) {
    console.warn("[male-tts] LOVABLE_API_KEY not set");
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
        speed: 0.95,
        instructions:
          "Speak in a human-sounding British male voice with dry, witty sarcasm. Calm, amused, and conversational, like a clever partner making a knowing remark. Natural inflection, not robotic. Keep the cadence slightly deliberate and expressive.",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[male-tts] Lovable TTS ${res.status}: ${errText}`);
      return null;
    }

    return new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    console.warn("[male-tts] Lovable TTS exception:", err);
    return null;
  }
}

function chunkForVoiceRss(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= VOICERSS_MAX) return [clean];

  const parts: string[] = [];
  const sentences = clean.match(/[^.!?]+[.!?]?/g) ?? [clean];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((current + " " + trimmed).trim().length <= VOICERSS_MAX) {
      current = (current ? current + " " : "") + trimmed;
    } else {
      if (current) parts.push(current);
      current = trimmed.length <= VOICERSS_MAX ? trimmed : trimmed.slice(0, VOICERSS_MAX);
    }
  }

  if (current) parts.push(current);
  return parts;
}

async function fetchVoiceRssChunk(text: string): Promise<Uint8Array | null> {
  try {
    const url =
      "https://api.voicerss.org/?key=demo&hl=en-gb&v=John&c=MP3&f=44khz_16bit_stereo&r=-2&src=" +
      encodeURIComponent(text);
    const res = await fetch(url, {
      headers: { Accept: "audio/mpeg, */*" },
    });

    if (!res.ok) {
      console.warn(`[male-tts] VoiceRSS ${res.status}`);
      return null;
    }

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 500) {
      const txt = new TextDecoder().decode(buf);
      console.warn(`[male-tts] VoiceRSS suspicious payload: ${txt}`);
      return null;
    }

    return buf;
  } catch (err) {
    console.warn("[male-tts] VoiceRSS exception:", err);
    return null;
  }
}

async function fetchVoiceRss(text: string): Promise<Uint8Array | null> {
  const chunks = chunkForVoiceRss(text);
  if (!chunks.length) return null;

  const buffers: Uint8Array[] = [];
  for (const chunk of chunks) {
    const buf = await fetchVoiceRssChunk(chunk);
    if (!buf) return null;
    buffers.push(buf);
  }

  return concat(buffers);
}

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= MAX_CHUNK) return [clean];

  const parts: string[] = [];
  const sentences = clean.match(/[^.!?]+[.!?]?/g) ?? [clean];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((current + " " + trimmed).trim().length <= MAX_CHUNK) {
      current = (current ? current + " " : "") + trimmed;
    } else {
      if (current) parts.push(current);
      if (trimmed.length <= MAX_CHUNK) {
        current = trimmed;
      } else {
        const words = trimmed.split(" ");
        let buffer = "";
        for (const word of words) {
          if ((buffer + " " + word).trim().length <= MAX_CHUNK) {
            buffer = (buffer ? buffer + " " : "") + word;
          } else {
            if (buffer) parts.push(buffer);
            buffer = word;
          }
        }
        current = buffer;
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
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'text' string in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hash = await sha256Hex(`male:${text}`);
    const path = `${hash}.mp3`;
    const url = publicUrlFor(path);

    if (await cacheHas(path)) {
      console.log(`[male-tts] cache HIT ${hash.slice(0, 8)}`);
      return new Response(JSON.stringify({ url, cached: true }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-TTS-Cache": "hit",
        },
      });
    }

    console.log(`[male-tts] cache MISS ${hash.slice(0, 8)} — generating`);

    const providers: Array<{ name: string; fn: () => Promise<Uint8Array | null> }> = [
      { name: "lovable", fn: () => fetchLovableTts(text) },
      { name: "voicerss", fn: () => fetchVoiceRss(text) },
    ];

    for (const provider of providers) {
      const audio = await provider.fn();
      if (audio && audio.length > 0) {
        console.log(`[male-tts] ${provider.name} success: ${audio.length} bytes`);
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
          console.warn(`[male-tts] ${provider.name} cache failed; streaming direct`, cacheError);
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

    console.warn("[male-tts] All premium providers failed; using Google fallback");
    const chunks = chunkText(text);
    if (!chunks.length) {
      return new Response(JSON.stringify({ error: "Empty text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buffers: Uint8Array[] = [];
    for (const chunk of chunks) buffers.push(await fetchGoogleChunk(chunk));
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
    console.error("[male-tts] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
