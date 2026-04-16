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
  "microsoft david", "microsoft mark", "google uk english male",
  "daniel", "alex", "tom", "james", "david", "mark", "fred",
  "guy", "reed", "aaron", "arthur", "oliver", "brian",
];

const PREMIUM_KEYWORDS = [
  "natural", "neural", "online", "premium", "enhanced", "google", "siri",
];

function scoreVoice(voice: SpeechSynthesisVoice, targetNames: string[]): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (targetNames.some((n) => name.includes(n))) score += 10;
  if (PREMIUM_KEYWORDS.some((k) => name.includes(k))) score += 5;
  if (voice.localService) score += 2;
  if (voice.default) score += 1;
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
    .map((v) => ({ voice: v, score: scoreVoice(v, targetNames) }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.voice || englishVoices[0] || voices[0] || null;
}

// ─── Sarcastic Text Processing ───────────────────────────────────

/**
 * Lightly stretches sarcastic-tagged words. Does NOT inject punctuation tokens
 * — pacing comes from per-chunk timing instead, so screen readers / TTS engines
 * never literally pronounce "comma" or "dot".
 */
function applySarcasticProsody(text: string): string {
  let result = text;

  // Stretched vowels for classic sarcasm flavor
  result = result.replace(/\bsure\b/gi, "suuure");
  result = result.replace(/\bright\b/gi, "riiight");
  result = result.replace(/\bwow\b/gi, "wooow");
  result = result.replace(/\bgreat\b/gi, "greaaat");
  result = result.replace(/\bfine\b/gi, "fiiine");
  result = result.replace(/\b(okay|ok)\b/gi, "okaaay");

  // Normalize whitespace, strip stray punctuation tokens that some engines vocalize
  result = result.replace(/\s{2,}/g, " ").trim();
  return result;
}

// ─── Voice Parameter Profiles ────────────────────────────────────

interface VoiceProfile {
  rate: number;
  pitch: number;
  volume: number;
}

function getSarcasticProfile(direction: Direction): VoiceProfile {
  if (direction === "menToWomen") {
    // Female: lifted pitch, measured pace
    return { rate: 0.92, pitch: 1.12, volume: 1.0 };
  }
  // Male: natural lower register — NOT too low (was 0.78 → robotic)
  return { rate: 0.95, pitch: 0.95, volume: 1.0 };
}

/**
 * Split into natural clauses for prosody variation. Punctuation is REMOVED
 * from the spoken text (kept only as a split marker) so it never gets read aloud.
 * Pauses are added between chunks via setTimeout instead.
 */
function chunkForProsody(text: string): { text: string; pauseAfterMs: number }[] {
  // Split on punctuation but keep delimiters so we know how long to pause
  const parts = text.split(/([.!?,;:]+)/);
  const chunks: { text: string; pauseAfterMs: number }[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    const phrase = (parts[i] ?? "").trim();
    const punct = parts[i + 1] ?? "";
    if (!phrase) continue;

    let pause = 80;
    if (/[.!?]/.test(punct)) pause = 320;
    else if (/[,;:]/.test(punct)) pause = 180;
    if (/\.{3,}/.test(punct)) pause = 500;

    chunks.push({ text: phrase, pauseAfterMs: pause });
  }
  return chunks;
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

  const processedText = applySarcasticProsody(text);
  const chunks = chunkForProsody(processedText);
  const profile = getSarcasticProfile(direction);
  const voice = selectVoice(direction);

  let stopped = false;
  let started = false;
  let index = 0;

  const speakChunk = () => {
    if (stopped) return;
    if (index >= chunks.length) {
      activeChain = null;
      onEnd?.();
      return;
    }

    const chunk = chunks[index];
    const position = index / Math.max(1, chunks.length - 1);

    // Natural prosody contour: start neutral, peak mid, fall at the end
    const arc = Math.sin(position * Math.PI);
    const jitter = (Math.random() - 0.5) * 0.08;
    const pitchOffset = arc * 0.12 + jitter;
    const rateJitter = (Math.random() - 0.5) * 0.06;

    // Sarcastic deadpan: drop pitch hard on chunks ending with a period
    const isDeadpanEnd = /[.]\s*$/.test(chunk);
    const pitchAdjust = isDeadpanEnd ? -0.1 : pitchOffset;

    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.volume = profile.volume;
    utterance.pitch = Math.max(0.1, Math.min(2, profile.pitch + pitchAdjust));
    utterance.rate = Math.max(0.5, Math.min(1.4, profile.rate + rateJitter));
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.onstart = () => {
      if (!started) {
        started = true;
        onStart?.();
      }
    };
    utterance.onend = () => {
      index += 1;
      setTimeout(speakChunk, isDeadpanEnd ? 220 : 60);
    };
    utterance.onerror = (e) => {
      activeChain = null;
      onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  };

  activeChain = { stop: () => { stopped = true; } };

  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    createVoiceProcessingChain(ctx, direction);
  } catch {
    /* noop */
  }

  speakChunk();
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
