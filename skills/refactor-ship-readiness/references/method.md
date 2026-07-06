# Store / Platform Ship-Readiness Gate — full method

A refactor can be correct, safe, and fast and still get **rejected by a store reviewer**
because a manifest key, entitlement, privacy declaration, or signing step drifted. This
skill is the platform/store lens. It is **conditional** (activates only for a
publishable target), **read-only**, **advisory by default**, and **blocks the ship only
on a Blocker-severity rejection risk.**

Absorbs: `anthropic-skills:apple-appstore-reviewer` — the Apple-review rejection-risk
lens — generalized across iOS, Android, web/PWA, and desktop, and scoped to the refactor
diff.

---

## 0. The conditional contract

This skill must stay out of the way of non-publishable work. It runs its checklist
**only** when step 1 detects a store-publishable target. On a library, a backend
service, a CLI, or an internal tool it reports **"not applicable — no publishable
target detected"** and stops. Do not invent a store target from ambiguous signals.

---

## 1. Detect the target (the gate)

Scan the repo (and the diff) for platform signals:

| Target | Signals |
|---|---|
| **iOS / App Store** | `Info.plist`, `*.entitlements`, `PrivacyInfo.xcprivacy`, `*.xcodeproj`/`project.pbxproj`, `*.xcworkspace`, a `Podfile`/SwiftPM with UIKit/SwiftUI |
| **Android / Play** | `AndroidManifest.xml`, `build.gradle`(`.kts`) with `applicationId`, `google-services.json` |
| **Web / PWA** | `manifest.webmanifest` or `manifest.json` (with `display`/`start_url`), a service worker (`sw.js`, Workbox), `<link rel="manifest">` |
| **Desktop (published)** | `electron-builder`/`electron-forge` config, `notarize`/`hardened runtime` settings, macOS `.entitlements` for a signed app, MSIX/AppX config |

If two targets are present (e.g. a cross-platform app), run both checklists and label
findings by platform. **No signal → not applicable → stop.**

---

## 2. Scope to what the refactor touched

`git diff <base>..HEAD` over the manifest/config/entitlements/privacy/signing surface.
Lead with files the refactor changed. Surface pre-existing store issues as *context*
(so they aren't silently inherited) but don't blame the refactor for them.

---

## 3. Per-platform checklist

### iOS / App Store
- **Usage-description strings.** For every accessed capability there must be a purpose
  string in `Info.plist`: `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`,
  `NSPhotoLibrary(Add)UsageDescription`, `NSLocationWhenInUse…`/`Always…`,
  `NSContactsUsageDescription`, `NSFaceIDUsageDescription`, `NSUserTrackingUsageDescription`,
  etc. A used capability with a **missing or empty** string is a near-certain rejection.
  A refactor that deleted or reworded plist entries is the classic offender.
- **Entitlements match capabilities.** `*.entitlements` must line up with what the app
  uses and what the provisioning profile grants (push, App Groups, Keychain sharing,
  Sign in with Apple, Associated Domains, HealthKit). A capability used in code but not
  entitled — or entitled but with no matching plist justification — is a risk/blocker.
- **Privacy manifest + required-reason APIs.** `PrivacyInfo.xcprivacy` must declare
  collected data types and the **required-reason API** categories the app (and its SDKs)
  use — e.g. `NSPrivacyAccessedAPICategoryUserDefaults`, `…FileTimestamp`,
  `…SystemBootTime`, `…DiskSpace`, `…ActiveKeyboards`. A dependency bump can add a
  required-reason API the manifest doesn't list → reviewer flag / rejection.
- **App Tracking Transparency.** If the app tracks across apps/sites, ATT prompt +
  `NSUserTrackingUsageDescription` are required.
- **Background modes.** Declared `UIBackgroundModes` must be justified by real use;
  an unjustified background mode is a rejection reason.
- **Bundle id / version sanity.** A refactor that renamed the bundle id or mangled
  `CFBundleShortVersionString`/`CFBundleVersion` breaks submission.

### Android / Play
- **Permissions vs usage.** Every `<uses-permission>` should map to real use; sensitive
  ones (location, SMS, contacts, `QUERY_ALL_PACKAGES`, `MANAGE_EXTERNAL_STORAGE`) need a
  justification and may need a Play declaration. Unused/over-broad permissions are flagged.
- **`targetSdkVersion` floor.** Must meet Play's currently enforced target-API floor; a
  refactor/dependency change that lowered it (or left it stale) blocks new submissions.
- **Data-safety alignment.** The manifest/SDK data collection must match the Play
  Data-safety form.
- **Exported components.** `android:exported` must be explicit on components with
  intent-filters (required on modern targets); a refactor that dropped it fails the build/review.

### Web / PWA
- **Manifest fields.** `name`, `short_name`, `start_url`, `display`, `icons` (incl. a
  maskable 512px), `theme_color`/`background_color`. Missing required fields break
  installability.
- **Installability & HTTPS.** Served over HTTPS, a registered service worker, a valid
  linked manifest. A refactor that moved `manifest.json` or the SW path without updating
  the `<link>`/registration breaks the install prompt.

### Desktop (published)
- **Code signing.** A valid signing identity; a refactor that changed the app id or
  bundle layout can break signing.
- **Notarization + hardened runtime (macOS).** Notarization configured; hardened runtime
  on; entitlements present for the app's capabilities. Missing notarization → Gatekeeper
  blocks launch.

---

## 4. Rank each risk

| Severity | Meaning | Examples |
|---|---|---|
| **Blocker** | Near-certain auto-rejection or a broken submission/launch | missing usage string for a used capability; entitlement/capability mismatch; `targetSdk` below the enforced floor; unsigned/un-notarized desktop app; missing required PWA manifest field breaking install |
| **Risk** | A reviewer may flag it; not certain | privacy-manifest gap for an SDK's required-reason API; data-safety mismatch; over-broad permission |
| **Advisory** | Polish / defense-in-depth | missing maskable icon; optional manifest field; tightening an entitlement scope |

Attach the **guideline / required-reason reference** and a **confidence** to each.
Store rules change; cite the category and say "verify against the current guideline"
rather than inventing a version. Do not fabricate guideline numbers.

---

## 5. Write the report

Fill `templates/output.md`: the detected target(s), ranked rejection risks (each with
plain-English what/why/where, the exact fix, the reference, confidence), and the **clean
assurances** (the checks that passed — good news reduces submission anxiety).

---

## 6. Gate the ship

- **Advisory by default:** present the report and hand off; the human decides.
- **Blocks only on a Blocker:** a near-certain rejection pauses the ship for a human
  decision. Risks and Advisories are ship *notes*, not stops.
- **Never fixes here:** a fix (adding the plist string, restoring the entitlement, bumping
  the target SDK) is a separate, clearly-labeled change — never smuggled into the refactor.
- On a clean re-run (no Blocker), the chain proceeds to ship.

---

## 7. Relationship to the chain

- Runs after `refactor-review-gate`, in the review→ship phase, **conditionally**.
- Orthogonal to the code reviewers: `refactor-security` (code safety), `refactor-performance`
  (speed), `refactor-red-team` (behavior). This skill owns *store/platform acceptance*.
- Feeds ship notes to the docs/ship phase (`refactor-write-up`, ship). Its Blockers are
  the last thing that can hold a submission.
