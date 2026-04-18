import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRUTHS, DARES, pickRandom, type TodPrompt } from "@/data/truthOrDarePrompts";
import { Slider } from "@/components/ui/slider";
import { maybeShowInterstitial } from "@/lib/monetization";


type Stage = "setup" | "choose" | "prompt";

export default function TruthOrDare() {
  const [stage, setStage] = useState<Stage>("setup");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [age, setAge] = useState<number>(25);
  const [turn, setTurn] = useState(0);
  const [current, setCurrent] = useState<{ kind: "Truth" | "Dare"; prompt: TodPrompt } | null>(null);

  const names = [p1.trim() || "Player 1", p2.trim() || "Player 2"];
  const currentName = names[turn];

  const startGame = () => {
    setTurn(0);
    setCurrent(null);
    setStage("choose");
  };

  const pick = (kind: "Truth" | "Dare") => {
    const prompt = pickRandom(kind === "Truth" ? TRUTHS : DARES, age);
    setCurrent({ kind, prompt });
    setStage("prompt");
  };

  const nextTurn = () => {
    setTurn((t) => (t === 0 ? 1 : 0));
    setCurrent(null);
    setStage("choose");
    // Every 10th completed prompt may show an interstitial.
    void maybeShowInterstitial("tod");
  };

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      <AnimatePresence mode="wait">
        {stage === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-5"
          >
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Truth or Dare
              </h1>
              <p className="text-sm text-muted-foreground">Pass-and-play for couples</p>
            </div>

            <div className="space-y-3">
              <input
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                placeholder="Player 1 name"
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none"
              />
              <input
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                placeholder="Player 2 name"
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-foreground">Age</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-primary">{age}</span>
                </p>
              </div>
              <Slider
                min={18}
                max={80}
                step={1}
                value={[age]}
                onValueChange={(value) => setAge(value[0] ?? 18)}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">Age range: 18 to 80. All prompts stay PG-13.</p>
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-lg shadow-lg active:scale-[0.98] transition-transform"
            >
              Start Game
            </button>
          </motion.div>
        )}

        {stage === "choose" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="text-center space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Age {age}</p>
              <p className="text-sm text-muted-foreground">It's your turn</p>
              <h2 className="text-3xl font-black text-foreground">{currentName}</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => pick("Truth")}
                className="py-8 rounded-2xl bg-gradient-to-br from-primary/90 to-primary text-primary-foreground font-black text-2xl shadow-xl active:scale-[0.98] transition-transform"
              >
                💭 Truth
              </button>
              <button
                onClick={() => pick("Dare")}
                className="py-8 rounded-2xl bg-gradient-to-br from-secondary/90 to-secondary text-secondary-foreground font-black text-2xl shadow-xl active:scale-[0.98] transition-transform"
              >
                🔥 Dare
              </button>
            </div>

            <button
              onClick={() => setStage("setup")}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to setup
            </button>
          </motion.div>
        )}

        {stage === "prompt" && current && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="text-center space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{currentName} chose</p>
              <h2
                className={`text-3xl font-black ${
                  current.kind === "Truth" ? "text-primary" : "text-secondary"
                }`}
              >
                {current.kind === "Truth" ? "💭 Truth" : "🔥 Dare"}
              </h2>
            </div>

            <div className="rounded-2xl p-6 bg-card border border-border shadow-lg min-h-[160px] flex items-center justify-center">
              <p className="text-xl font-semibold text-center text-card-foreground leading-snug">
                {current.prompt.text}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => pick(current.kind)}
                className="py-3 rounded-xl bg-muted text-foreground font-bold border border-border active:scale-[0.98] transition-transform"
              >
                🔄 Skip
              </button>
              <button
                onClick={nextTurn}
                className="py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold active:scale-[0.98] transition-transform"
              >
                ✅ Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
