# Monetization Setup Guide

This app uses **AdMob ads** (free tier) plus a **$1.99 "Remove Ads" in-app purchase**. Both only work in the native iOS/Android Capacitor build — never in the web preview.

## Quick summary of what's already wired up

| Where | Behavior |
|---|---|
| `src/lib/monetization.ts` | All AdMob + IAP logic. Safe no-op on web. |
| `src/pages/Settings.tsx` | Remove Ads ($1.99) + Restore Purchases buttons. |
| Gear icon (top-right tab bar) | Opens `/settings`. |
| Translator | Banner at bottom + interstitial every 10 translations. |
| Compatibility Game | Banner during setup/answers, hidden on score reveal. Interstitial every 10 completed rounds. |
| Truth or Dare | **No banners.** Interstitial every 10 prompts. |
| Global rules | No ads in the first 60 seconds of cold start. Min 30 seconds between any two interstitials. All ads disappear instantly when the user buys Remove Ads. |

The product ID for the unlock is **`remove_ads_199`** — you must create it with that exact ID in both stores.

---

## 1. AdMob — Create your account & ad units

1. Go to **https://admob.google.com** and sign up (free).
2. Add your app **twice**: once for iOS, once for Android.
3. For each platform, create **two** ad units:
   - **Banner** — adaptive banner
   - **Interstitial**
4. You'll end up with 4 ad unit IDs that look like `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY`.

### Paste them into the code

Open `src/lib/monetization.ts` and replace the `TEST_BANNER_ID` / `TEST_INTERSTITIAL_ID` placeholders inside the `AD_UNITS` object with your real IDs:

```ts
const AD_UNITS = {
  banner: {
    ios: "ca-app-pub-XXXX/YYYY",      // your iOS banner unit
    android: "ca-app-pub-XXXX/YYYY",  // your Android banner unit
  },
  interstitial: {
    ios: "ca-app-pub-XXXX/YYYY",      // your iOS interstitial unit
    android: "ca-app-pub-XXXX/YYYY",  // your Android interstitial unit
  },
};
```

Also flip both `isTesting: true` flags to `false` and change `initializeForTesting: true` to `false` before submitting to the stores.

### Add your AdMob App ID to the native projects

After `npx cap add ios` / `npx cap add android`:

**Android** — edit `android/app/src/main/AndroidManifest.xml`, inside `<application>`:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

**iOS** — edit `ios/App/App/Info.plist`:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
</array>
```
(Apple also requires the full SKAdNetwork list — copy it from https://developers.google.com/admob/ios/quick-start#update_your_infoplist )

---

## 2. Apple App Store — Create the IAP product

1. Go to **App Store Connect → My Apps → your app → Monetization → In-App Purchases**.
2. Click **+** and choose **Non-Consumable**.
3. Fill in:
   - **Reference Name:** `Remove Ads`
   - **Product ID:** `remove_ads_199` *(exact match required)*
   - **Price:** Tier $1.99 USD (Apple auto-localizes)
   - **Display name** (English): `Remove Ads`
   - **Description:** `Remove all banner and interstitial ads from the app.`
4. Add a screenshot of the purchase button (required for review).
5. Submit it for review **with your next app build**.

---

## 3. Google Play — Create the IAP product

1. Go to **Google Play Console → your app → Monetize → Products → In-app products**.
2. Click **Create product**.
3. Fill in:
   - **Product ID:** `remove_ads_199` *(exact match required, lowercase, no spaces)*
   - **Name:** `Remove Ads`
   - **Description:** `Remove all banner and interstitial ads from the app.`
   - **Default price:** $1.99 USD
4. Set status to **Active**.

> Google requires you to upload at least one signed APK/AAB to a testing track before IAP products become purchasable.

---

## 4. Build & test

```bash
npm install
npm run build
npx cap sync
npx cap open ios       # or: npx cap open android
```

### Testing IAP without paying real money
- **iOS:** Create a Sandbox tester in App Store Connect → Users and Access → Sandbox Testers. Sign out of the App Store on your test device, then purchase from inside the app — iOS will prompt you to sign in with the sandbox account.
- **Android:** Add your Gmail address as a license tester in Play Console → Setup → License testing. Upload a signed build to the **Internal Testing** track and install it from the Play Store testing link.

### Testing ads
The code currently uses Google's **test ad unit IDs** (clearly marked "Test Ad" — safe to ship for development). You **must** replace them with your real IDs before going to production, otherwise you won't earn any revenue.

---

## 5. Pre-launch checklist

- [ ] Real AdMob ad unit IDs swapped in `src/lib/monetization.ts`
- [ ] `isTesting: true` and `initializeForTesting: true` flags removed
- [ ] AdMob App ID added to `AndroidManifest.xml` and `Info.plist`
- [ ] SKAdNetwork list pasted into `Info.plist` (iOS)
- [ ] `remove_ads_199` IAP created and **approved** in both stores
- [ ] Tested a real sandbox purchase end-to-end (buy → ads disappear → restore on a fresh install brings them back removed)
- [ ] Restore Purchases button tested (Apple **requires** this — they will reject builds that don't have it)

---

## Reality check on revenue

AdMob fill rates and eCPM on a brand-new app are low for the first 2–4 weeks while Google's ML figures out your audience. Don't panic if early days look thin — it ramps up.
