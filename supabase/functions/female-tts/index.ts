// Edge function: returns MP3 audio for a given text using Microsoft Edge TTS.
// Voice: en-GB-SoniaNeural — expressive British female. Free, no API key,
// no quota. Falls back to Google Translate's public TTS if Edge TTS fails.

const EDGE_VOICE = "Microsoft Server Speech Text to Speech Voice (en-GB, SoniaNeural)";
// Sarcastic-friendly prosody: slightly slower, slightly lower pitch, more expressive.
const EDGE_RATE = "-6%";
const EDGE_PITCH = "-2%";
const EDGE_STYLE = "newscast"; // Sonia supports: cheerful, sad, angry, newscast, etc.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CHUNK = 190; // Google TTS endpoint limit per request (fallback only)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "tts-cache";

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

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft Edge TTS (free, no API key, neural voices)
// ─────────────────────────────────────────────────────────────────────────────

const TRUSTED_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

function uuid(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function buildSSML(text: string): string {
  // Escape XML special chars in the text
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  return (
    `<speak version='1.0' xml:lang='en-GB' xmlns='http://www.w3.org/2001/10/synthesis' ` +
    `xmlns:mstts='https://www.w3.org/2001/mstts'>` +
    `<voice name='${EDGE_VOICE}'>` +
    `<mstts:express-as style='${EDGE_STYLE}' styledegree='1.5'>` +
    `<prosody rate='${EDGE_RATE}' pitch='${EDGE_PITCH}'>${safe}</prosody>` +
    `</mstts:express-as>` +
    `</voice></speak>`
  );
}

async function fetchEdgeTts(text: string): Promise<Uint8Array | null> {
  return await new Promise((resolve) => {
    try {
      const connectionId = uuid();
      const wsUrl =
        `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1` +
        `?TrustedClientToken=${TRUSTED_TOKEN}` +
        `&ConnectionId=${connectionId}`;

      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";

      const audioChunks: Uint8Array[] = [];
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        console.warn("[female-tts] Edge TTS timeout");
        try { ws.close(); } catch { /* noop */ }
        resolve(null);
      }, 15000);

      const finish = (result: Uint8Array | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { ws.close(); } catch { /* noop */ }
        resolve(result);
      };

      ws.onopen = () => {
        const now = new Date().toISOString();
        // 1. Speech config
        const config =
          `X-Timestamp:${now}\r\n` +
          `Content-Type:application/json; charset=utf-8\r\n` +
          `Path:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: "false",
                    wordBoundaryEnabled: "false",
                  },
                  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
                },
              },
            },
          });
        ws.send(config);

        // 2. SSML request
        const ssml = buildSSML(text);
        const ssmlMsg =
          `X-RequestId:${connectionId}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${now}\r\n` +
          `Path:ssml\r\n\r\n${ssml}`;
        ws.send(ssmlMsg);
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          if (event.data.includes("Path:turn.end")) {
            // Concatenate chunks
            const total = audioChunks.reduce((n, c) => n + c.length, 0);
            if (total === 0) {
              finish(null);
              return;
            }
            const out = new Uint8Array(total);
            let offset = 0;
            for (const c of audioChunks) {
              out.set(c, offset);
              offset += c.length;
            }
            finish(out);
          }
        } else {
          // Binary frame: header (text) + 0x00 + audio bytes
          // Format: 2 bytes (header length BE) + header + audio
          const buf = new Uint8Array(event.data as ArrayBuffer);
          if (buf.length < 2) return;
          const headerLen = (buf[0] << 8) | buf[1];
          const audioStart = 2 + headerLen;
          if (audioStart >= buf.length) return;
          audioChunks.push(buf.slice(audioStart));
        }
      };

      ws.onerror = (err) => {
        console.warn("[female-tts] Edge TTS ws error:", err);
        finish(null);
      };

      ws.onclose = () => {
        if (!settled) {
          // Closed before turn.end — finalize with whatever we have
          const total = audioChunks.reduce((n, c) => n + c.length, 0);
          if (total > 0) {
            const out = new Uint8Array(total);
            let offset = 0;
            for (const c of audioChunks) {
              out.set(c, offset);
              offset += c.length;
            }
            finish(out);
          } else {
            finish(null);
          }
        }
      };
    } catch (err) {
      console.warn("[female-tts] Edge TTS exception:", err);
      resolve(null);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Translate TTS fallback (chunked, public endpoint)
// ─────────────────────────────────────────────────────────────────────────────

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
      "Referer": "https://translate.google.com/",
      "Accept": "audio/mpeg, */*",
    },
  });
  if (!res.ok) throw new Error(`Google TTS failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
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

// ─────────────────────────────────────────────────────────────────────────────
// HTTP handler
// ─────────────────────────────────────────────────────────────────────────────

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

    // ── 1. Cache check ─────────────────────────────────────────────
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
    console.log(`[female-tts] cache MISS ${hash.slice(0, 8)}`);

    // ── 2. Generate ────────────────────────────────────────────────
    // Try Microsoft Edge TTS first — neural Sonia voice, much more human.
    console.log(`[female-tts] Trying Edge TTS for ${text.length} chars`);
    const edgeAudio = await fetchEdgeTts(text);
    if (edgeAudio && edgeAudio.length > 0) {
      console.log(`[female-tts] Edge TTS success: ${edgeAudio.length} bytes`);
      try {
        await cachePut(path, edgeAudio);
        return new Response(JSON.stringify({ url, cached: false }), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-TTS-Provider": "edge-tts",
          },
        });
      } catch (cacheError) {
        console.warn("[female-tts] Edge audio generated but cache upload failed", cacheError);
        return new Response(edgeAudio, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
            "X-TTS-Provider": "edge-tts-direct",
          },
        });
      }
    }

    console.warn("[female-tts] Edge TTS failed; using direct Google fallback audio");

    // Fallback: Google Translate TTS
    const chunks = chunkText(text);
    if (!chunks.length) {
      return new Response(JSON.stringify({ error: "Empty text" }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-TTS-Provider": "edge-tts",
        },
      });
    }
    const audioBuffers: Uint8Array[] = [];
    for (const chunk of chunks) {
      audioBuffers.push(await fetchGoogleChunk(chunk));
    }
    const merged = concatMp3(audioBuffers);
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
    } catch (cacheError) {
      console.warn("[female-tts] Google fallback cache upload failed", cacheError);
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
