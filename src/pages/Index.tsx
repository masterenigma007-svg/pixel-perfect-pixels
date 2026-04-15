import { useState } from "react";
import { motion } from "framer-motion";
import GenderTranslator from "@/components/GenderTranslator";
import NewlywedGame from "@/components/NewlywedGame";

type Tab = "translator" | "game";

const Index = () => {
  const [tab, setTab] = useState<Tab>("translator");

  return (
    <div className="min-h-screen bg-background">
      {/* Tab bar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto flex">
          {([
            { id: "translator" as Tab, label: "🗣️ Translator", emoji: "🗣️" },
            { id: "game" as Tab, label: "💍 Newlywed Game", emoji: "💍" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex-1 py-3.5 text-sm font-bold transition-colors ${
                tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "translator" ? <GenderTranslator /> : <NewlywedGame />}
    </div>
  );
};

export default Index;
