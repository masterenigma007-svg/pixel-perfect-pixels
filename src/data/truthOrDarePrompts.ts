export interface TodPrompt {
  text: string;
  minAge: number; // minimum age appropriate for this prompt
}

// All prompts kept PG-13 — flirty/playful but never explicit.
export const TRUTHS: TodPrompt[] = [
  { text: "What's the first thing you noticed about your partner?", minAge: 18 },
  { text: "What's a small habit of your partner's that you secretly love?", minAge: 18 },
  { text: "What's the most embarrassing thing you've done in front of your partner?", minAge: 18 },
  { text: "What's a compliment you've never said out loud about your partner?", minAge: 18 },
  { text: "What's your favorite memory together?", minAge: 18 },
  { text: "If you had to describe your partner in 3 words, what would they be?", minAge: 18 },
  { text: "What's something you'd love to do together that you've never done?", minAge: 18 },
  { text: "What's the most romantic thing your partner has ever done for you?", minAge: 21 },
  { text: "What's a dream date you've imagined with your partner?", minAge: 21 },
  { text: "When did you first know you were falling for them?", minAge: 21 },
  { text: "What song reminds you of your partner and why?", minAge: 21 },
  { text: "What's one thing your partner does that always makes you smile?", minAge: 21 },
  { text: "What's your favorite physical feature of your partner?", minAge: 25 },
  { text: "Describe your most memorable kiss with your partner.", minAge: 25 },
  { text: "What outfit does your partner wear that you love the most?", minAge: 25 },
  { text: "What's a little gesture from your partner that makes you melt?", minAge: 25 },
  { text: "What's a goal you secretly hope you'll achieve together?", minAge: 30 },
  { text: "What's something you've never told your partner but want to?", minAge: 30 },
  { text: "Where do you picture the two of you in 10 years?", minAge: 30 },
];

export const DARES: TodPrompt[] = [
  { text: "Give your partner a 30-second shoulder massage.", minAge: 18 },
  { text: "Send your partner a sweet text right now.", minAge: 18 },
  { text: "Do your best impression of your partner.", minAge: 18 },
  { text: "Compliment your partner three times in a row — no repeats.", minAge: 18 },
  { text: "Show the last 3 photos in your camera roll.", minAge: 18 },
  { text: "Sing a chorus of a love song to your partner.", minAge: 18 },
  { text: "Slow dance with your partner for 30 seconds — music optional.", minAge: 21 },
  { text: "Whisper something you love about them in their ear.", minAge: 21 },
  { text: "Recreate your first date pose for a selfie together.", minAge: 21 },
  { text: "Hold eye contact with your partner for 60 seconds. No talking.", minAge: 21 },
  { text: "Give your partner a sweet kiss on the cheek.", minAge: 25 },
  { text: "Hold your partner's hand for the next 3 rounds.", minAge: 25 },
  { text: "Tell your partner your favorite memory of them.", minAge: 25 },
  { text: "Give your partner a 20-second hug — no breaks.", minAge: 25 },
  { text: "Plan a surprise mini-date right now (just brainstorm out loud).", minAge: 30 },
  { text: "Write a one-line love note and read it to your partner.", minAge: 30 },
];

export function pickRandom(list: TodPrompt[], age: number): TodPrompt {
  const filtered = list.filter((p) => p.minAge <= age);
  const pool = filtered.length > 0 ? filtered : list;
  return pool[Math.floor(Math.random() * pool.length)];
}
