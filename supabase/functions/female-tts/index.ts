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
        lang: "Amy",
        source: "ttsmp3",
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.warn(`[female-tts] ttsmp3 create ${createRes.status}: ${errText}`);
      return null;
    }

    const payload = await createRes.json() as { Error?: number; URL?: string; MP3?: string };
    const mp3Url = payload.URL?.replace(/\\\//g, "/") ?? (payload.MP3 ? `https://ttsmp3.com/created_mp3/${payload.MP3}` : null);
    if (payload.Error || !mp3Url) {
      console.warn("[female-tts] ttsmp3 missing audio URL", payload);
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
      console.warn(`[female-tts] ttsmp3 audio ${audioRes.status}: ${errText}`);
      return null;
    }

    return new Uint8Array(await audioRes.arrayBuffer());
  } catch (err) {
    console.warn("[female-tts] ttsmp3 exception:", err);
    return null;
  }
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

    const hash = await sha256Hex(`female:british-v2:${text}`);
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

    // Provider chain: ElevenLabs (Lily, premium British female) → ttsmp3 Amy.
    const providers: Array<{ name: string; fn: () => Promise<Uint8Array | null> }> = [
      { name: "elevenlabs", fn: () => fetchElevenLabs(text) },
      { name: "ttsmp3-amy", fn: () => fetchTtsMp3(text) },
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
    throw new Error("Female British TTS generation failed");
  } catch (err) {
    console.error("[female-tts] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
