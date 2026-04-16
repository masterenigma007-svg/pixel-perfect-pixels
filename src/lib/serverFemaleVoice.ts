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

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }
  return audioContext;
}

async function fetchFemaleAudio(text: string): Promise<ArrayBuffer> {
  const cached = audioCache.get(text);
  if (cached) return cached.slice(0);

  const { data, error } = await supabase.functions.invoke("female-tts", {
    body: { text },
  });

  if (error) throw error;
  if (!(data instanceof Blob)) {
    throw new Error("Unexpected TTS response");
  }
  const buffer = await data.arrayBuffer();
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
