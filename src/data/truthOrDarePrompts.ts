export interface TodPrompt {
  text: string;
  spice: 1 | 2 | 3; // 1 = mild, 2 = flirty, 3 = spicy
}

export const TRUTHS: TodPrompt[] = [
  { text: "What's the first thing you noticed about your partner?", spice: 1 },
  { text: "What's a small habit of your partner's that you secretly love?", spice: 1 },
  { text: "What's the most embarrassing thing you've done in front of your partner?", spice: 1 },
  { text: "What's a compliment you've never said out loud about your partner?", spice: 1 },
  { text: "What's your favorite memory together?", spice: 1 },
  { text: "If you had to describe your partner in 3 words, what would they be?", spice: 1 },
  { text: "What's something you'd love to do together that you've never done?", spice: 2 },
  { text: "What's the most romantic thing your partner has ever done for you?", spice: 2 },
  { text: "What's a fantasy date you've imagined with your partner?", spice: 2 },
  { text: "When did you first know you were falling for them?", spice: 2 },
  { text: "What's one thing about your partner that drives you wild (in a good way)?", spice: 3 },
  { text: "What's your favorite physical feature of your partner?", spice: 3 },
  { text: "Describe your most memorable kiss with your partner.", spice: 3 },
  { text: "What's a secret turn-on you've never told your partner?", spice: 3 },
  { text: "What outfit does your partner wear that you can't resist?", spice: 3 },
];

export const DARES: TodPrompt[] = [
  { text: "Give your partner a 30-second shoulder massage.", spice: 1 },
  { text: "Send your partner a sweet voice note right now.", spice: 1 },
  { text: "Do your best impression of your partner.", spice: 1 },
  { text: "Compliment your partner three times in a row — no repeats.", spice: 1 },
  { text: "Show the last 3 photos in your camera roll.", spice: 1 },
  { text: "Sing a chorus of a love song to your partner.", spice: 1 },
  { text: "Slow dance with your partner for 30 seconds — music optional.", spice: 2 },
  { text: "Whisper something you love about them in their ear.", spice: 2 },
  { text: "Recreate your first date pose for a selfie together.", spice: 2 },
  { text: "Hold eye contact with your partner for 60 seconds. No talking.", spice: 2 },
  { text: "Kiss your partner somewhere you've never kissed them before.", spice: 3 },
  { text: "Give your partner a 30-second kiss — no breaks.", spice: 3 },
  { text: "Whisper your spiciest thought about your partner in their ear.", spice: 3 },
  { text: "Trade shirts with your partner for the next round.", spice: 3 },
  { text: "Give your partner a slow neck kiss for 10 seconds.", spice: 3 },
];

export function pickRandom(list: TodPrompt[], maxSpice: 1 | 2 | 3): TodPrompt {
  const filtered = list.filter((p) => p.spice <= maxSpice);
  return filtered[Math.floor(Math.random() * filtered.length)];
}
