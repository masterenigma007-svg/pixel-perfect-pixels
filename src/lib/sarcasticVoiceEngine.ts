import type { Direction } from "@/data/translations";
import { preloadBrowserVoices, speakWithBrowserTts, type SpeechPlaybackHandle } from "@/lib/browserSarcasticTts";
import { prepareSpeechText } from "@/lib/speechTextUtils";

// ─── Main Speak Function ─────────────────────────────────────────

interface SpeakOptions {
  text: string;
  direction: Direction;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

let activePlayback: SpeechPlaybackHandle | null = null;
let playbackSessionId = 0;

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
    callback?.();
  };

  activePlayback = speakWithBrowserTts({
    text: processedText,
    direction,
    onStart,
    onEnd: () => finalizePlayback(onEnd),
    onError: (error) => finalizePlayback(() => onError?.(error)),
  });
}

export function stopSpeaking(): void {
  playbackSessionId += 1;

  if (activePlayback) {
    activePlayback.stop();
    activePlayback = null;
  }

  window.speechSynthesis.cancel();
}

export function isSpeechActive(): boolean {
  return Boolean(activePlayback) || window.speechSynthesis.speaking;
}

export function preloadVoices(): void {
  preloadBrowserVoices();
}

export function preloadOfflineFemaleVoice(): void {
  // No-op: female voice now uses the same browser TTS engine as the male voice.
}
