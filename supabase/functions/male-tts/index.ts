// Edge function: returns MP3 audio of a HUMAN BRITISH MALE voice.
// Primary: ElevenLabs "George" (warm, dry British male, sarcastic-ready).
// Fallbacks: Google Translate TTS (en-GB) — single voice but reliably human.
// Audio is cached in Supabase Storage (tts-cache bucket) keyed by direction + text hash.

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

// George — warm, dry British male (sarcastic-ready)
const ELEVEN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const ELEVEN_MODEL = "eleven_multilingual_v2";

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

async function fetchElevenLabs(text: string): Promise<Uint8Array | null> {
  if (!ELEVENLABS_API_KEY) {
    console.warn("[male-tts] ELEVENLABS_API_KEY not set");
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
            stability: 0.5,
            similarity_boost: 0.85,
            style: 0.5,
            use_speaker_boost: true,
            speed: 0.95,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[male-tts] ElevenLabs ${res.status}: ${errText}`);
      return null;
    }

    return new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    console.warn("[male-tts] ElevenLabs exception:", err);
    return null;
  }
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

async function fetchTtsMp3(text: string): Promise<Uint8Array | null> {
  try {
    const createRes = await fetch("https://ttsmp3.com/makemp3_new.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://ttsmp3.com/",
        Accept: "application/json, text/plain, */*",
      },
      body: new URLSearchParams({
        msg: text,
        lang: "Brian",
        source: "ttsmp3",
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.warn(`[male-tts] ttsmp3 create ${createRes.status}: ${errText}`);
      return null;
    }

    const payload = await createRes.json() as { Error?: number; URL?: string; MP3?: string };
    const mp3Url = payload.URL?.replace(/\\\//g, "/") ?? (payload.MP3 ? `https://ttsmp3.com/created_mp3/${payload.MP3}` : null);
    if (payload.Error || !mp3Url) {
      console.warn("[male-tts] ttsmp3 missing audio URL", payload);
      return null;
    }

    const audioRes = await fetch(mp3Url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://ttsmp3.com/",
        Accept: "audio/mpeg, */*",
      },
    });

    if (!audioRes.ok) {
      const errText = await audioRes.text();
      console.warn(`[male-tts] ttsmp3 audio ${audioRes.status}: ${errText}`);
      return null;
    }

    return new Uint8Array(await audioRes.arrayBuffer());
  } catch (err) {
    console.warn("[male-tts] ttsmp3 exception:", err);
    return null;
  }
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

    const hash = await sha256Hex(`male:british-v2:${text}`);
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

    // Primary: ElevenLabs George (premium British male)
    const elevenAudio = await fetchElevenLabs(text);
    if (elevenAudio && elevenAudio.length > 0) {
      console.log(`[male-tts] elevenlabs success: ${elevenAudio.length} bytes`);
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
      } catch {
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

    console.warn("[male-tts] ElevenLabs failed; using ttsmp3 Brian fallback");
    const fallbackAudio = await fetchTtsMp3(text);
    if (!fallbackAudio || fallbackAudio.length === 0) {
      throw new Error("Male British TTS generation failed");
    }

    console.log(`[male-tts] ttsmp3 success: ${fallbackAudio.length} bytes`);
    try {
      await cachePut(path, fallbackAudio);
      return new Response(JSON.stringify({ url, cached: false }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-TTS-Provider": "ttsmp3-brian",
        },
      });
    } catch {
      return new Response(fallbackAudio, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
          "X-TTS-Provider": "ttsmp3-brian-direct",
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
