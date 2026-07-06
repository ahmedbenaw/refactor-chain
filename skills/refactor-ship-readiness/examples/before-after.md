# Worked example — a refactor that would get the app rejected

A React Native + native iOS app. The refactor consolidated permission-prompt code and,
in doing so, "cleaned up" `Info.plist` (removing keys it thought were unused) and a
dependency bump pulled in a new analytics SDK.

---

## Step 1 — detect the target (the conditional gate)

Signals found: `ios/App/Info.plist`, `ios/App/App.entitlements`,
`ios/App/PrivacyInfo.xcprivacy`, `ios/App.xcodeproj/project.pbxproj`, and
`android/app/AndroidManifest.xml` + `build.gradle`.
→ **Two publishable targets detected: iOS (App Store) and Android (Play).** The gate is
warranted; run both checklists. (If none of these existed, the skill would report
"not applicable — no publishable target" and stop.)

---

## Step 2 — scope to the diff

`git diff` touched: `Info.plist` (3 keys removed), `Podfile.lock` (+`AnalyticsSDK`),
`AndroidManifest.xml` (unchanged), `build.gradle` (unchanged).

---

## Step 3–4 — checklist + ranking

**iOS**
- The refactor removed `NSCameraUsageDescription` from `Info.plist`, but `QRScanner.tsx`
  still calls the camera. **Blocker** — Apple auto-rejects a camera-using app with no
  purpose string. (iOS usage-description rule.)
- The new `AnalyticsSDK` uses `NSUserDefaults` (a required-reason API) and, if it tracks,
  ATT — but `PrivacyInfo.xcprivacy` was not updated to declare the required-reason
  category, and there's no `NSUserTrackingUsageDescription`. **Risk** — reviewer commonly
  flags a privacy-manifest gap for a newly added SDK. (Required-reason API +
  privacy-manifest rule.)
- Entitlements (`App.entitlements`) unchanged and still match push + App Groups usage.
  **Clean.**

**Android**
- `targetSdkVersion` is one below Play's currently enforced floor. **Blocker** — Play
  won't accept a new submission below the floor. (Target-API-level requirement.)
- Permissions all map to real usage; `android:exported` explicit. **Clean.**

---

## Step 5–6 — the report + gate

> **Ship-readiness: NO-GO for submission — 2 Blockers, 1 Risk. Detected targets: iOS +
> Android.**
>
> **1. [Blocker · iOS] `ios/App/Info.plist` — missing `NSCameraUsageDescription`.**
> The refactor removed the camera purpose string, but `QRScanner.tsx:22` still opens the
> camera. Apple auto-rejects this. **Fix:** restore the `NSCameraUsageDescription` key
> with a real purpose sentence. Confidence: high. (iOS usage-description rule.)
>
> **2. [Blocker · Android] `android/app/build.gradle` — `targetSdkVersion` below the
> Play floor.** New submissions below the enforced target API level are rejected.
> **Fix:** bump `targetSdkVersion` to the current floor and re-test. Confidence: high.
> (Play target-API requirement — verify the exact current floor.)
>
> **3. [Risk · iOS] `ios/App/PrivacyInfo.xcprivacy` — privacy-manifest gap.** The new
> `AnalyticsSDK` uses a required-reason API (`NSUserDefaults`) not declared in the
> privacy manifest, and if it tracks you also need ATT + `NSUserTrackingUsageDescription`.
> A reviewer commonly flags this. **Fix:** add the required-reason category (and ATT if
> it tracks). Confidence: medium — verify what the SDK actually does. (Required-reason /
> privacy-manifest rule.)
>
> **Assurances (clean):** iOS entitlements intact (push, App Groups); Android permissions
> all justified and `exported` explicit; no signing/bundle-id drift.
>
> **Decision:** the two Blockers **block the ship** and go to you. The Risk is a strong
> ship note. Nothing in the project was changed.

---

## Why this is the right shape

- **Conditional gate fired correctly.** It ran because iOS+Android signals were present;
  on a backend service it would have said "not applicable" and stayed silent.
- **Caught what code review can't.** The deleted plist string and the stale target SDK
  are invisible to correctness/security/perf review — they're pure *store* rejections.
- **Advisory-but-blocks-on-Blocker.** Two near-certain rejections stopped the ship; the
  softer privacy-manifest gap was reported as a Risk, not enforced.
- **Referenced, confident, honest.** Each item cites the guideline category and a
  confidence, and flags "verify the current floor" instead of inventing a number.
- **Right lane.** It edited nothing; the fixes (restore the key, bump the SDK) are a
  separate labeled change.
