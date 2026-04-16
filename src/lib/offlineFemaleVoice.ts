import type { SpeechPlaybackHandle } from "@/lib/browserSarcasticTts";
import type { KokoroTTS } from "kokoro-js";

interface OfflineFemaleSpeakOptions {
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const FEMALE_VOICE = "af_bella" as const;
const FEMALE_SPEED = 0.94;

let audioContext: AudioContext | null = null;
let kokoroPromise: Promise<KokoroTTS> | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }

  return audioContext;
}

async function getFemaleVoiceEngine() {
  if (!kokoroPromise) {
    kokoroPromise = import("kokoro-js").then(({ KokoroTTS }) =>
      KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: "q8",
        device: "wasm",
      })
    );
  }

  return kokoroPromise;
}

export function preloadOfflineFemaleVoice(): void {
  void getFemaleVoiceEngine().catch(() => {
    kokoroPromise = null;
  });
}

export async function speakWithOfflineFemaleVoice(
  options: OfflineFemaleSpeakOptions
): Promise<SpeechPlaybackHandle | null> {
  const { text, onStart, onEnd, onError } = options;
  if (!text) return null;

  const ctx = getAudioContext();
  let stopped = false;
  let source: AudioBufferSourceNode | null = null;

  const cleanup = () => {
    if (source) {
      source.disconnect();
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

    const tts = await getFemaleVoiceEngine();
    if (stopped) return handle;

    const generatedAudio = await tts.generate(text, {
      voice: FEMALE_VOICE,
      speed: FEMALE_SPEED,
    });
    if (stopped) return handle;

    const audioBlob = await Promise.resolve(generatedAudio.toBlob());
    const audioBuffer = await ctx.decodeAudioData(await audioBlob.arrayBuffer());
    if (stopped) return handle;

    source = ctx.createBufferSource();
    source.buffer = audioBuffer;
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