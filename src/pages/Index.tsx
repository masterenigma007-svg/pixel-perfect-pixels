import { useState } from "react";
import { motion } from "framer-motion";
import GenderTranslator from "@/components/GenderTranslator";
import NewlywedGame from "@/components/NewlywedGame";
import TruthOrDare from "@/components/TruthOrDare";
import translatorIcon from "@/assets/translator-hero.jpg";
import newlywedIcon from "@/assets/newlywed-hero.jpg";
import truthOrDareIcon from "@/assets/truthordare-hero.jpg";

type Tab = "translator" | "game" | "tod";

const Index = () => {
  const [tab, setTab] = useState<Tab>("translator");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "translator", label: "Translator", icon: translatorIcon },
    { id: "game", label: "Newlywed", icon: newlywedIcon },
    { id: "tod", label: "Truth/Dare", icon: truthOrDareIcon },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex-1 py-2.5 flex flex-col items-center gap-1 transition-colors ${
                tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <img
                src={t.icon}
                alt={t.label}
                loading="lazy"
                width={48}
                height={48}
                className={`w-10 h-10 rounded-full object-cover border-2 transition-all ${
                  tab === t.id ? "border-primary shadow-md" : "border-border opacity-70"
                }`}
              />
              <span className="text-[11px] sm:text-xs font-bold">{t.label}</span>
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

      {tab === "translator" && <GenderTranslator />}
      {tab === "game" && <NewlywedGame />}
      {tab === "tod" && <TruthOrDare />}
    </div>
  );
};

export default Index;
