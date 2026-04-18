import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { translate, suggestions } from "@/data/translations";
import type { Direction, AgeGroup } from "@/data/translations";
import { speakSarcastic, stopSpeaking, preloadVoices } from "@/lib/sarcasticVoiceEngine";
import { maybeShowInterstitial } from "@/lib/monetization";
import micIcon from "@/assets/mic-icon.png";
import speakerIcon from "@/assets/speaker-icon.png";


interface HistoryItem {
  input: string;
  output: string;
  direction: Direction;
  ageGroup: AgeGroup;
  timestamp: number;
}

const AGE_GROUPS: { id: AgeGroup; label: string }[] = [
  { id: "teen", label: "Teen" },
  { id: "young-adult", label: "Young Adult" },
  { id: "adult", label: "Adult" },
  { id: "middle-aged", label: "Middle-Aged" },
  { id: "senior", label: "Senior" },
];

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem("gt-history") || "[]");
  } catch {
    return [];
  }
}

function saveHistory(h: HistoryItem[]) {
  localStorage.setItem("gt-history", JSON.stringify(h.slice(0, 50)));
}

export default function GenderTranslator() {
  const [direction, setDirection] = useState<Direction>("menToWomen");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toast, setToast] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const recognitionRef = useRef<any>(null);
  const doTranslateRef = useRef<((text: string, dir?: Direction, age?: AgeGroup) => void) | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    preloadVoices();
    window.speechSynthesis.onvoiceschanged = () => preloadVoices();
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2500);
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onresult = (e: SpeechRecognitionEvent) => {
        const transcript = e.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
        doTranslateRef.current?.(transcript);
      };
      rec.onerror = () => setIsRecording(false);
      rec.onend = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, []);

  const doTranslate = useCallback(
    (text: string, dir?: Direction, age?: AgeGroup) => {
      const d = dir ?? direction;
      const a = age ?? ageGroup;
      const trimmed = text.trim();
      if (!trimmed) return;
      setIsTranslating(true);
      setTimeout(() => {
        const result = translate(trimmed, d, a);
        setOutput(result);
        setIsTranslating(false);
        const item: HistoryItem = {
          input: trimmed,
          output: result,
          direction: d,
          ageGroup: a,
          timestamp: Date.now(),
        };
        setHistory((prev) => {
          const updated = [item, ...prev].slice(0, 50);
          saveHistory(updated);
          return updated;
        });
        // Every 10th translation may show an interstitial (no-op on web).
        void maybeShowInterstitial("translator");
      }, 400);
    },
    [direction, ageGroup]
  );

  useEffect(() => {
    doTranslateRef.current = doTranslate;
  });

  const handleTranslate = () => doTranslate(input);

  const handleMic = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      showToast("Speech recognition not supported in this browser");
      return;
    }
    if (isRecording) {
      rec.stop();
      setIsRecording(false);
    } else {
      rec.start();
      setIsRecording(true);
    }
  };

  const handleSpeak = useCallback(() => {
    if (!output) return;
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    speakSarcastic({
      text: output,
      direction,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    setIsSpeaking(true);
  }, [output, direction, isSpeaking]);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => showToast("Copied to clipboard!"));
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    stopSpeaking();
    setIsSpeaking(false);
  };

  const handleSuggestion = (phrase: string) => {
    setInput(phrase);
    doTranslate(phrase);
  };

  const handleHistoryItem = (item: HistoryItem) => {
    setDirection(item.direction);
    setAgeGroup(item.ageGroup);
    setInput(item.input);
    setOutput(item.output);
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("gt-history");
  };

  const handleDirectionChange = (dir: Direction) => {
    setDirection(dir);
    setOutput("");
  };

  const ageIndex = AGE_GROUPS.findIndex((a) => a.id === ageGroup);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <header className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mirage-text drop-shadow-sm"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Relationship Saver Translator
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
            className="text-muted-foreground text-sm mt-2 italic"
          >
            Comedically translating what men and women really mean
          </motion.p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
          className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.60)" }}
        >
          <div className="h-1.5 bg-gradient-to-r from-primary to-secondary" />

          <div className="p-6 space-y-5">
            {/* Direction toggle */}
            <div className="flex gap-3">
              <motion.button
                onClick={() => handleDirectionChange("menToWomen")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex-1 py-3 rounded-2xl font-bold text-sm overflow-hidden transition-all duration-300"
                style={{
                  background: direction === "menToWomen"
                    ? "linear-gradient(135deg, #6ee7b7 0%, #10b981 40%, #065f46 100%)"
                    : "linear-gradient(135deg, #1f4037 0%, #1a3a2e 100%)",
                  boxShadow: direction === "menToWomen"
                    ? "0 0 24px rgba(16,185,129,0.55), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)"
                    : "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                  border: direction === "menToWomen"
                    ? "1px solid rgba(110,231,183,0.5)"
                    : "1px solid rgba(16,185,129,0.2)",
                  color: direction === "menToWomen" ? "#fff" : "#4ade80",
                }}
              >
                {direction === "menToWomen" && (
                  <span className="absolute inset-0 pointer-events-none" style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 60%)",
                    borderRadius: "inherit",
                  }} />
                )}
                <span className="relative z-10 tracking-wide">Men → Women</span>
              </motion.button>

              <motion.button
                onClick={() => handleDirectionChange("womenToMen")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex-1 py-3 rounded-2xl font-bold text-sm overflow-hidden transition-all duration-300"
                style={{
                  background: direction === "womenToMen"
                    ? "linear-gradient(135deg, #e9d5ff 0%, #a855f7 40%, #581c87 100%)"
                    : "linear-gradient(135deg, #2e1a47 0%, #1e1030 100%)",
                  boxShadow: direction === "womenToMen"
                    ? "0 0 24px rgba(168,85,247,0.55), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)"
                    : "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                  border: direction === "womenToMen"
                    ? "1px solid rgba(233,213,255,0.5)"
                    : "1px solid rgba(168,85,247,0.2)",
                  color: direction === "womenToMen" ? "#fff" : "#c084fc",
                }}
              >
                {direction === "womenToMen" && (
                  <span className="absolute inset-0 pointer-events-none" style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 60%)",
                    borderRadius: "inherit",
                  }} />
                )}
                <span className="relative z-10 tracking-wide">Women → Men</span>
              </motion.button>
            </div>

            {/* Age group slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Age Group</p>
                <span className="text-sm font-semibold text-secondary">
                  {AGE_GROUPS[ageIndex].label}
                </span>
              </div>
              <div className="relative px-1">
                <input
                  type="range"
                  min={0}
                  max={AGE_GROUPS.length - 1}
                  step={1}
                  value={ageIndex}
                  onChange={(e) => setAgeGroup(AGE_GROUPS[Number(e.target.value)].id)}
                  className="age-slider w-full"
                  style={{ "--val": ageIndex } as React.CSSProperties}
                />
                <div className="flex justify-between mt-2">
                  {AGE_GROUPS.map((ag) => (
                    <button
                      key={ag.id}
                      onClick={() => setAgeGroup(ag.id)}
                      className={`text-[10px] font-medium transition-colors duration-200 ${
                        ageGroup === ag.id ? "text-secondary" : "text-muted-foreground/50"
                      }`}
                    >
                      {ag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input */}
            <div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleTranslate();
                }}
                placeholder="Type or say something to translate..."
                className="w-full min-h-[90px] p-4 border-2 border-border rounded-xl text-sm resize-none focus:outline-none focus:border-primary transition-colors bg-muted text-foreground placeholder-muted-foreground"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleMic}
                title={isRecording ? "Stop recording" : "Record speech"}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? "bg-primary text-primary-foreground animate-pulse shadow-lg"
                    : "bg-secondary text-secondary-foreground hover:opacity-90 hover:scale-105"
                }`}
              >
                <img src={micIcon} alt="Microphone" className="w-11 h-11 object-contain" />
              </button>

              <motion.button
                onClick={handleTranslate}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-gradient-to-r from-primary to-pink-500 text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                Translate
              </motion.button>

              <button
                onClick={handleSpeak}
                title={isSpeaking ? "Stop speaking" : "Hear translation"}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isSpeaking
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:opacity-90 hover:scale-105"
                }`}
              >
                {isSpeaking ? <span className="text-2xl leading-none">■</span> : <img src={speakerIcon} alt="Speaker" className="w-11 h-11 object-contain" />}
              </button>

              <button
                onClick={handleClear}
                title="Clear all"
                className="w-11 h-11 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground text-lg transition-all hover:scale-105"
              >
                🗑️
              </button>
            </div>

            {/* Output */}
            <div>
              <AnimatePresence mode="wait">
                {isTranslating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="min-h-[90px] p-4 border-2 border-secondary rounded-xl bg-secondary/10 flex items-center justify-center"
                  >
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2.5 h-2.5 rounded-full bg-secondary"
                          animate={{ y: [-4, 4, -4] }}
                          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="output"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`min-h-[90px] p-4 border-2 rounded-xl text-sm leading-relaxed transition-all ${
                      output
                        ? "border-secondary bg-muted text-foreground"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {output || "Translation will appear here..."}
                  </motion.div>
                )}
              </AnimatePresence>
              {output && !isTranslating && (
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={handleCopy}
                    className="text-xs bg-muted-foreground/20 hover:bg-muted-foreground/30 text-foreground px-2.5 py-1 rounded-md transition-all"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            {/* Suggestions */}
            <div className="bg-muted border border-border rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground mb-3">Try these phrases:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions[direction].map((phrase) => (
                  <button
                    key={phrase}
                    onClick={() => handleSuggestion(phrase)}
                    className="bg-card border border-border hover:border-primary hover:bg-primary/10 text-foreground/70 hover:text-primary text-xs px-3 py-1.5 rounded-full transition-all"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Translation History
                  </p>
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                  {history.map((item, i) => (
                    <button
                      key={item.timestamp + i}
                      onClick={() => handleHistoryItem(item)}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <p className="text-xs font-semibold text-foreground truncate">
                        {item.input}
                      </p>
                      <p className="text-xs text-primary italic truncate mt-0.5">
                        {item.output}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {item.direction === "menToWomen" ? "Men → Women" : "Women → Men"} ·{" "}
                        {item.ageGroup}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <footer className="text-center mt-6 text-xs text-muted-foreground italic">
          This is a comedic app and doesn't represent real communication patterns.
        </footer>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card text-foreground text-sm px-5 py-2.5 rounded-full shadow-lg z-50 border border-border"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
