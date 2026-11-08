import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  isAdFree,
  getRemoveAdsOffer,
  REMOVE_ADS_UNAVAILABLE_MESSAGE,
  onAdFreeChange,
  purchaseRemoveAds,
  restorePurchases,
} from "@/lib/monetization";
import { getTheme, setTheme, onThemeChange, type ThemePref } from "@/lib/theme";
import type { RemoveAdsOffer } from "@/lib/monetization";

export default function Settings() {
  const [adFree, setAdFree] = useState(isAdFree());
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [theme, setThemeState] = useState<ThemePref>(getTheme());
  const [offer, setOffer] = useState<RemoveAdsOffer>({ status: "unavailable", message: REMOVE_ADS_UNAVAILABLE_MESSAGE });

  useEffect(() => onAdFreeChange(setAdFree), []);
  useEffect(() => onThemeChange(setThemeState), []);
  useEffect(() => {
    let active = true;
    const checkOffer = async () => {
      let result = await getRemoveAdsOffer();
      for (let attempt = 0; attempt < 4 && result.status === "connecting" && active; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        if (active) result = await getRemoveAdsOffer();
      }
      if (active) setOffer(result);
    };
    void checkOffer();
    return () => { active = false; };
  }, []);

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

  const themeOptions: { id: ThemePref; label: string; icon: string }[] = [
    { id: "light", label: "Light", icon: "☀️" },
    { id: "dark", label: "Dark", icon: "🌙" },
    { id: "system", label: "System", icon: "📱" },
  ];

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border safe-top">
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
        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-5 shadow-sm space-y-4"
        >
          <div>
            <h2 className="text-lg font-bold">Appearance</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose how the app looks. "System" follows your phone's theme.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97] ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow"
                      : "bg-muted text-foreground border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-xl leading-none mb-1">{opt.icon}</div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Remove Ads */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-5 shadow-sm space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Remove Ads</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Purchasing is temporarily unavailable while we update Google Play Billing.
                All translator and game features remain available.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-primary">{offer.status === "available" ? offer.price : "—"}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {offer.status === "available" ? "one-time" : "not available yet"}
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
              disabled={busy !== null || offer.status !== "available"}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-base shadow-lg active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {busy === "buy" ? "Processing…" : offer.status === "available" ? `Remove Ads — ${offer.price}` : "Remove Ads — Not Available"}
            </button>
          )}

          {offer.status !== "available" && !adFree && (
            <p className="text-xs text-muted-foreground text-center" role="status">
              {offer.message}
            </p>
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
