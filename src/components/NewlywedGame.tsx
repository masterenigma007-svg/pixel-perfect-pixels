import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRandomQuestions } from "@/data/newlywedQuestions";
import type { NewlywedQuestion } from "@/data/newlywedQuestions";


const QUESTIONS_PER_PLAYER = 5;

type GameState = "setup" | "playing" | "reveal" | "results";

interface PlayerScore {
  name: string;
  score: number;
  answers: { question: string; picked: string; comedy: string }[];
}

export default function NewlywedGame() {
  const [gameState, setGameState] = useState<GameState>("setup");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [questions, setQuestions] = useState<NewlywedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [players, setPlayers] = useState<[PlayerScore, PlayerScore]>([
    { name: "", score: 0, answers: [] },
    { name: "", score: 0, answers: [] },
  ]);

  // Current player alternates: 0, 1, 0, 1...
  const currentPlayerIndex = currentIndex % 2;
  const currentPlayer = players[currentPlayerIndex];

  const startGame = useCallback(() => {
    const p1 = player1Name.trim() || "Player 1";
    const p2 = player2Name.trim() || "Player 2";
    setQuestions(getRandomQuestions(QUESTIONS_PER_PLAYER * 2));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setPlayers([
      { name: p1, score: 0, answers: [] },
      { name: p2, score: 0, answers: [] },
    ]);
    setGameState("playing");
  }, [player1Name, player2Name]);

  const handleSelect = (option: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(option);
    const q = questions[currentIndex];
    const comedy = q.comedyAnswers[option] || "Interesting choice...";
    const isCorrect = comedy.includes("🎯");

    setPlayers((prev) => {
      const updated = [...prev] as [PlayerScore, PlayerScore];
      updated[currentPlayerIndex] = {
        ...updated[currentPlayerIndex],
        score: updated[currentPlayerIndex].score + (isCorrect ? 1 : 0),
        answers: [
          ...updated[currentPlayerIndex].answers,
          { question: q.question, picked: option, comedy },
        ],
      };
      return updated;
    });

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

  const handlePlayAgain = () => {
    setGameState("setup");
    setPlayer1Name(players[0].name);
    setPlayer2Name(players[1].name);
  };

  const q = questions[currentIndex];
  const winner =
    players[0].score > players[1].score
      ? players[0].name
      : players[1].score > players[0].score
      ? players[1].name
      : null;

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
              {/* SETUP - Name entry */}
              {gameState === "setup" && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-6 py-6"
                >
                  <div className="text-6xl">💑</div>
                  <h2 className="text-xl font-bold text-foreground">
                    Enter Your Names
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                    Take turns answering questions about what your partner <em>really</em> means.
                    The player with the most 🎯 wins!
                  </p>

                  <div className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        👤 Player 1
                      </label>
                      <input
                        type="text"
                        value={player1Name}
                        onChange={(e) => setPlayer1Name(e.target.value)}
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
                        onChange={(e) => setPlayer2Name(e.target.value)}
                        placeholder="Enter name..."
                        className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left bg-muted rounded-xl p-4 text-sm text-muted-foreground">
                    <p>🎯 = Perfect answer (1 point)</p>
                    <p>🔄 Players alternate turns</p>
                    <p>📝 {QUESTIONS_PER_PLAYER} questions each ({QUESTIONS_PER_PLAYER * 2} total)</p>
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

              {/* PLAYING */}
              {gameState === "playing" && q && (
                <motion.div
                  key={`q-${currentIndex}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="space-y-5"
                >
                  {/* Scoreboard */}
                  <div className="flex items-center justify-between bg-muted rounded-xl p-3">
                    <div className={`text-xs font-bold ${currentPlayerIndex === 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {players[0].name}: {players[0].score} 🎯
                    </div>
                    <div className="text-xs text-muted-foreground">vs</div>
                    <div className={`text-xs font-bold ${currentPlayerIndex === 1 ? "text-primary" : "text-muted-foreground"}`}>
                      {players[1].name}: {players[1].score} 🎯
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Question {currentIndex + 1} of {questions.length}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>

                  {/* Current player turn */}
                  <div className="flex justify-center">
                    <motion.span
                      key={currentPlayerIndex}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-sm font-bold px-4 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30"
                    >
                      🎮 {currentPlayer.name}'s Turn
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

              {/* REVEAL */}
              {gameState === "reveal" && q && (
                <motion.div
                  key={`reveal-${currentIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  {/* Scoreboard */}
                  <div className="flex items-center justify-between bg-muted rounded-xl p-3">
                    <div className="text-xs font-bold text-foreground">
                      {players[0].name}: {players[0].score} 🎯
                    </div>
                    <div className="text-xs text-muted-foreground">vs</div>
                    <div className="text-xs font-bold text-foreground">
                      {players[1].name}: {players[1].score} 🎯
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-foreground text-center">
                    {q.question}
                  </h3>

                  {/* Selected answer */}
                  <div className="bg-muted rounded-xl p-4 border-2 border-primary/50">
                    <p className="text-xs text-muted-foreground mb-1">{currentPlayer.name} answered:</p>
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
                      {players[currentPlayerIndex].answers[players[currentPlayerIndex].answers.length - 1]?.comedy}
                    </p>
                  </motion.div>

                  <div className="flex justify-center pt-2">
                    <motion.button
                      onClick={handleNext}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-primary to-pink-500 text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm shadow-md"
                    >
                      {currentIndex + 1 >= questions.length
                        ? "See Results"
                        : `Next → ${players[(currentPlayerIndex + 1) % 2].name}'s Turn`}
                    </motion.button>
                  </div>
                </motion.div>
              )}

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
                    <div className="text-5xl">{winner ? "🏆" : "🤝"}</div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {winner ? `${winner} Wins!` : "It's a Tie!"}
                    </h2>
                    <p className="text-sm text-muted-foreground italic">
                      {winner
                        ? `${winner} clearly knows their partner better... or got luckier!`
                        : "You're equally matched — or equally clueless. Either way, it's love! 😂"}
                    </p>
                  </div>

                  {/* Final scores */}
                  <div className="flex gap-3">
                    {players.map((p, i) => (
                      <div
                        key={i}
                        className={`flex-1 text-center p-4 rounded-xl border-2 ${
                          winner === p.name
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted"
                        }`}
                      >
                        <p className="text-2xl font-bold text-foreground">{p.score}</p>
                        <p className="text-xs text-muted-foreground mt-1">{p.name}</p>
                      </div>
                    ))}
                  </div>

                  {/* Review per player */}
                  {players.map((p, pi) => (
                    <div key={pi}>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        {p.name}'s Answers
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {p.answers.map((a, i) => (
                          <div key={i} className="bg-muted rounded-xl p-3 text-xs space-y-1">
                            <p className="font-semibold text-foreground">{a.question}</p>
                            <p className="text-muted-foreground">Said: {a.picked}</p>
                            <p className="text-secondary italic">{a.comedy}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

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
