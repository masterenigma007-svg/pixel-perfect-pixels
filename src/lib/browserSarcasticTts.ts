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
  "google uk english female",
  "microsoft libby", "microsoft sonia", "microsoft hollie", "microsoft maisie",
  "microsoft aria", "microsoft jenny", "microsoft ava", "microsoft emma",
  "microsoft michelle", "microsoft zira",
  "kate", "serena", "fiona", "moira", "tessa", "karen", "victoria",
  "samantha", "alice", "hazel", "susan", "allison", "ava", "emma", "aria",
];

const PREMIUM_FEMALE_NAMES = [
  "google uk english female",
  "microsoft libby online", "microsoft sonia online", "microsoft hollie online",
  "microsoft libby", "microsoft sonia", "microsoft hollie",
  "microsoft aria online", "microsoft jenny online",
  "microsoft aria", "microsoft jenny",
  "serena", "kate",
];

const BRITISH_FEMALE_NAMES = [
  "google uk english female",
  "microsoft libby online", "microsoft sonia online", "microsoft hollie online",
  "microsoft libby", "microsoft sonia", "microsoft hollie", "microsoft maisie",
  "microsoft abbi", "microsoft bella", "microsoft olivia",
  "kate", "serena", "fiona", "hazel", "susan", "stephanie",
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

const NEURAL_KEYWORDS = ["neural", "natural", "online", "premium", "enhanced"];

const LOW_QUALITY_FEMALE_NAMES = [
  "microsoft zira",
  "microsoft ava",
  "microsoft emma",
  "microsoft michelle",
  "hazel",
  "susan",
  "allison",
];

const ROBOTIC_KEYWORDS = [
  "espeak", "compact", "synth", "festival", "classic", "old", "legacy",
];

function isNeuralVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  return NEURAL_KEYWORDS.some((keyword) => name.includes(keyword));
}

function isBritishFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();

  return (
    lang.startsWith("en-gb") ||
    lang.startsWith("en-uk") ||
    BRITISH_FEMALE_NAMES.some((target) => name.includes(target))
  );
}

function scoreVoice(voice: SpeechSynthesisVoice, direction: Direction, targetNames: string[]): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  const preferBritishMale = direction === "womenToMen";
  const preferBritishFemale = direction === "menToWomen";

  let score = 0;
  if (targetNames.some((target) => name.includes(target))) score += 10;
  if (PREMIUM_KEYWORDS.some((keyword) => name.includes(keyword))) score += 5;
  if (voice.localService) score += 2;
  if (voice.default) score += 1;

  if (preferBritishMale) {
    if (lang.startsWith("en-gb") || lang.startsWith("en-uk")) score += 14;
    if (BRITISH_MALE_NAMES.some((target) => name.includes(target))) score += 10;
  } else if (preferBritishFemale) {
    if (lang.startsWith("en-gb") || lang.startsWith("en-uk")) score += 34;
    else if (lang.startsWith("en-au") || lang.startsWith("en-ie")) score += 10;
    else if (lang.startsWith("en-us")) score -= 20;
    else if (lang.startsWith("en")) score -= 12;

    if (BRITISH_FEMALE_NAMES.some((target) => name.includes(target))) score += 26;
    if (PREMIUM_FEMALE_NAMES.some((target) => name.includes(target))) score += 14;
    if (isNeuralVoice(voice)) score += 18;
    if (LOW_QUALITY_FEMALE_NAMES.some((target) => name.includes(target))) score -= 14;

    if (voice.localService && !isNeuralVoice(voice)) score -= 8;
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

  const preferredPool = wantFemale
    ? candidates.filter(isBritishFemaleVoice).length
      ? candidates.filter(isBritishFemaleVoice)
      : candidates.filter(isNeuralVoice).length
        ? candidates.filter(isNeuralVoice)
        : candidates
    : candidates;

  const scored = preferredPool
    .map((voice) => ({ voice, score: scoreVoice(voice, direction, targetNames) }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.voice || englishVoices[0] || voices[0] || null;
}

function getSarcasticProfile(direction: Direction, voice: SpeechSynthesisVoice | null): VoiceProfile {
  if (direction === "menToWomen") {
    return isNeuralVoice(voice as SpeechSynthesisVoice)
      ? { rate: 0.97, pitch: 1.01, volume: 1.0 }
      : { rate: 1.0, pitch: 1.08, volume: 1.0 };
  }

  return { rate: 0.9, pitch: 1.05, volume: 1.0 };
}

export function speakWithBrowserTts(options: BrowserSpeakOptions): SpeechPlaybackHandle | null {
  const { text, direction, onStart, onEnd, onError } = options;
  if (!text) return null;

  const voice = selectVoice(direction);
  const profile = getSarcasticProfile(direction, voice);
  const utterance = new SpeechSynthesisUtterance(text);

  let stopped = false;

  utterance.volume = profile.volume;
  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-GB";
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