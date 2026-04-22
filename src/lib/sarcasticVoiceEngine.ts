import type { Direction } from "@/data/translations";
import { preloadBrowserVoices, speakWithBrowserTts, type SpeechPlaybackHandle } from "@/lib/browserSarcasticTts";
import { prepareSpeechText } from "@/lib/speechTextUtils";
import { supabase } from "@/integrations/supabase/client";

// ─── Main Speak Function ─────────────────────────────────────────

interface SpeakOptions {
  text: string;
  direction: Direction;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

let activePlayback: SpeechPlaybackHandle | null = null;
let activeAudio: HTMLAudioElement | null = null;
let playbackSessionId = 0;

function speakWithEdgeFunction(
  functionName: string,
  text: string,
  direction: Direction,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: unknown) => void
): SpeechPlaybackHandle {
  let stopped = false;
  let audio: HTMLAudioElement | null = null;

  (async () => {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { text },
      });
      if (stopped) return;
      if (error) throw error;

      const url: string | undefined = (data as { url?: string })?.url;
      if (!url) throw new Error("No audio URL returned");

      audio = new Audio(url);
      activeAudio = audio;
      audio.onplay = () => {
        if (!stopped) onStart?.();
      };
      audio.onended = () => {
        if (!stopped) onEnd?.();
      };
      audio.onerror = (e) => {
        if (!stopped) {
          // Fallback to browser TTS on playback error
          activePlayback = speakWithBrowserTts({ text, direction, onStart, onEnd, onError });
        }
      };
      await audio.play();
    } catch (err) {
      if (stopped) return;
      console.warn("[voice] Edge TTS failed, falling back to browser TTS", err);
      activePlayback = speakWithBrowserTts({ text, direction, onStart, onEnd, onError });
    }
  })();

  return {
    stop: () => {
      stopped = true;
      if (audio) {
        audio.pause();
        audio.src = "";
        audio = null;
      }
      activeAudio = null;
    },
  };
}

export function speakSarcastic(options: SpeakOptions): void {
  const { text, direction, onStart, onEnd, onError } = options;
  if (!text) return;

  stopSpeaking();

  const processedText = prepareSpeechText(text);
  if (!processedText) return;

  const sessionId = ++playbackSessionId;

  const finalizePlayback = (callback?: () => void) => {
    if (sessionId !== playbackSessionId) return;
    activePlayback = null;
    activeAudio = null;
    callback?.();
  };

  const edgeFunctionName = direction === "menToWomen" ? "female-tts" : "male-tts";

  activePlayback = speakWithEdgeFunction(
    edgeFunctionName,
    processedText,
    direction,
    onStart,
    () => finalizePlayback(onEnd),
    (error) => finalizePlayback(() => onError?.(error)),
  );
}

export function stopSpeaking(): void {
  playbackSessionId += 1;

  if (activePlayback) {
    activePlayback.stop();
    activePlayback = null;
  }

  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }

  window.speechSynthesis.cancel();
}

export function isSpeechActive(): boolean {
  return Boolean(activePlayback) || Boolean(activeAudio) || window.speechSynthesis.speaking;
}

export function preloadVoices(): void {
  preloadBrowserVoices();
}

export function preloadOfflineFemaleVoice(): void {
  // No-op: voices use cloud TTS functions with browser TTS fallback.
}
