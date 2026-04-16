import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRandomQuestions } from "@/data/newlywedQuestions";
import type { NewlywedQuestion } from "@/data/newlywedQuestions";
import { compareAnswers, DIFFICULTY_THRESHOLDS, type Difficulty } from "@/lib/answerSimilarity";

const DIFFICULTY_META: Record<Difficulty, { label: string; emoji: string; blurb: string }> = {
  easy: { label: "Easy", emoji: "🌱", blurb: "50% similar = match. Forgiving — great for first-timers." },
  medium: { label: "Medium", emoji: "🔥", blurb: "75% similar = match. The classic challenge." },
  hard: { label: "Hard", emoji: "💎", blurb: "90% similar = match. Only soulmates need apply." },
};

const QUESTIONS_TOTAL = 6;
const MAX_ANSWER_LEN = 140;

type GameState = "setup" | "p1-answer" | "p2-answer" | "reveal" | "results";

interface RoundResult {
  question: string;
  perspective: "his" | "hers";
  p1Answer: string;
  p2Answer: string;
  score: number; // 0..1
  isMatch: boolean;
  comedy: string; // a representative comedic reveal for flavor
}

function pickComedyLine(q: NewlywedQuestion): string {
  // Prefer the "🎯" ringer, otherwise a random one.
  const targeted = Object.values(q.comedyAnswers).find((c) => c.includes("🎯"));
  if (targeted) return targeted;
  const all = Object.values(q.comedyAnswers);
  return all[Math.floor(Math.random() * all.length)] ?? "Interesting...";
}

export default function NewlywedGame() {
  const [gameState, setGameState] = useState<GameState>("setup");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questions, setQuestions] = useState<NewlywedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [p1Answer, setP1Answer] = useState("");
  const [p2Answer, setP2Answer] = useState("");
  const [results, setResults] = useState<RoundResult[]>([]);

  const threshold = DIFFICULTY_THRESHOLDS[difficulty];
  const thresholdPct = Math.round(threshold * 100);

  const startGame = useCallback(() => {
    setQuestions(getRandomQuestions(QUESTIONS_TOTAL));
    setCurrentIndex(0);
    setP1Answer("");
    setP2Answer("");
    setResults([]);
    setGameState("p1-answer");
  }, []);

  const p1Name = player1Name.trim() || "Player 1";
  const p2Name = player2Name.trim() || "Player 2";
  const q = questions[currentIndex];

  const submitP1 = () => {
    if (!p1Answer.trim()) return;
    setGameState("p2-answer");
  };

  const submitP2 = () => {
    if (!p2Answer.trim() || !q) return;
    const sim = compareAnswers(p1Answer, p2Answer, threshold);
    setResults((prev) => [
      ...prev,
      {
        question: q.question,
        perspective: q.perspective,
        p1Answer: p1Answer.trim(),
        p2Answer: p2Answer.trim(),
        score: sim.score,
        isMatch: sim.isMatch,
        comedy: pickComedyLine(q),
      },
    ]);
    setGameState("reveal");
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameState("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setP1Answer("");
      setP2Answer("");
      setGameState("p1-answer");
    }
  };

  const handlePlayAgain = () => {
    setGameState("setup");
  };

  const matches = results.filter((r) => r.isMatch).length;
  const accuracy = results.length
    ? Math.round((results.reduce((s, r) => s + r.score, 0) / results.length) * 100)
    : 0;
  const passedThreshold = accuracy >= thresholdPct;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <header className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold mirage-text drop-shadow-sm"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            💍 The Newlywed Game
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
            className="text-muted-foreground text-sm mt-2 italic"
          >
            Both partners answer. Match adjectives = you really know each other.
          </motion.p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
          className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.60)" }}
        >
          <div className="h-1.5 bg-gradient-to-r from-primary to-secondary" />

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* SETUP */}
              {gameState === "setup" && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-6 py-6"
                >
                  <div className="text-6xl">💑</div>
                  <h2 className="text-xl font-bold text-foreground">Enter Your Names</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                    For each question, <em>both of you</em> type your honest answer.
                    We compare them — adjectives matter most. Pick a difficulty below!
                  </p>

                  <div className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        👤 Player 1
                      </label>
                      <input
                        type="text"
                        value={player1Name}
                        onChange={(e) => setPlayer1Name(e.target.value.slice(0, 40))}
                        placeholder="Enter name..."
                        className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        👤 Player 2
                      </label>
                      <input
                        type="text"
                        value={player2Name}
                        onChange={(e) => setPlayer2Name(e.target.value.slice(0, 40))}
                        placeholder="Enter name..."
                        className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Difficulty selector */}
                  <div className="text-left">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      🎚️ Difficulty
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => {
                        const meta = DIFFICULTY_META[d];
                        const active = difficulty === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDifficulty(d)}
                            className={`px-2 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            <div className="text-base">{meta.emoji}</div>
                            <div>{meta.label}</div>
                            <div className="text-[10px] opacity-70 font-normal mt-0.5">
                              {Math.round(DIFFICULTY_THRESHOLDS[d] * 100)}%
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground italic mt-2 text-center">
                      {DIFFICULTY_META[difficulty].blurb}
                    </p>
                  </div>

                  <div className="space-y-2 text-left bg-muted rounded-xl p-4 text-sm text-muted-foreground">
                    <p>✍️ Both players type their own answer</p>
                    <p>🎯 {thresholdPct}%+ similarity = match (point)</p>
                    <p>🧠 Adjectives are weighted heaviest</p>
                    <p>📝 {QUESTIONS_TOTAL} questions total</p>
                  </div>

                  <motion.button
                    onClick={startGame}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-primary to-pink-500 text-primary-foreground px-8 py-3 rounded-full font-bold text-lg shadow-lg"
                  >
                    Start Playing!
                  </motion.button>
                </motion.div>
              )}

              {/* PLAYER 1 ANSWER */}
              {(gameState === "p1-answer" || gameState === "p2-answer") && q && (
                <motion.div
                  key={`answer-${currentIndex}-${gameState}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="space-y-5"
                >
                  {/* Progress */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Question {currentIndex + 1} of {questions.length}</span>
                    <span>{matches} 🎯 matches so far</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>

                  {/* Whose turn */}
                  <div className="flex justify-center">
                    <motion.span
                      key={gameState}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-sm font-bold px-4 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30"
                    >
                      ✍️ {gameState === "p1-answer" ? p1Name : p2Name}, your turn
                    </motion.span>
                  </div>

                  {/* Perspective badge */}
                  <div className="flex justify-center">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{
                        background: q.perspective === "hers"
                          ? "linear-gradient(135deg, hsl(270 80% 85%), hsl(270 80% 60%))"
                          : "linear-gradient(135deg, hsl(160 60% 75%), hsl(160 60% 45%))",
                        color: "#fff",
                      }}
                    >
                      {q.perspective === "hers" ? "👩 Her Perspective" : "👨 His Perspective"}
                    </span>
                  </div>

                  {/* Question */}
                  <h3 className="text-lg font-bold text-foreground text-center leading-snug">
                    {q.question}
                  </h3>

                  <p className="text-xs text-muted-foreground text-center italic">
                    Type a short, honest answer. Adjectives count most.
                  </p>

                  {gameState === "p1-answer" ? (
                    <>
                      <textarea
                        value={p1Answer}
                        onChange={(e) => setP1Answer(e.target.value.slice(0, MAX_ANSWER_LEN))}
                        placeholder={`${p1Name}'s answer...`}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                        autoFocus
                      />
                      <div className="text-right text-[11px] text-muted-foreground -mt-3">
                        {p1Answer.length}/{MAX_ANSWER_LEN}
                      </div>
                      <div className="flex justify-center">
                        <motion.button
                          onClick={submitP1}
                          disabled={!p1Answer.trim()}
                          whileHover={{ scale: p1Answer.trim() ? 1.05 : 1 }}
                          whileTap={{ scale: p1Answer.trim() ? 0.95 : 1 }}
                          className="bg-gradient-to-r from-primary to-pink-500 text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Lock in & pass to {p2Name} →
                        </motion.button>
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center italic">
                        🤫 {p2Name}, look away until {p1Name} taps the button.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] text-muted-foreground text-center italic">
                        🔒 {p1Name}'s answer is locked. No peeking!
                      </div>
                      <textarea
                        value={p2Answer}
                        onChange={(e) => setP2Answer(e.target.value.slice(0, MAX_ANSWER_LEN))}
                        placeholder={`${p2Name}'s answer...`}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                        autoFocus
                      />
                      <div className="text-right text-[11px] text-muted-foreground -mt-3">
                        {p2Answer.length}/{MAX_ANSWER_LEN}
                      </div>
                      <div className="flex justify-center">
                        <motion.button
                          onClick={submitP2}
                          disabled={!p2Answer.trim()}
                          whileHover={{ scale: p2Answer.trim() ? 1.05 : 1 }}
                          whileTap={{ scale: p2Answer.trim() ? 0.95 : 1 }}
                          className="bg-gradient-to-r from-primary to-pink-500 text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reveal both answers →
                        </motion.button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* REVEAL */}
              {gameState === "reveal" && q && results.length > 0 && (() => {
                const r = results[results.length - 1];
                const pct = Math.round(r.score * 100);
                return (
                  <motion.div
                    key={`reveal-${currentIndex}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    <h3 className="text-base font-bold text-foreground text-center leading-snug">
                      {q.question}
                    </h3>

                    {/* Side-by-side answers */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted rounded-xl p-3 border-2 border-primary/40">
                        <p className="text-[11px] text-muted-foreground mb-1 font-bold uppercase tracking-wider">
                          {p1Name}
                        </p>
                        <p className="text-sm text-foreground">{r.p1Answer}</p>
                      </div>
                      <div className="bg-muted rounded-xl p-3 border-2 border-secondary/40">
                        <p className="text-[11px] text-muted-foreground mb-1 font-bold uppercase tracking-wider">
                          {p2Name}
                        </p>
                        <p className="text-sm text-foreground">{r.p2Answer}</p>
                      </div>
                    </div>

                    {/* Similarity badge */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1, transition: { delay: 0.2 } }}
                      className={`rounded-xl p-4 text-center border-2 ${
                        r.isMatch
                          ? "bg-primary/10 border-primary/50"
                          : "bg-muted border-border"
                      }`}
                    >
                      <p className="text-xs text-muted-foreground mb-1">Similarity</p>
                      <p className="text-3xl font-bold text-foreground">{pct}%</p>
                      <p className="text-sm font-bold mt-1" style={{ color: r.isMatch ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
                        {r.isMatch ? "🎯 Match! +1 point" : `😬 Not quite (need ${thresholdPct}%)`}
                      </p>
                    </motion.div>

                    {/* Comedy reveal for flavor */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
                      className="bg-secondary/10 border-2 border-secondary/30 rounded-xl p-4"
                    >
                      <p className="text-xs text-secondary font-bold mb-2">🎭 The Real Answer™:</p>
                      <p className="text-sm text-foreground leading-relaxed italic">{r.comedy}</p>
                    </motion.div>

                    <div className="flex justify-center pt-2">
                      <motion.button
                        onClick={handleNext}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gradient-to-r from-primary to-pink-500 text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm shadow-md"
                      >
                        {currentIndex + 1 >= questions.length ? "See Final Results" : "Next Question →"}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })()}

              {/* RESULTS */}
              {gameState === "results" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6 py-4"
                >
                  <div className="text-center space-y-3">
                    <div className="text-5xl">{passedThreshold ? "🏆" : "😅"}</div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {passedThreshold ? "You really do know each other!" : "Room for growth..."}
                    </h2>
                    <p className="text-sm text-muted-foreground italic">
                      {passedThreshold
                        ? `You hit ${accuracy}% — above the 75% 'soulmate' threshold.`
                        : `You scored ${accuracy}%. The 75% threshold is the goal — try again!`}
                    </p>
                  </div>

                  {/* Headline stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`text-center p-4 rounded-xl border-2 ${passedThreshold ? "border-primary bg-primary/10" : "border-border bg-muted"}`}>
                      <p className="text-3xl font-bold text-foreground">{accuracy}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Avg Accuracy</p>
                    </div>
                    <div className="text-center p-4 rounded-xl border-2 border-border bg-muted">
                      <p className="text-3xl font-bold text-foreground">{matches}/{results.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Matches (≥75%)</p>
                    </div>
                  </div>

                  {/* Round-by-round */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Round Breakdown
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {results.map((r, i) => (
                        <div key={i} className="bg-muted rounded-xl p-3 text-xs space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-foreground flex-1">{r.question}</p>
                            <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${r.isMatch ? "bg-primary/20 text-primary" : "bg-border text-muted-foreground"}`}>
                              {Math.round(r.score * 100)}%
                            </span>
                          </div>
                          <p className="text-muted-foreground"><span className="font-bold">{p1Name}:</span> {r.p1Answer}</p>
                          <p className="text-muted-foreground"><span className="font-bold">{p2Name}:</span> {r.p2Answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center gap-3">
                    <motion.button
                      onClick={handlePlayAgain}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-primary to-pink-500 text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm shadow-md"
                    >
                      Play Again 🔄
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <footer className="text-center mt-6 text-xs text-muted-foreground italic">
          Inspired by the classic Newlywed Game — for comedy purposes only!
        </footer>
      </div>
    </div>
  );
}
