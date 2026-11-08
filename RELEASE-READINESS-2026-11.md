# Relationship Saver Translator: Play Billing 8 release readiness
Updated: 2026-11-07 (Mountain Time)

## Scope and repository

- **Only app:** Relationship Saver Translator, `com.relationshipsaver.translator`.
- **Unchanged:** Retro Masters and Bible Champions.
- **Google warning:** uploaded version code 2 (1.0), Production and Closed testing – Alpha, contained Play Billing 7.x; the extended update deadline was November 1, 2026.
- **Baseline:** commit `10a1ae05b03914e7210e671436ae64281bebc08b` (matching app ID/version code 2 but exact uploaded AAB revision unproven).
- **Billing 8 merge:** PR #1 was already merged to main October 28. Main at `45817901957e20baf30f0d74aeec1f6920d6c21a` uses version code 4.
- **Follow-up:** draft PR #2, branch `fix/relationship-saver-one-time-billing-readiness`, reserves version code **5** and remains UNMERGED / NOT RELEASED.

## Verified existing signed v4 bundle (not v5)

Retrieved from GitHub Actions run [40664928980](https://github.com/masterenigma007-svg/pixel-perfect-pixels/actions/runs/40664928980), artifact `app-release-bundle` (signed `app-release.aab`). Inspection of the actual ZIP-based AAB, not just its source, confirms:

- JAR signature **valid** under the embedded self-signed upload certificate (`jarsigner -verify`).
- Package: `com.relationshipsaver.translator`; **versionCode 4** (compiled manifest); optional microphone hardware.
- Packaged `base/root/billing.properties`: `version=8.0.0`, `billing_client=8.0.0`.
- Packaged manifest: `com.google.android.play.billingclient.version = 8.0.0`, `com.android.vending.BILLING`.
- AAB SHA256: `091a36b7073d843cae0aa233b872aa3c9d2a58c90746270adfcdf3c2fe8084d7`.
- **Upload signer** SHA256: `12:C4:AB:B7:2E:B3:88:B5:93:7A:88:F3:E3:D8:5A:CD:88:C0:C6:15:E8:C5:A9:0E:E2:F9:10:03:56:BC:D7:22`. Match this to the **upload key certificate**, not Google's Play app-signing certificate.
- This bundle is NOT proof that Google Play accepted a release. No Console upload or production rollout was performed.

## Fixes in draft version 5

- Keep pinned `@squareetlabs/capacitor-subscriptions@1.0.25` and the deterministic `patch-package` Billing 8.0.0 migration.
- Android `getProductDetails`, `purchaseProduct`, and `getCurrentEntitlements` now use `INAPP`, not `SUBS`, for intended permanent product `remove_ads_199`.
- Handle multiple one-time offers, native billing-flow errors and an unavailable product; do not claim that opening the purchase dialog means payment completed.
- Only a `PURCHASED` item grants a local entitlement; `PENDING` purchases do not. Acknowledge new or interrupted completed purchases and handle already-acknowledged purchases.
- Show the price returned by Play and disable the purchase button if the store does not expose the product; retain **Restore Purchases**.
- Install the native purchase listener before entitlement refresh; re-check entitlements after Android purchase callbacks.
- Add Vitest cases for available, missing, and connecting Play products. Require deterministic `npm ci` in the signed workflow (no fallback to changing dependency resolutions), and add AAB signature/Billing-metadata inspection.
- Update obviously outdated privacy policy statements that claimed the app contains no ads, third-party ad SDK, or purchases.

## What cannot be validated without Play Console and license testing

1. **Decision about sales:** The last live-console inspection on October 28 found zero one-time products and zero subscriptions. To sell Remove Ads, create/activate ONE-TIME non-consumable `remove_ads_199`, then set/confirm the $1.99 intended price and region availability. If keeping sales disabled for now, the candidate disables its unavailable purchase button.
2. Use licensed test accounts and an internal/closed Play test release to test purchase success, cancellation, pending-to-completed, pending-to-cancelled, acknowledgement, restore on reinstall/device, refunds and existing entitlements. Do not use real charges for these tests.
3. **Security:** The current entitlement check is client-side and is not server-verified. Before enabling a live paid product, implement Play Developer API purchase-token verification on a protected server and keep Play's purchase token/credentials off the client.
4. **Owner approval and release artifact:** PR #2 must pass its current CI; review intended features against the existing **installed** version 2. Only after owner approval should a fresh signed version **5** AAB be built and its actual contents/signing certificate checked against the Console upload certificate.
5. The `android/app/upload-keystore.jks` is tracked in the **public repository**. Treat it as potentially exposed; rotate/re-secure the Play **upload key** through Google Play's approved key-reset process before relying on it long term, and remove it from version control/history according to a credential-remediation plan. Do not place passwords or Play signing secrets in the repository.
6. **Ads and privacy:** Source currently uses Google **test AdMob** IDs. Replace them with approved actual configuration before live monetization, and ensure Play Data safety and the in-app privacy policy accurately describe Google Mobile Ads collection/sharing. The policy text change in the draft needs owner's review.
7. **Play release:** Check both Production and Closed testing – Alpha policy alerts. Upload reviewed releases to the appropriate tracks, submit/review Play declarations and rollout, then confirm Google actually clears the Billing deprecation warning.

## Safety

- This document, code branch and GitHub test builds **do not upload to Play**.
- Leave `main`, Retro Masters and Bible Champions untouched until the owner authorizes changes.
- A draft PR passing Android compilation is not a substitute for testing a real Play purchase and installing the app on a device.

Official references:
- https://developer.android.com/google/play/billing/deprecation-faq
- https://developer.android.com/google/play/billing/integrate
- https://developers.google.com/admob/android/privacy/play-data-disclosure
