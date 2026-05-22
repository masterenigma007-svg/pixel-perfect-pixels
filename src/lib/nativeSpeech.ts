// Unified speech-to-text: uses the native Capacitor SpeechRecognition plugin on
// Android/iOS (the WebView's webkitSpeechRecognition is unreliable / unavailable on
// Android WebView) and falls back to the Web Speech API in the browser.
import { Capacitor } from "@capacitor/core";

export type SpeechResult = { transcript: string };
export type SpeechHandlers = {
  onResult: (r: SpeechResult) => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
};

export function isNative() {
  return Capacitor.isNativePlatform();
}

let webRecognition: any = null;

async function ensureNativePermission(): Promise<boolean> {
  const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
  try {
    const avail = await SpeechRecognition.available();
    if (!avail.available) return false;
  } catch {
    return false;
  }
  const perm = await SpeechRecognition.checkPermissions();
  if (perm.speechRecognition !== "granted") {
    const req = await SpeechRecognition.requestPermissions();
    if (req.speechRecognition !== "granted") return false;
  }
  return true;
}

export async function startSpeech(handlers: SpeechHandlers): Promise<void> {
  if (isNative()) {
    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
    const ok = await ensureNativePermission();
    if (!ok) {
      handlers.onError?.("Microphone permission denied. Enable it in app settings.");
      handlers.onEnd?.();
      return;
    }
    // Listen for partial/final results
    await SpeechRecognition.removeAllListeners();
    await SpeechRecognition.addListener("partialResults", (data: any) => {
      const t = data?.matches?.[0];
      if (t) handlers.onResult({ transcript: t });
    });
    try {
      await SpeechRecognition.start({
        language: "en-US",
        maxResults: 1,
        prompt: "Speak now",
        partialResults: true,
        popup: false,
      });
      handlers.onEnd?.();
    } catch (e: any) {
      handlers.onError?.(e?.message || "Speech recognition failed");
      handlers.onEnd?.();
    }
    return;
  }

  // Web fallback
  const SR =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    handlers.onError?.("Speech recognition not supported in this browser");
    handlers.onEnd?.();
    return;
  }
  webRecognition = new SR();
  webRecognition.continuous = false;
  webRecognition.interimResults = false;
  webRecognition.lang = "en-US";
  webRecognition.onresult = (e: any) => {
    handlers.onResult({ transcript: e.results[0][0].transcript });
  };
  webRecognition.onerror = (e: any) => handlers.onError?.(e?.error || "error");
  webRecognition.onend = () => handlers.onEnd?.();
  webRecognition.start();
}

export async function stopSpeech(): Promise<void> {
  if (isNative()) {
    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
    try {
      await SpeechRecognition.stop();
    } catch {}
    return;
  }
  if (webRecognition) {
    try { webRecognition.stop(); } catch {}
  }
}
