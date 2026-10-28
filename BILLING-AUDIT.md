# Play Billing audit — October 28, 2026

## Live Play Console findings

Signed-in developer account: DanDeeman007. The only app with a policy warning is
Relationship Saver Translator (`com.relationshipsaver.translator`). Its issue is
“App must use Google Play Billing Library version 8.0.0 or later.”

| App | Version | Track | Policy result |
| --- | --- | --- | --- |
| Relationship Saver Translator | 2 (1.0) | Production | Billing warning |
| Relationship Saver Translator | 2 (1.0) | Closed testing – Alpha | Billing warning |
| Retro Masters (`com.retromasters.trivia`) | Not flagged | Closed testing | No issues found |
| Bible Champions Game (`com.biblechampions.app`) | Not flagged | Production | No issues found |

The reviewed-bundles dialog lists both affected Relationship Saver entries with
target SDK 36 and first publication May 8, 2026. The extension is already granted
until November 1, 2026. This prevents future updates from being rejected; it is
not evidence that current installations will stop working.

Issue: https://play.google.com/console/u/0/developers/7572412830635223429/app/4971993056796547712/policy-center/issues/4986788082679209858/details

## Source match and correction

This repository's Capacitor and Gradle application IDs match the flagged package;
Gradle version code 2 / name 1.0 also matches. The installed native source from
`@squareetlabs/capacitor-subscriptions@1.0.25` declares Billing 7.1.1. This identifies
an actual deprecated dependency in the matching project, although a byte-for-byte
match to the previously uploaded AAB has not been established.

The dependency is pinned to 1.0.25 and a checked-in patch upgrades Billing to 8.0.0,
adapts both product-detail callbacks to `QueryProductDetailsResult`, and handles
failed/empty product queries without indexing an empty list. The removed purchase
history API now returns FEATURE_NOT_SUPPORTED with guidance to use server-side
history. The app has no calls to that legacy method; active entitlement queries
remain in place. This avoids misrepresenting active purchases as complete history.
`npm ci --legacy-peer-deps` applies the patch and fails if it cannot apply.

Candidate version code is 3. A Gradle gate checks the selected release Billing
dependency. The verification workflow builds only a debug APK, checks the merged
release manifest, and does not access signing credentials or publish to Play.
The npm lockfile is synchronized because it previously disagreed with package.json
(including Capacitor major versions and missing plugin entries).

## Required before any production or Alpha update

- Review this patch and verify the original app's features against the candidate.
- Complete native compilation, resolved dependency and merged-manifest checks.
- Test product lookup, purchase success/cancellation, pending purchases, restoration,
  existing entitlements and server verification with Play license testers.
- Confirm configured product types. The existing native plugin queries SUBS while
  the web code describes a one-time Remove Ads product; this pre-existing mismatch
  needs validation against actual Console product configuration before release.
- Verify signing certificate and build the signed AAB; inspect the packaged billing
  metadata and version code. A debug APK is not a release candidate AAB.
- Obtain the owner's approval before any upload, replacement, merge to the release
  branch, or publication. Both affected active tracks must be addressed as appropriate.

Retro Masters' GitHub editable source is explicitly an independent reconstruction,
not the verified original source. It must not replace the existing game as part
of this billing fix. No Play changes were submitted during this investigation.

References:
- https://developer.android.com/google/play/billing/deprecation-faq
- https://developer.android.com/google/play/billing/migrate-gpblv8
