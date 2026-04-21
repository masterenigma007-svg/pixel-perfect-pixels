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

interface SpokenChunk {
  text: string;
  rate: number;
  pitch: number;
  pauseMs: number;
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

/**
 * Breaks the text into smaller spoken phrases with slight prosody changes so
 * the browser TTS sounds less flat and robotic.
 */
function buildHumanFemaleChunks(text: string, profile: VoiceProfile): SpokenChunk[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const segments = normalized.match(/[^,;:.!?—…]+(?:[,;:.!?—…]+)?/g) ?? [normalized];

  return segments
    .map((segment, index) => {
      const trimmed = segment.trim();
      const punctuation = trimmed.match(/[,;:.!?—…]+$/)?.[0] ?? "";
      const spokenText = trimmed.replace(/[,;:.!?—…]+$/, "").trim();
      if (!spokenText) return null;

      const wordCount = spokenText.split(/\s+/).length;
      const isLongClause = wordCount >= 9;
      const cadenceOffset = index % 2 === 0 ? -0.01 : 0.015;

      const rateDelta = punctuation.includes("?")
        ? 0.02
        : punctuation.includes("!")
          ? 0.015
          : punctuation
            ? -0.015
            : 0;

      const pitchDelta = punctuation.includes("?")
        ? 0.025
        : punctuation.includes("!")
          ? 0.015
          : index % 3 === 0
            ? 0.01
            : -0.005;

      const pauseMs = punctuation.includes(".") || punctuation.includes("!") || punctuation.includes("?") || punctuation.includes("…")
        ? 180
        : punctuation
          ? 95
          : 40;

      return {
        text: spokenText,
        rate: Math.min(1.04, Math.max(0.9, profile.rate + cadenceOffset + rateDelta - (isLongClause ? 0.015 : 0))),
        pitch: Math.min(1.08, Math.max(0.94, profile.pitch + pitchDelta)),
        pauseMs,
      } satisfies SpokenChunk;
    })
    .filter((chunk): chunk is SpokenChunk => Boolean(chunk));
}

function speakWithHumanFemaleCadence(
  options: BrowserSpeakOptions & { profile: VoiceProfile; voice: SpeechSynthesisVoice | null }
): SpeechPlaybackHandle | null {
  const { text, profile, voice, onStart, onEnd, onError } = options;
  const chunks = buildHumanFemaleChunks(text, profile);
  if (!chunks.length) return null;

  let stopped = false;
  let started = false;
  let pauseTimer: number | null = null;

  const speakChunk = (index: number) => {
    if (stopped) return;

    const chunk = chunks[index];
    if (!chunk) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.volume = profile.volume;
    utterance.rate = chunk.rate;
    utterance.pitch = chunk.pitch;

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-GB";
    }

    utterance.onstart = () => {
      if (!stopped && !started) {
        started = true;
        onStart?.();
      }
    };

    utterance.onend = () => {
      if (stopped) return;

      if (index === chunks.length - 1) {
        onEnd?.();
        return;
      }

      pauseTimer = window.setTimeout(() => {
        pauseTimer = null;
        speakChunk(index + 1);
      }, chunk.pauseMs);
    };

    utterance.onerror = (event) => {
      if (!stopped) onError?.(event);
    };

    window.speechSynthesis.speak(utterance);
  };

  speakChunk(0);

  return {
    stop: () => {
      stopped = true;
      if (pauseTimer !== null) {
        window.clearTimeout(pauseTimer);
        pauseTimer = null;
      }
      window.speechSynthesis.cancel();
    },
  };
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

  // For the female voice, strictly prefer British (en-GB) voices so the
  // delivery has a clear British accent. Fall back to other English-accented
  // voices (AU/IE) before US, and only then to anything English.
  const britishCandidates = candidates.filter((v) => {
    const lang = v.lang.toLowerCase();
    return lang.startsWith("en-gb") || lang.startsWith("en-uk");
  });
  const britishIshCandidates = candidates.filter((v) => {
    const lang = v.lang.toLowerCase();
    return (
      lang.startsWith("en-gb") ||
      lang.startsWith("en-uk") ||
      lang.startsWith("en-ie") ||
      lang.startsWith("en-au")
    );
  });

  const preferredPool = wantFemale
    ? britishCandidates.length
      ? britishCandidates
      : britishIshCandidates.length
        ? britishIshCandidates
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
    // Warmer, slower delivery with a touch lower pitch for a richer, more
    // human British timbre (think dry, knowing British sarcasm).
    return isNeuralVoice(voice as SpeechSynthesisVoice)
      ? { rate: 0.92, pitch: 0.96, volume: 1.0 }
      : { rate: 0.9, pitch: 0.98, volume: 1.0 };
  }

  return { rate: 0.9, pitch: 1.05, volume: 1.0 };
}

/**
 * Lightly rewrites text so a single SpeechSynthesisUtterance still has natural
 * human cadence: ensures end punctuation, gives commas a touch more room, and
 * adds a tiny breath before sarcastic conjunctions.
 */
function humanizeFemaleText(text: string): string {
  let out = text.replace(/\s+/g, " ").trim();
  if (!out) return out;
  if (!/[.!?…]$/.test(out)) out += ".";
  out = out.replace(/\b(but|though|however|obviously|clearly|sure)\b/gi, ", $1");
  out = out.replace(/,\s*,/g, ",");
  return out;
}

export function speakWithBrowserTts(options: BrowserSpeakOptions): SpeechPlaybackHandle | null {
  const { text, direction, onStart, onEnd, onError } = options;
  if (!text) return null;

  const voice = selectVoice(direction);
  const profile = getSarcasticProfile(direction, voice);

  // Add subtle natural pauses for the female voice to sound more human,
  // without breaking the single-utterance pathway used by the male voice.
  const spokenText = direction === "menToWomen" ? humanizeFemaleText(text) : text;

  const utterance = new SpeechSynthesisUtterance(spokenText);

  let stopped = false;

  utterance.volume = profile.volume;
  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;

  if (voice) {
    utterance.voice = voice;
    // For the female voice, always force en-GB so the engine renders with a
    // British accent even when the chosen voice reports a generic locale.
    utterance.lang = direction === "menToWomen" ? "en-GB" : voice.lang;
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