// Edge function: returns MP3 audio for a given text using a high-quality
// British female voice. Tries ElevenLabs first (studio-quality, sarcastic-friendly
// British female voice), and falls back to Google Translate's public TTS endpoint
// if ElevenLabs is unavailable, rate-limited, or out of credits.

// ElevenLabs voice: "Charlotte" — warm, expressive British female. Great for sarcasm.
const ELEVENLABS_VOICE_ID = "XB0fDUnXU5powFXDhCwa"; // Charlotte
const ELEVENLABS_MODEL_ID = "eleven_turbo_v2_5"; // Low-latency, high quality

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CHUNK = 190; // Google TTS endpoint limit per request

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
        // Hard-split very long sentence on word boundaries
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

async function fetchElevenLabs(text: string): Promise<Uint8Array | null> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: {
            // Lower stability + higher style = more expressive, sarcastic delivery
            stability: 0.35,
            similarity_boost: 0.8,
            style: 0.65,
            use_speaker_boost: true,
            speed: 0.96,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`ElevenLabs failed [${res.status}]: ${errText}`);
      return null;
    }

    return new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    console.warn("ElevenLabs request error:", err);
    return null;
  }
}

async function fetchChunk(text: string): Promise<Uint8Array> {
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&q=" +
    encodeURIComponent(text);
  const res = await fetch(url, {
    headers: {
      // Spoof a desktop UA — required, otherwise Google returns 403.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://translate.google.com/",
      "Accept": "audio/mpeg, */*",
    },
  });
  if (!res.ok) {
    throw new Error(`Upstream TTS failed: ${res.status}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  return buf;
}

function concatMp3(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
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
      return new Response(
        JSON.stringify({ error: "Missing 'text' string in body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Try ElevenLabs first — handles full text in one request (up to ~5000 chars).
    const elevenAudio = await fetchElevenLabs(text);
    if (elevenAudio && elevenAudio.length > 0) {
      return new Response(elevenAudio, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400",
          "X-TTS-Provider": "elevenlabs",
        },
      });
    }

    // Fallback: Google Translate TTS (chunked).
    const chunks = chunkText(text);
    if (!chunks.length) {
      return new Response(JSON.stringify({ error: "Empty text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffers: Uint8Array[] = [];
    for (const chunk of chunks) {
      audioBuffers.push(await fetchChunk(chunk));
    }
    const merged = concatMp3(audioBuffers);

    return new Response(merged, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("female-tts error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
