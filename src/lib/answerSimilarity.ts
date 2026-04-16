// Fuzzy answer similarity for the Newlywed Game.
// Adjectives are weighted heaviest because they carry the most meaning
// when describing a partner ("sweet" vs "grumpy" matters more than "is" or "the").

const STOPWORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being",
  "i","me","my","mine","you","your","yours","he","she","they","them","we","us",
  "to","of","in","on","at","for","with","and","or","but","so","if","then",
  "do","does","did","done","have","has","had","will","would","can","could",
  "very","really","kinda","sorta","just","like","that","this","it","its",
]);

// Common adjectives — not exhaustive, but a strong base for couples-style answers.
const ADJECTIVE_LEXICON = new Set([
  "sweet","kind","funny","silly","grumpy","moody","loud","quiet","calm","wild",
  "lazy","busy","tired","happy","sad","angry","mad","mean","nice","rude",
  "smart","dumb","clever","clueless","romantic","awkward","shy","bold","brave",
  "cute","pretty","handsome","gorgeous","ugly","cold","warm","hot","chilly",
  "messy","clean","tidy","neat","late","early","punctual","slow","fast","quick",
  "honest","sneaky","loyal","jealous","caring","selfish","generous","cheap","stingy",
  "patient","impatient","stubborn","flexible","strong","weak","gentle","rough",
  "weird","normal","boring","exciting","fun","dull","sharp","soft","hard","easy",
  "old","young","tall","short","big","small","tiny","huge","fat","thin","skinny",
  "drunk","sober","sleepy","awake","hungry","full","thirsty","sick","healthy",
  "good","bad","great","terrible","amazing","awful","perfect","horrible","best","worst",
  "hot-headed","cool","clingy","distant","needy","independent","supportive","critical",
  "passionate","cold-hearted","optimistic","pessimistic","dramatic","chill","intense",
  "bossy","controlling","easygoing","goofy","serious","playful","mysterious","open",
]);

const ADJECTIVE_SUFFIXES = ["able","ible","ful","less","ous","ive","ish","like","y"];

function looksLikeAdjective(word: string): boolean {
  if (ADJECTIVE_LEXICON.has(word)) return true;
  if (word.length < 4) return false;
  return ADJECTIVE_SUFFIXES.some((s) => word.endsWith(s));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));
}

// Dice coefficient on character bigrams — forgiving on typos and minor variants.
function diceBigram(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (s: string) => {
    const out: string[] = [];
    for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
    return out;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.length === 0 || B.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const g of A) counts.set(g, (counts.get(g) ?? 0) + 1);
  let inter = 0;
  for (const g of B) {
    const c = counts.get(g) ?? 0;
    if (c > 0) {
      inter++;
      counts.set(g, c - 1);
    }
  }
  return (2 * inter) / (A.length + B.length);
}

// Best-pair word similarity, weighted: adjectives count 3x, other content words 1x.
function weightedTokenSimilarity(t1: string[], t2: string[]): number {
  if (t1.length === 0 && t2.length === 0) return 1;
  if (t1.length === 0 || t2.length === 0) return 0;

  const score = (from: string[], to: string[]): number => {
    let totalWeight = 0;
    let matched = 0;
    for (const w of from) {
      const weight = looksLikeAdjective(w) ? 3 : 1;
      totalWeight += weight;
      let best = 0;
      for (const v of to) {
        // Treat very-similar words as matches (e.g. "grumpy" ~ "grumpier").
        const sim = w === v ? 1 : diceBigram(w, v);
        if (sim > best) best = sim;
      }
      // Soft match: anything ≥ 0.7 character similarity counts proportionally.
      const credit = best >= 0.7 ? best : 0;
      matched += credit * weight;
    }
    return matched / totalWeight;
  };

  // Symmetric: average of each direction so neither player is unfairly penalized.
  return (score(t1, t2) + score(t2, t1)) / 2;
}

export interface SimilarityResult {
  score: number; // 0..1
  isMatch: boolean; // score >= 0.75
  sharedAdjectives: string[];
}

export function compareAnswers(a: string, b: string): SimilarityResult {
  const t1 = tokenize(a);
  const t2 = tokenize(b);

  const tokenSim = weightedTokenSimilarity(t1, t2);
  const charSim = diceBigram(a.toLowerCase().trim(), b.toLowerCase().trim());
  // Take the more generous of the two — protects single-word answers.
  const score = Math.max(tokenSim, charSim);

  const adj1 = new Set(t1.filter(looksLikeAdjective));
  const sharedAdjectives: string[] = [];
  for (const w of t2) {
    if (looksLikeAdjective(w) && adj1.has(w)) sharedAdjectives.push(w);
  }

  return {
    score,
    isMatch: score >= 0.75,
    sharedAdjectives,
  };
}

export const MATCH_THRESHOLD = 0.75;
