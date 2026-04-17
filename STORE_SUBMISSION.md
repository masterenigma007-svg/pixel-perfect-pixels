# 📱 App Store Submission Checklist — Relationship Saver

## ✅ What's been prepared in this project

### App identity
- **App name:** Relationship Saver
- **Bundle ID / App ID:** `app.lovable.relationshipsaver`
- **Version:** 1.0.0
- **Categories:** Entertainment, Lifestyle, Social
- **Theme color:** `#1a1330` (deep navy purple — matches splash & icon background)

### Generated assets
- **Master icon:** `src/assets/app-icon-master.jpg` (1024×1024)
- **Web/PWA icons:** `public/icons/icon-{192,256,384,512}.png`
- **Maskable icon:** `public/icons/maskable-512.png`
- **Apple touch icon:** `public/apple-touch-icon.png` (180×180)
- **Favicons:** `public/favicon.png`, `public/favicon-32.png`
- **Marketing screenshots:** `/mnt/documents/marketing-screenshots/` (iOS 6.7" & Android sizes)

### Configuration
- **`capacitor.config.ts`** — appId, splash screen, status bar configured
- **`public/manifest.webmanifest`** — full PWA manifest with all icon sizes
- **`index.html`** — full SEO meta tags, Open Graph, Twitter card, JSON-LD schema, theme-color

### Backend & security
- ✅ TTS cache bucket writes locked down to service role
- ✅ No user authentication required (no auth/RLS surface for users)
- ✅ Privacy policy live at `/privacy` with contact email `masterenigma007@gmail.com`

---

## 🚀 Native build — what YOU need to do (one-time)

The Capacitor project is fully wired up in code. To produce the actual `.ipa` (iOS) and `.aab` (Android) files for submission you need to run the build on a Mac (for iOS) and/or a machine with Android Studio.

```bash
# 1. Push this Lovable project to your own GitHub, then clone it locally
git clone <your-fork-url>
cd <project>
npm install

# 2. Add the native platforms (one-time)
npx cap add ios
npx cap add android

# 3. Build the web assets and sync them into the native projects
npm run build
npx cap sync

# 4a. iOS — open in Xcode, set signing team, archive, upload to App Store Connect
npx cap open ios

# 4b. Android — open in Android Studio, generate signed AAB, upload to Play Console
npx cap open android
```

---

## 📋 Apple App Store submission requirements

| Item | Status / where |
|---|---|
| Apple Developer account ($99/yr) | ⚠️ You need this |
| App Store Connect listing created | ⚠️ Manual |
| Bundle ID matches `app.lovable.relationshipsaver` | ✅ Set in `capacitor.config.ts` |
| App icon (1024×1024 PNG, no alpha) | ✅ `src/assets/app-icon-master.jpg` |
| 6.7" screenshots (1290×2796) | ✅ `/mnt/documents/marketing-screenshots/ios-6.7/` |
| Privacy policy URL | ✅ `https://pixel-perfect-clone-5302.lovable.app/privacy` |
| Support URL | ⚠️ Reuse the privacy URL or create a contact page |
| Age rating | Suggested: **17+** (Truth or Dare contains adult prompts) |
| Description, keywords, promotional text | See "Listing copy" below |
| Encryption export compliance | Select **"None of the algorithms"** unless you add custom crypto |

## 📋 Google Play Store submission requirements

| Item | Status / where |
|---|---|
| Google Play Console account ($25 one-time) | ⚠️ You need this |
| 512×512 PNG icon | ✅ `public/icons/icon-512.png` |
| Feature graphic (1024×500) | ⚠️ Generate one |
| Phone screenshots (1080×2340) | ✅ `/mnt/documents/marketing-screenshots/android/` |
| Privacy policy URL | ✅ `https://pixel-perfect-clone-5302.lovable.app/privacy` |
| Content rating questionnaire | Answer truthfully — Truth or Dare has adult content |
| Data safety form | All data stays in the app — no PII collected |

---

## ✍️ Listing copy (ready to paste)

**Title (30 chars):** Relationship Saver

**Subtitle (30 chars):** Translator & Couples Games

**Promotional text (170 chars):**
What does she really mean by "I'm fine"? What's he really thinking when he says "5 more minutes"? Translate it. Then play the games. Survive the relationship.

**Description:**
> 💬 **Gender Translator** — Sarcastically decode what men and women actually mean by age group. Hilarious. Painfully accurate.
>
> 💕 **Compatibility Game** — Both partners type honest answers to questions about each other. We score adjective similarity. Pick Easy, Medium, or Hard.
>
> 🔥 **Truth or Dare** — Hundreds of prompts from spicy to filthy. For couples. For game nights. For "we need new material."
>
> Three apps in one. No ads. No subscriptions. No nonsense.

**Keywords (iOS, 100 chars total):**
couples,relationship,game,translator,truth,dare,newlywed,humor,partner,date night,sarcastic

---

## 🔐 Final pre-submission checklist

- [ ] Test build on a real iOS device
- [ ] Test build on a real Android device
- [ ] Verify Truth or Dare content matches your declared age rating
- [ ] Generate 1024×500 Play Store feature graphic
- [ ] Confirm `appId` matches what you registered in App Store Connect / Play Console
- [ ] Increment `version` in package.json before each store update

---

## 🌐 Web/PWA fallback — already live

Users can install the web app directly from their phone browser:
- **iOS:** Safari → Share → Add to Home Screen
- **Android:** Chrome → menu → Install App

The PWA manifest and icons are already wired up — no service worker, no extra setup needed.
