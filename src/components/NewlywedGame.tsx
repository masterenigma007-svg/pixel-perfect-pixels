import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRandomQuestions } from "@/data/newlywedQuestions";
import type { NewlywedQuestion } from "@/data/newlywedQuestions";

const TOTAL_QUESTIONS = 8;

type GameState = "intro" | "playing" | "reveal" | "results";

export default function NewlywedGame() {
  const [gameState, setGameState] = useState<GameState>("intro");
  const [questions, setQuestions] = useState<NewlywedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; picked: string; comedy: string }[]>([]);

  const startGame = useCallback(() => {
    setQuestions(getRandomQuestions(TOTAL_QUESTIONS));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setAnswers([]);
    setGameState("playing");
  }, []);

  const handleSelect = (option: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(option);
    const q = questions[currentIndex];
    const comedy = q.comedyAnswers[option] || "Interesting choice...";
    const isCorrect = comedy.includes("🎯");
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, { question: q.question, picked: option, comedy }]);
    setGameState("reveal");
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameState("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setGameState("playing");
    }
  };

  const q = questions[currentIndex];

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
            How well do you really know what your partner means?
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
              {gameState === "intro" && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-6 py-8"
                >
                  <div className="text-6xl">💑</div>
                  <h2 className="text-xl font-bold text-foreground">
                    How Well Do You Know Your Partner?
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                    Inspired by the classic Newlywed Game show! Guess what your partner
                    <em> really </em> means when they say common phrases. Each correct answer
                    earns a point. Can you decode the subtext?
                  </p>
                  <div className="space-y-2 text-left bg-muted rounded-xl p-4 text-sm text-muted-foreground">
                    <p>🎯 = Perfect answer</p>
                    <p>📝 {TOTAL_QUESTIONS} questions per round</p>
                    <p>😂 Comedic reveals after each answer</p>
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

              {gameState === "playing" && q && (
                <motion.div
                  key={`q-${currentIndex}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="space-y-5"
                >
                  {/* Progress */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Question {currentIndex + 1} of {questions.length}</span>
                    <span>Score: {score} 🎯</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>

                  {/* Perspective badge */}
                  <div className="flex justify-center">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{
                        background: q.perspective === "hers"
                          ? "linear-gradient(135deg, #e9d5ff, #a855f7)"
                          : "linear-gradient(135deg, #6ee7b7, #10b981)",
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

                  {/* Options */}
                  <div className="space-y-3">
                    {q.options.map((option, i) => (
                      <motion.button
                        key={option}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: i * 0.1 } }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelect(option)}
                        className="w-full text-left px-4 py-3 rounded-xl border-2 border-border bg-muted hover:border-primary hover:bg-primary/10 text-foreground text-sm font-medium transition-all"
                      >
                        <span className="text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>
                        {option}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {gameState === "reveal" && q && (
                <motion.div
                  key={`reveal-${currentIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Question {currentIndex + 1} of {questions.length}</span>
                    <span>Score: {score} 🎯</span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground text-center">
                    {q.question}
                  </h3>

                  {/* Selected answer */}
                  <div className="bg-muted rounded-xl p-4 border-2 border-primary/50">
                    <p className="text-xs text-muted-foreground mb-1">You answered:</p>
                    <p className="text-sm font-semibold text-foreground">{selectedAnswer}</p>
                  </div>

                  {/* Comedy reveal */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
                    className="bg-secondary/10 border-2 border-secondary/30 rounded-xl p-4"
                  >
                    <p className="text-xs text-secondary font-bold mb-2">🎭 The Real Answer:</p>
                    <p className="text-sm text-foreground leading-relaxed italic">
                      {answers[answers.length - 1]?.comedy}
                    </p>
                  </motion.div>

                  <div className="flex justify-center pt-2">
                    <motion.button
                      onClick={handleNext}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-primary to-pink-500 text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm shadow-md"
                    >
                      {currentIndex + 1 >= questions.length ? "See Results" : "Next Question →"}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {gameState === "results" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6 py-4"
                >
                  <div className="text-center space-y-3">
                    <div className="text-5xl">
                      {score >= questions.length * 0.8 ? "🏆" : score >= questions.length * 0.5 ? "👏" : "😅"}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                      You scored {score} out of {questions.length}!
                    </h2>
                    <p className="text-sm text-muted-foreground italic">
                      {score >= questions.length * 0.8
                        ? "You're a relationship decoder! Teach us your ways."
                        : score >= questions.length * 0.5
                        ? "Not bad! You understand some of the code. Keep studying."
                        : "Oh dear. You might want to have a few more conversations with your partner. 😂"}
                    </p>
                  </div>

                  {/* Review */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {answers.map((a, i) => (
                      <div key={i} className="bg-muted rounded-xl p-3 text-xs space-y-1">
                        <p className="font-semibold text-foreground">{a.question}</p>
                        <p className="text-muted-foreground">You said: {a.picked}</p>
                        <p className="text-secondary italic">{a.comedy}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center gap-3">
                    <motion.button
                      onClick={startGame}
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
