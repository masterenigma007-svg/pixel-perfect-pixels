import type { Direction } from "@/data/translations";

export interface SpeechPlaybackHandle {
  stop: () => void;
}

interface BrowserSpeakOptions {
  text: string;
  direction: Direction;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

interface VoiceProfile {
  rate: number;
  pitch: number;
  volume: number;
}

const FEMALE_NAMES = [
  "google uk english female", "google us english",
  "microsoft aria", "microsoft jenny", "microsoft ava", "microsoft emma",
  "microsoft michelle", "microsoft zira",
  "samantha", "victoria", "karen", "tessa", "fiona", "moira",
  "alice", "hazel", "susan", "serena", "allison", "ava", "emma", "aria",
];

const PREMIUM_FEMALE_NAMES = [
  "google uk english female", "microsoft aria", "microsoft jenny",
  "microsoft ava", "microsoft emma", "samantha", "serena", "allison",
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
  if (targetNames.some((target) => name.includes(target))) score += 10;
  if (PREMIUM_KEYWORDS.some((keyword) => name.includes(keyword))) score += 5;
  if (voice.localService) score += 2;
  if (voice.default) score += 1;

  if (preferBritishMale) {
    if (lang.startsWith("en-gb") || lang.startsWith("en-uk")) score += 14;
    if (BRITISH_MALE_NAMES.some((target) => name.includes(target))) score += 10;
  } else {
    if (PREMIUM_FEMALE_NAMES.some((target) => name.includes(target))) score += 12;
    if (lang.startsWith("en-us") || lang.startsWith("en-gb")) score += 3;
  }

  if (ROBOTIC_KEYWORDS.some((keyword) => name.includes(keyword))) score -= 12;
  return score;
}

function selectVoice(direction: Direction): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const wantFemale = direction === "menToWomen";
  const targetNames = wantFemale ? FEMALE_NAMES : MALE_NAMES;
  const oppositeNames = wantFemale ? MALE_NAMES : FEMALE_NAMES;

  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));

  const candidates = englishVoices.filter((voice) => {
    const name = voice.name.toLowerCase();
    return !oppositeNames.some((opposite) => name.includes(opposite));
  });

  const scored = candidates
    .map((voice) => ({ voice, score: scoreVoice(voice, direction, targetNames) }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.voice || englishVoices[0] || voices[0] || null;
}

function getSarcasticProfile(direction: Direction): VoiceProfile {
  if (direction === "menToWomen") {
    return { rate: 0.97, pitch: 0.95, volume: 1.0 };
  }

  return { rate: 0.9, pitch: 1.05, volume: 1.0 };
}

export function speakWithBrowserTts(options: BrowserSpeakOptions): SpeechPlaybackHandle | null {
  const { text, direction, onStart, onEnd, onError } = options;
  if (!text) return null;

  const profile = getSarcasticProfile(direction);
  const voice = selectVoice(direction);
  const utterance = new SpeechSynthesisUtterance(text);

  let stopped = false;

  utterance.volume = profile.volume;
  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = direction === "womenToMen" ? "en-GB" : "en-US";
  }

  utterance.onstart = () => {
    if (!stopped) onStart?.();
  };

  utterance.onend = () => {
    if (!stopped) onEnd?.();
  };

  utterance.onerror = (event) => {
    if (!stopped) onError?.(event);
  };

  window.speechSynthesis.speak(utterance);

  return {
    stop: () => {
      stopped = true;
      window.speechSynthesis.cancel();
    },
  };
}

export function preloadBrowserVoices(): void {
  window.speechSynthesis.getVoices();
}