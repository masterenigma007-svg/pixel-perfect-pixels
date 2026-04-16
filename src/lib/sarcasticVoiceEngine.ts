/**
 * Sarcastic Voice Engine
 *
 * Enhances browser speechSynthesis with:
 * - Gender-correct voice selection (female for Men→Women, male for Women→Men)
 * - Sarcastic delivery: dramatic pauses, pitch contour, vowel stretching
 * - Per-chunk pitch/rate variation for natural human prosody (no monotone)
 * - Web Audio warmth/presence chain
 */

import type { Direction } from "@/data/translations";

// ─── Voice Selection ─────────────────────────────────────────────

const FEMALE_NAMES = [
  "microsoft jenny", "microsoft zira", "google uk english female",
  "samantha", "victoria", "karen", "tessa", "fiona", "moira",
  "alice", "hazel", "susan", "jenny", "aria", "ava", "serena", "emma",
];

const MALE_NAMES = [
  "microsoft ryan", "microsoft george", "microsoft david", "microsoft mark",
  "google uk english male", "male", "daniel", "alex", "tom", "james",
  "david", "mark", "fred", "guy", "reed", "aaron", "arthur",
  "oliver", "brian", "thomas", "george", "ryan",
];

const BRITISH_MALE_NAMES = [
  "google uk english male", "microsoft ryan", "microsoft george",
  "daniel", "oliver", "arthur", "thomas", "george", "ryan",
];

const PREMIUM_KEYWORDS = [
  "natural", "neural", "online", "premium", "enhanced", "google", "siri",
];

const ROBOTIC_KEYWORDS = [
  "espeak", "compact", "synth", "festival", "classic", "old", "legacy",
];

function scoreVoice(voice: SpeechSynthesisVoice, direction: Direction, targetNames: string[]): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  const preferBritishMale = direction === "womenToMen";

  let score = 0;
  if (targetNames.some((n) => name.includes(n))) score += 10;
  if (PREMIUM_KEYWORDS.some((k) => name.includes(k))) score += 5;
  if (voice.localService) score += 2;
  if (voice.default) score += 1;

  if (preferBritishMale) {
    if (lang.startsWith("en-gb") || lang.startsWith("en-uk")) score += 14;
    if (BRITISH_MALE_NAMES.some((n) => name.includes(n))) score += 10;
  } else if (lang.startsWith("en-us")) {
    score += 2;
  }

  if (ROBOTIC_KEYWORDS.some((k) => name.includes(k))) score -= 12;
  return score;
}

function selectVoice(direction: Direction): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const wantFemale = direction === "menToWomen";
  const targetNames = wantFemale ? FEMALE_NAMES : MALE_NAMES;
  const oppositeNames = wantFemale ? MALE_NAMES : FEMALE_NAMES;

  const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));

  const candidates = englishVoices.filter((v) => {
    const name = v.name.toLowerCase();
    return !oppositeNames.some((o) => name.includes(o));
  });

  const scored = candidates
    .map((v) => ({ voice: v, score: scoreVoice(v, direction, targetNames) }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.voice || englishVoices[0] || voices[0] || null;
}

// ─── Sarcastic Text Processing ───────────────────────────────────

/**
 * If the UI output contains a generic wrapper like:
 *   "original phrase" — Translation: actual translation
 * only the actual translation should be spoken.
 */
function extractSpokenText(text: string): string {
  const match = text.match(/[—-]\s*Translation\s*:\s*(.+)$/i);
  return match?.[1]?.trim() || text.trim();
}

/**
 * Cleans text for TTS without altering wording.
 * - Strips characters some engines vocalize (asterisks, brackets, quotes, etc.)
 * - Normalizes whitespace
 * - Does NOT add or change any words — only the translation is spoken.
 */
function applySarcasticProsody(text: string): string {
  return text
    .replace(/["'“”‘’*_`~<>[\](){}]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Voice Parameter Profiles ────────────────────────────────────

interface VoiceProfile {
  rate: number;
  pitch: number;
  volume: number;
}

function getSarcasticProfile(direction: Direction): VoiceProfile {
  if (direction === "menToWomen") {
    return { rate: 0.92, pitch: 1.12, volume: 1.0 };
  }
  // Male British-leaning sarcastic delivery:
  // - rate 0.9 = unhurried, dry
  // - pitch 1.05 sits just above the engine's lowest register (which always
  //   sounds robotic) so it reads as a natural baritone, not synthesized bass.
  return { rate: 0.9, pitch: 1.05, volume: 1.0 };
}

/**
 * Split into natural clauses. The male voice keeps the full sentence as a
 * single utterance — punctuation is preserved so the engine generates real
 * intonation and pauses instead of monotone speech.
 */
function chunkForProsody(text: string, direction: Direction): string[] {
  if (direction === "womenToMen") {
    return [text.trim()].filter(Boolean);
  }

  return text
    .split(/[.!?;,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

// ─── Web Audio Processing ────────────────────────────────────────

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function createVoiceProcessingChain(ctx: AudioContext, direction: Direction) {
  const warmth = ctx.createBiquadFilter();
  warmth.type = "peaking";
  warmth.frequency.value = direction === "menToWomen" ? 400 : 250;
  warmth.gain.value = 3.0;
  warmth.Q.value = 1.0;

  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = direction === "menToWomen" ? 3200 : 2500;
  presence.gain.value = 4.0;
  presence.Q.value = 1.5;

  const air = ctx.createBiquadFilter();
  air.type = "highshelf";
  air.frequency.value = 6000;
  air.gain.value = 2.0;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;

  warmth.connect(presence);
  presence.connect(air);
  air.connect(compressor);
  compressor.connect(ctx.destination);

  return { input: warmth };
}

// ─── Main Speak Function ─────────────────────────────────────────

interface SpeakOptions {
  text: string;
  direction: Direction;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

let activeChain: { stop: () => void } | null = null;

export function speakSarcastic(options: SpeakOptions): void {
  const { text, direction, onStart, onEnd, onError } = options;
  if (!text) return;

  stopSpeaking();

  const spokenOnly = extractSpokenText(text);
  const processedText = applySarcasticProsody(spokenOnly);
  const chunks = chunkForProsody(processedText, direction);
  const profile = getSarcasticProfile(direction);
  const voice = selectVoice(direction);

  if (!chunks.length) return;

  let stopped = false;
  let started = false;

  activeChain = {
    stop: () => {
      stopped = true;
    },
  };

  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    createVoiceProcessingChain(ctx, direction);
  } catch {
    /* noop */
  }

  chunks.forEach((chunkText, index) => {
    const utterance = new SpeechSynthesisUtterance(chunkText);
    const position = index / Math.max(1, chunks.length - 1);
    const arc = Math.sin(position * Math.PI);
    const isLast = index === chunks.length - 1;
    const useSteadyMaleDelivery = direction === "womenToMen";

    const pitchAdjust = useSteadyMaleDelivery
      ? 0
      : (isLast ? -0.08 : arc * 0.08 + (Math.random() - 0.5) * 0.04);
    const rateAdjust = useSteadyMaleDelivery
      ? 0
      : (Math.random() - 0.5) * 0.04;

    utterance.volume = profile.volume;
    utterance.pitch = Math.max(0.1, Math.min(2, profile.pitch + pitchAdjust));
    utterance.rate = Math.max(0.5, Math.min(1.4, profile.rate + rateAdjust));

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = direction === "womenToMen" ? "en-GB" : "en-US";
    }

    utterance.onstart = () => {
      if (!started && !stopped) {
        started = true;
        onStart?.();
      }
    };

    utterance.onend = () => {
      if (stopped) return;
      if (index === chunks.length - 1) {
        activeChain = null;
        onEnd?.();
      }
    };

    utterance.onerror = (e) => {
      activeChain = null;
      onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (activeChain) {
    activeChain.stop();
    activeChain = null;
  }
  window.speechSynthesis.cancel();
}

export function isSpeechActive(): boolean {
  return window.speechSynthesis.speaking;
}

export function preloadVoices(): void {
  window.speechSynthesis.getVoices();
}
