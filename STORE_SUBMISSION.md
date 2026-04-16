# 📱 App Store Submission Guide — Relationship Saver

Your app is now cleaned up and configured for native publishing via Capacitor.

## What I just changed
- **Removed dead code**: `serverFemaleVoice.ts`, `offlineFemaleVoice.ts`, `TimeZoneClock.tsx`, `NavLink.tsx`.
- **Female voice**: now uses the device's built-in human TTS (Samantha on iOS, Aria on Win11, Google UK Female on Android) — free, offline, no billing.
- **Capacitor config**: removed the live-reload `server.url` (only used for dev). Added clean `appId` (`app.lovable.relationshipsaver`) and splash-screen config. **You must rebuild native projects after this.**
- **SEO + PWA meta**: proper title, description, theme-color, apple-touch-icon, OG/Twitter tags, viewport with `viewport-fit=cover` for iPhone notch support.

---

## 🏗️ Step 1 — Get the project on your computer

You need a Mac for iOS, and either Mac/Windows/Linux for Android.

1. In Lovable, click **GitHub → Connect to GitHub** (top right) and push the repo.
2. On your computer:
   ```bash
   git clone <your-repo-url>
   cd <project>
   npm install
   npm run build
   ```

## 📲 Step 2 — Add native platforms

```bash
npx cap add ios       # macOS only — needs Xcode 15+
npx cap add android   # needs Android Studio
npx cap sync
```

Whenever you change the web code, repeat:
```bash
npm run build && npx cap sync
```

---

## 🍎 iOS — Apple App Store

### Prerequisites
- **Mac with Xcode 15+**
- **Apple Developer Program**: $99/year — https://developer.apple.com/programs/
- App Store Connect account (included)

### Build
```bash
npx cap open ios
```
Xcode will open. Then:
1. Select the **App** target → **Signing & Capabilities** → check **Automatically manage signing** → pick your Team.
2. Set **Bundle Identifier** to `app.lovable.relationshipsaver` (or your own reverse-domain).
3. Set **Display Name** = `Relationship Saver`.
4. Set **Version** = `1.0.0`, **Build** = `1`.
5. Add an **App Icon**: drag a 1024×1024 PNG into `App/Assets.xcassets/AppIcon`.
6. Top bar: select **Any iOS Device (arm64)** → **Product → Archive**.
7. When the Organizer opens → **Distribute App → App Store Connect → Upload**.

### Submit
1. Go to https://appstoreconnect.apple.com → **My Apps → +** → New App.
2. Fill: name, primary language (English), bundle ID, SKU.
3. **App Information**: category = *Entertainment* (subcategory *Lifestyle* works too).
4. **Age Rating**: Truth-or-Dare prompts are PG-13. Mark **12+** (Mature/Suggestive Themes = *Infrequent/Mild*, no sexual content, no nudity).
5. **Pricing**: Free.
6. **Privacy**: declare you collect *no* user data (everything is local-storage only). Privacy policy URL required → host a simple one (see `PRIVACY.md` template below).
7. Add screenshots: **6.7" iPhone (1290×2796)** and **6.5" iPhone (1242×2688)**. Take from a simulator with `Cmd+S`.
8. **App Review Information**: provide a demo account if needed (not needed here — no login).
9. Select build → **Submit for Review**. Review takes 24–48h typically.

---

## 🤖 Android — Google Play Store

### Prerequisites
- **Android Studio** (free) — https://developer.android.com/studio
- **Google Play Developer**: $25 one-time — https://play.google.com/console/signup

### Build a signed AAB
```bash
npx cap open android
```
Android Studio opens. Then:
1. **Build → Generate Signed Bundle / APK → Android App Bundle**.
2. Create a new keystore (save the `.jks` file and password somewhere safe — **you cannot recover it**).
3. Select **release** variant → Finish. Output goes to `android/app/release/app-release.aab`.

### App icon & branding
- Replace `android/app/src/main/res/mipmap-*/ic_launcher.png` with your icon (use Android Studio's **Image Asset** wizard: right-click `res` → New → Image Asset).
- Update `android/app/src/main/res/values/strings.xml` → `<string name="app_name">Relationship Saver</string>`.

### Submit
1. https://play.google.com/console → **Create app**.
2. Default language = English (US), app name = `Relationship Saver`, type = App, Free.
3. Complete the **Dashboard** checklist:
   - **App content**: privacy policy URL, ads = No, content rating questionnaire (suggestive themes only, no sex/nudity → expect *Teen*), target audience = 13+, data safety = "no data collected".
   - **Store listing**: short description (80 chars), full description (4000 chars), 2 screenshots min (phone 1080×1920+), feature graphic (1024×500), app icon (512×512).
4. **Production → Create new release** → upload `.aab` → roll out.

---

## 📄 Privacy Policy (required by both stores)

This app collects **no personal data**. All history is stored in your browser/device localStorage. No analytics, no servers, no third parties (besides device TTS).

Host this on any free static page (GitHub Pages, Notion, Carrd) and paste the URL into both store listings.

Sample text:
> **Relationship Saver Privacy Policy**
> Effective: <date>
>
> Relationship Saver does not collect, store, or share any personal information. All translation history and game state are saved locally on your device only. The app uses your device's built-in text-to-speech engine and microphone (for voice input) — neither of these transmit data off your device. Contact: <your email>.

---

## ⚠️ Things to double-check before submitting
- [ ] Replace placeholder app icons with real branded 1024×1024 (iOS) and 512×512 (Android) icons.
- [ ] Take 4–6 screenshots on a real device or simulator for each store.
- [ ] Host a privacy policy and have its URL ready.
- [ ] Truth-or-Dare prompts are PG-13 → both stores will rate **12+/Teen**.
- [ ] Test on a real device: `npx cap run ios` / `npx cap run android`.

---

## 🔁 When you push web updates later
Web-only changes (text, UI, prompts) → no resubmission needed if you ship them as an OTA web bundle later. For now, every change requires:
```bash
npm run build && npx cap sync
```
…then rebuild + re-upload from Xcode / Android Studio with an incremented version.
