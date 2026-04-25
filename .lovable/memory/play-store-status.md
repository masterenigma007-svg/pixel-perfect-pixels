---
name: Play Store upload status
description: Current blocker and next steps for Google Play submission
type: feature
---
# Play Store submission — paused

## Blocker
Google reset the upload key. Mandatory 48-hour cooldown.
**Can upload again starting: Apr 27, 2026, 6:21:47 AM UTC.**

## Already done
- Package name changed everywhere from `app.lovable.relationshipsaver` → `com.relationshipsaver.translator`
  - `capacitor.config.ts`
  - `android/app/build.gradle` (namespace + applicationId)
  - MainActivity moved to `android/app/src/main/java/com/relationshipsaver/translator/MainActivity.java`
  - Old `android/app/src/main/java/app/` dir deleted
- GitHub Actions workflow `.github/workflows/build-android.yml` builds signed AAB successfully
- Keystore + secrets (KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_PASSWORD, KEY_ALIAS) configured and validated

## Next steps (when cooldown lifts)
1. Push latest changes to GitHub → Actions builds fresh AAB with new package name
2. Download `app-release.aab` from the workflow Artifacts
3. Play Console → Test and release → Internal testing → Create new release → Upload AAB
4. Fill release notes → Save → Review → Start rollout
