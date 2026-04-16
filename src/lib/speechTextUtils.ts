/**
 * If the UI output contains a generic wrapper like:
 *   "original phrase" — Translation: actual translation
 * only the actual translation should be spoken.
 */
export function extractSpokenText(text: string): string {
  const match = text.match(/[—-]\s*Translation\s*:\s*(.+)$/i);
  return match?.[1]?.trim() || text.trim();
}

/**
 * Cleans text for TTS without altering wording.
 * - Strips characters some engines vocalize (asterisks, brackets, quotes, etc.)
 * - Normalizes whitespace
 * - Does NOT add or change any words.
 */
export function applySarcasticProsody(text: string): string {
  return text
    .replace(/["'“”‘’*_`~<>[\](){}]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function prepareSpeechText(text: string): string {
  return applySarcasticProsody(extractSpokenText(text));
}