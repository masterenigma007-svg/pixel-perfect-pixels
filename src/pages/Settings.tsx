import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  isAdFree,
  onAdFreeChange,
  purchaseRemoveAds,
  restorePurchases,
} from "@/lib/monetization";

export default function Settings() {
  const [adFree, setAdFree] = useState(isAdFree());
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => onAdFreeChange(setAdFree), []);

  const handleBuy = async () => {
    setBusy("buy");
    setMessage(null);
    const r = await purchaseRemoveAds();
    setMessage({ ok: r.ok, text: r.message });
    setBusy(null);
  };

  const handleRestore = async () => {
    setBusy("restore");
    setMessage(null);
    const r = await restorePurchases();
    setMessage({ ok: r.ok, text: r.message });
    setBusy(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto flex items-center px-4 py-3">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
          <h1 className="flex-1 text-center text-base font-bold">Settings</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-5 shadow-sm space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Remove Ads</h2>
              <p className="text-sm text-muted-foreground mt-1">
                One-time purchase. Banners and interstitials disappear forever on this account.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-primary">$1.99</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                one-time
              </div>
            </div>
          </div>

          {adFree ? (
            <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 text-center">
              <p className="text-sm font-semibold text-primary">✨ Ads removed — thank you!</p>
            </div>
          ) : (
            <button
              onClick={handleBuy}
              disabled={busy !== null}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-base shadow-lg active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {busy === "buy" ? "Processing…" : "Remove Ads — $1.99"}
            </button>
          )}

          <button
            onClick={handleRestore}
            disabled={busy !== null}
            className="w-full py-3 rounded-xl bg-muted text-foreground font-semibold border border-border active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {busy === "restore" ? "Restoring…" : "Restore Purchases"}
          </button>

          {message && (
            <div
              className={`rounded-xl p-3 text-sm text-center ${
                message.ok
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {message.text}
            </div>
          )}
        </motion.section>

        <section className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h2 className="text-lg font-bold mb-2">About</h2>
          <p className="text-sm text-muted-foreground">
            In-app purchases and ads are processed securely by Apple and Google. We never see your
            payment info. Your purchase is tied to your Apple ID or Google account and can be
            restored on any device you sign in with.
          </p>
        </section>

        <div className="text-center">
          <Link
            to="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
