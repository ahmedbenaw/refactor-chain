---
name: refactor-ship-readiness
description: "Use this skill when a refactor touched a mobile, web, or desktop app that gets published to a store, and you need to catch platform/store-rejection risks before shipping — iOS App Store issues (Info.plist usage strings, entitlements, privacy manifest / required-reason APIs, ATT), Android/Play (permissions, target SDK, data-safety), web/PWA manifest and installability, or desktop notarization/signing. Trigger phrases include \"will this pass App Store review\", \"check store readiness\", \"did the refactor break our entitlements\", \"is the privacy manifest still right\", \"will Apple/Google reject this\", \"notarization check\". This is a review/ship-phase skill in the refactor-chain pipeline; it is CONDITIONAL — it only activates when a store-publishable target (iOS/Android/web-PWA/desktop) is detected. Advisory by default (it reports ranked rejection risks); it blocks the ship only on a Blocker-severity rejection risk."
---

# Store / Platform Ship-Readiness Gate — refactor-chain · review/ship

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** review → ship · **Prerequisite:** the review gate ran (`refactor-review-gate`); there is a diff and a build target · **Next:** ship (only once no Blocker rejection risk remains).
**Adaptivity / conditional:** **conditional** — activates only when a store-publishable target is detected (iOS App Store, Android/Play, web/PWA, or a notarized desktop app). On a library, a service, or a non-published app it stays **dormant**. Advisory by default; blocks ship only on a Blocker.

## Purpose
A refactor that moves files, renames bundles, edits manifests, or bumps dependencies can quietly break the things a **store reviewer** checks — even when the code is correct, safe, and fast. This skill is the platform/store lens the other reviewers don't have. It reads the changed manifest and config surface for the target platform and answers: *would Apple, Google, the browser install prompt, or notarization reject this?* For iOS that means `Info.plist` usage-description strings, entitlements, the privacy manifest (`PrivacyInfo.xcprivacy`) and required-reason APIs, App Tracking Transparency, and background modes. For Android it means the manifest permissions, `targetSdkVersion`, and data-safety alignment. For web/PWA it means the web app manifest, icons, HTTPS/installability. For desktop it means code signing and notarization/entitlements. It hands back a **ranked list of rejection risks** with the exact fix. It changes nothing by default and only *blocks* the ship when a risk is a genuine Blocker-severity rejection.

## When to use
- A refactor touched a publishable app and you want a pre-submission check. Triggers: "will this pass App Store review", "store readiness check", "will Apple/Google reject this".
- A manifest, entitlements file, privacy manifest, or bundle id was moved or edited by the refactor. Triggers: "did we break our entitlements", "is the privacy manifest still right".
- A dependency bump may have pulled in a required-reason API or a new permission. Triggers: "did this dependency add a permission", "new SDK — is it store-safe".
- Precondition / conditional gate: a store-publishable target is detected (see Method step 1). If none is, this skill reports "not applicable — no publishable target" and stays out of the way.

## What I'll tell you (plain-language / ADHD-friendly)
- "This looks like an iOS app you publish to the App Store, so I'm checking the things Apple's reviewer checks — not your code logic, the store stuff. I won't change anything unless you ask."
- "Good news first: your entitlements and signing look intact after the refactor."
- "One thing that would get you **rejected**: you use the camera, but the refactor deleted the `NSCameraUsageDescription` line from `Info.plist`. Apple auto-rejects a camera app with no reason string. That's the one to fix before submitting."
- "Two things that are risks, not certain rejections: your privacy manifest doesn't list a required-reason API a new dependency uses, and your Android target SDK is one below the current floor."
- "Everything else I checked is fine — icons, HTTPS, background modes, ATT."
- "I rank by 'certain rejection' vs 'reviewer might flag it' vs 'polish'. Say 'show technical details' for the exact guideline / required-reason code."

## Method
1. **Detect the target (the conditional gate).** Look for platform signals: `Info.plist` / `*.entitlements` / `PrivacyInfo.xcprivacy` / `project.pbxproj` (iOS); `AndroidManifest.xml` / `build.gradle` (Android); `manifest.webmanifest` / `manifest.json` + service worker (web/PWA); `electron-builder`/`notarize`/`.entitlements` for desktop. **No publishable target → report "not applicable" and stop.** See `references/method.md` for the full signal list.
2. **Scope to what the refactor touched.** `git diff` the manifest/config/entitlements/privacy surface. Prioritize files the refactor changed; note pre-existing issues as context, not new blame.
3. **Run the platform checklist for the detected target(s).** iOS: usage-description strings for every accessed capability, entitlements match capabilities, privacy manifest + required-reason APIs, ATT if tracking, background modes justified, bundle id/version sanity. Android: permissions vs usage, `targetSdkVersion` ≥ current floor, data-safety alignment, exported components. Web/PWA: manifest fields, icons/maskable, HTTPS, installability. Desktop: signing identity, notarization, hardened runtime + entitlements. `scripts/checklist.mjs` carries the per-platform list.
4. **Rank each risk** as **Blocker** (a near-certain auto-rejection — missing required usage string for a used capability, entitlement/capability mismatch, target SDK below the enforced floor), **Risk** (a reviewer may flag it — privacy-manifest gap, data-safety mismatch), or **Advisory** (polish — icon set, optional manifest fields). Attach the guideline / required-reason reference and a confidence.
5. **Write the report** into `templates/output.md`: ranked rejection risks, each with plain-English what/why/where, the exact fix, the guideline reference, and confidence; plus the clean assurances.
6. **Gate the ship.** Advisory by default — present and hand off. **Only** a Blocker-severity rejection risk blocks the ship; pause for the human. Risks and Advisories inform but do not block. Fixing is a separate, labeled change — never smuggled into the refactor.

## Guardrails
- **Conditional — dormant unless a publishable target is detected.** No iOS/Android/PWA/desktop-publish signal → "not applicable," and it gets out of the way. It never invents a store target.
- **Advisory by default; blocks only on a Blocker.** A near-certain auto-rejection stops the ship; everything softer is reported, not enforced.
- **Read-only.** It reads manifests and config and reports; it edits nothing on its own.
- **Store rules move; state confidence and reference.** Cite the guideline / required-reason category and give a confidence; "verify against the current guideline" is honest when a rule may have shifted. Do not invent guideline numbers.
- **Refactor-scoped.** Lead with what the refactor changed; surface pre-existing store issues as context so they're not silently inherited, but don't blame the refactor for them.

## Verify
- Plain-language: "Every store risk names a file, says why it'd be flagged or rejected, and gives the fix, ranked by how likely a rejection is. Nothing in your project changed. It only blocks shipping if something would almost certainly get rejected."
- Technical: `templates/output.md` is populated; each risk has `file:line` (or the missing key), a platform tag (iOS/Android/web/desktop), a severity (Blocker/Risk/Advisory), a guideline/required-reason reference, and a confidence; `scripts/checklist.mjs` ran for the detected platform(s) with each item pass/finding/n-a; the conditional gate is explicit (detected target, or "not applicable"); no working-tree edits attributable to this skill.

## Resources
- `references/method.md` — the platform-detection signals and the full per-platform checklist (iOS usage strings / entitlements / privacy manifest / required-reason APIs / ATT; Android permissions / target SDK / data-safety; web/PWA manifest / installability; desktop signing / notarization), plus the ranking rubric.
- `examples/before-after.md` — a worked readiness run: a refactor that deleted an `Info.plist` usage string and the ranked rejection-risk report it produced.
- `scripts/checklist.mjs` — zero-dep Node script that prints the per-platform ship-readiness checklist as JSON.
- `templates/output.md` — the ranked rejection-risk report scaffold the skill fills in.

## Chain position
Runs in the **review → ship** phase, after `refactor-review-gate`, but only when a store-publishable target is detected. Where the review gate answers "is the code correct/safe/fast?", this skill answers the orthogonal "will the *platform/store* accept it?" — the last thing between a green diff and a submission. Its Blockers pause the ship for a human; its Risks/Advisories are folded in as ship notes. It complements `refactor-security` (which flags code-level safety) with store-policy alignment.
