/**
 * Monetization controller — AdMob banners + interstitials + $1.99 Remove Ads IAP.
 *
 * Web preview: every method safely no-ops. All real behavior happens only inside
 * the native Capacitor build on iOS/Android.
 *
 * Setup checklist lives in MONETIZATION.md.
 */

import { Capacitor } from "@capacitor/core";

// ============================================================================
//  CONFIG — replace the TEST IDs below with your real AdMob unit IDs after
//  creating them in your AdMob dashboard. See MONETIZATION.md.
// ============================================================================

export const REMOVE_ADS_PRODUCT_ID = "remove_ads_199";

// Google's official TEST ad unit IDs (always show test ads, safe to ship for dev).
const TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
const TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

const AD_UNITS = {
  banner: {
    ios: TEST_BANNER_ID, // TODO: replace with real iOS banner unit ID
    android: TEST_BANNER_ID, // TODO: replace with real Android banner unit ID
  },
  interstitial: {
    ios: TEST_INTERSTITIAL_ID, // TODO: replace with real iOS interstitial unit ID
    android: TEST_INTERSTITIAL_ID, // TODO: replace with real Android interstitial unit ID
  },
};

// Frequency rules (locked in with user)
const INTERSTITIAL_EVERY_N_ACTIONS = 10;
const INTERSTITIAL_COOLDOWN_MS = 30_000; // Google policy: never < 30s apart
const COLD_START_GRACE_MS = 60_000; // No ads in the first 60 seconds of a fresh launch

// LocalStorage keys
const LS_AD_FREE = "monetization.adFree";

// ============================================================================
//  STATE
// ============================================================================

let initialized = false;
let isNative = false;
let adFree = false;
let bannerVisible = false;
let appLaunchTime = Date.now();
let lastInterstitialTime = 0;
const actionCounters: Record<string, number> = {};
const adFreeListeners = new Set<(adFree: boolean) => void>();

// ============================================================================
//  PUBLIC API
// ============================================================================

export function isAdFree(): boolean {
  return adFree;
}

export function onAdFreeChange(listener: (adFree: boolean) => void): () => void {
  adFreeListeners.add(listener);
  return () => adFreeListeners.delete(listener);
}

function setAdFree(value: boolean) {
  adFree = value;
  try {
    localStorage.setItem(LS_AD_FREE, value ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (value) {
    void hideBanner();
  }
  adFreeListeners.forEach((l) => l(value));
}

/**
 * Initialize ads + IAP. Safe to call multiple times. No-op on web.
 */
export async function initMonetization(): Promise<void> {
  if (initialized) return;
  initialized = true;
  appLaunchTime = Date.now();

  // Restore ad-free flag from local storage immediately (works on web + native)
  try {
    adFree = localStorage.getItem(LS_AD_FREE) === "1";
  } catch {
    /* ignore */
  }

  isNative = Capacitor.isNativePlatform();
  if (!isNative) {
    // Web preview: nothing else to do — all ad/IAP calls will no-op below.
    return;
  }

  // Native init — guarded so any failure can't crash the app.
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.initialize({
      initializeForTesting: true, // TODO: set to false for production
    });
  } catch (e) {
    console.warn("[monetization] AdMob init failed", e);
  }

  // Verify any prior purchase of remove_ads on this device
  try {
    await refreshPurchaseStatus();
  } catch (e) {
    console.warn("[monetization] purchase status refresh failed", e);
  }
}

// ----- Banner ads -----------------------------------------------------------

export async function showBanner(): Promise<void> {
  if (adFree || !isNative || bannerVisible) return;
  try {
    const { AdMob, BannerAdPosition, BannerAdSize } = await import(
      "@capacitor-community/admob"
    );
    const platform = Capacitor.getPlatform() as "ios" | "android";
    await AdMob.showBanner({
      adId: AD_UNITS.banner[platform] ?? AD_UNITS.banner.android,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: true, // TODO: remove for production
    });
    bannerVisible = true;
  } catch (e) {
    console.warn("[monetization] showBanner failed", e);
  }
}

export async function hideBanner(): Promise<void> {
  if (!isNative || !bannerVisible) return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.hideBanner();
    bannerVisible = false;
  } catch (e) {
    console.warn("[monetization] hideBanner failed", e);
  }
}

// ----- Interstitial counter -------------------------------------------------

/**
 * Call this when the user completes a meaningful "action" inside a feature.
 * Every Nth call (per feature) will trigger an interstitial, subject to:
 *   - ad-free unlocked  → never show
 *   - first 60 seconds  → never show
 *   - last interstitial < 30s ago → never show
 */
export async function maybeShowInterstitial(featureKey: string): Promise<void> {
  if (adFree) return;

  const count = (actionCounters[featureKey] ?? 0) + 1;
  actionCounters[featureKey] = count;

  if (count % INTERSTITIAL_EVERY_N_ACTIONS !== 0) return;
  if (Date.now() - appLaunchTime < COLD_START_GRACE_MS) return;
  if (Date.now() - lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) return;

  await showInterstitialNow();
}

async function showInterstitialNow(): Promise<void> {
  if (!isNative) {
    // Web stub — useful while developing in the preview
    console.info("[monetization] (web stub) would show interstitial now");
    lastInterstitialTime = Date.now();
    return;
  }
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    const platform = Capacitor.getPlatform() as "ios" | "android";
    await AdMob.prepareInterstitial({
      adId: AD_UNITS.interstitial[platform] ?? AD_UNITS.interstitial.android,
      isTesting: true, // TODO: remove for production
    });
    await AdMob.showInterstitial();
    lastInterstitialTime = Date.now();
  } catch (e) {
    console.warn("[monetization] showInterstitial failed", e);
  }
}

// ----- In-app purchase: Remove Ads ($1.99) ----------------------------------

export interface PurchaseResult {
  ok: boolean;
  message: string;
}

export async function purchaseRemoveAds(): Promise<PurchaseResult> {
  if (!isNative) {
    return {
      ok: false,
      message:
        "In-app purchases only work in the native iOS/Android build. Run `npx cap sync` and launch via Xcode or Android Studio.",
    };
  }
  try {
    const { Purchases } = await import("@capgo/capacitor-purchases");
    const result: any = await Purchases.purchaseProduct({
      productIdentifier: REMOVE_ADS_PRODUCT_ID,
      productType: 1, // 1 = non-consumable / non-renewing
    });
    // Plugin shapes vary by version — be defensive.
    const ok = result?.customerInfo?.entitlements?.active
      ? Object.keys(result.customerInfo.entitlements.active).length > 0
      : true;
    if (ok) {
      setAdFree(true);
      return { ok: true, message: "Ads removed. Thank you for supporting the app! 💛" };
    }
    return { ok: false, message: "Purchase did not complete." };
  } catch (e: any) {
    const msg = e?.message || "Purchase cancelled or failed.";
    return { ok: false, message: msg };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!isNative) {
    return {
      ok: false,
      message:
        "Restore Purchases only works in the native iOS/Android build.",
    };
  }
  try {
    const { Purchases } = await import("@capgo/capacitor-purchases");
    const info: any = await Purchases.restorePurchases();
    const active = info?.customerInfo?.entitlements?.active ?? {};
    const hasRemoveAds =
      Object.keys(active).length > 0 ||
      (Array.isArray(info?.activeSubscriptions) &&
        info.activeSubscriptions.some((id: string) => id === REMOVE_ADS_PRODUCT_ID));
    if (hasRemoveAds) {
      setAdFree(true);
      return { ok: true, message: "Purchases restored. Ads removed." };
    }
    return { ok: false, message: "No previous purchase found for this account." };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Restore failed." };
  }
}

async function refreshPurchaseStatus(): Promise<void> {
  if (!isNative) return;
  try {
    const { Purchases } = await import("@capgo/capacitor-purchases");
    const info: any = await Purchases.getCustomerInfo?.();
    const active = info?.customerInfo?.entitlements?.active ?? info?.entitlements?.active;
    if (active && Object.keys(active).length > 0) {
      setAdFree(true);
    }
  } catch {
    /* ignore — fall back to localStorage flag */
  }
}
