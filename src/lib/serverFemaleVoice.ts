import type { SpeechPlaybackHandle } from "@/lib/browserSarcasticTts";
import { supabase } from "@/integrations/supabase/client";

interface ServerFemaleSpeakOptions {
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

let audioContext: AudioContext | null = null;
const audioCache = new Map<string, ArrayBuffer>();
const urlCache = new Map<string, string>();

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }
  return audioContext;
}

async function fetchFemaleAudio(text: string): Promise<ArrayBuffer> {
  const cached = audioCache.get(text);
  if (cached) return cached.slice(0);

  // 1. Resolve the public CDN URL (cached server-side after first generation)
  let url = urlCache.get(text);
  if (!url) {
    const { data, error } = await supabase.functions.invoke("female-tts", {
      body: { text },
    });
    if (error) throw error;
    const payload = data as { url?: string } | null;
    if (!payload?.url) throw new Error("Missing audio URL in TTS response");
    url = payload.url;
    urlCache.set(text, url);
  }

  // 2. Stream the MP3 from the public bucket (CDN, fast)
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);
  const buffer = await res.arrayBuffer();

  if (audioCache.size > 30) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey) audioCache.delete(firstKey);
  }
  audioCache.set(text, buffer.slice(0));
  return buffer;
}

export async function speakWithServerFemaleVoice(
  options: ServerFemaleSpeakOptions
): Promise<SpeechPlaybackHandle | null> {
  const { text, onStart, onEnd, onError } = options;
  if (!text) return null;

  const ctx = getAudioContext();
  let stopped = false;
  let source: AudioBufferSourceNode | null = null;

  const cleanup = () => {
    if (source) {
      try {
        source.disconnect();
      } catch {
        // noop
      }
      source.onended = null;
      source = null;
    }
  };

  const handle: SpeechPlaybackHandle = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try {
        source?.stop();
      } catch {
        // noop
      }
      cleanup();
    },
  };

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const buffer = await fetchFemaleAudio(text);
    if (stopped) return handle;

    const audioBuffer = await ctx.decodeAudioData(buffer);
    if (stopped) return handle;

    source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    // Slightly slower playback for a more deliberate, sarcastic cadence.
    source.playbackRate.value = 0.96;
    source.connect(ctx.destination);
    source.onended = () => {
      cleanup();
      if (!stopped) onEnd?.();
    };

    onStart?.();
    source.start(0);
    return handle;
  } catch (error) {
    cleanup();
    if (!stopped) onError?.(error);
    return null;
  }
}
