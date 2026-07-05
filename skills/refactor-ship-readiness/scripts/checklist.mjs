#!/usr/bin/env node
/**
 * refactor-ship-readiness — prints the per-platform store checklist as JSON.
 * Zero-dependency. Phase: review → ship. CONDITIONAL: only runs when a
 * store-publishable target is detected. Advisory by default; blocks the ship
 * only on a Blocker-severity rejection risk.
 *
 * Usage:
 *   node scripts/checklist.mjs                 # all platforms
 *   node scripts/checklist.mjs --platform ios  # one platform (ios|android|web|desktop)
 *   node scripts/checklist.mjs --ids           # step ids only
 */
const PLATFORMS = {
  ios: {
    detect: ["Info.plist", "*.entitlements", "PrivacyInfo.xcprivacy", "project.pbxproj"],
    items: [
      { id: "ios-usage-strings", title: "Usage-description string present for every accessed capability", blocker_if: "used capability has missing/empty purpose string" },
      { id: "ios-entitlements", title: "Entitlements match capabilities and provisioning profile", blocker_if: "capability used but not entitled / mismatch" },
      { id: "ios-privacy-manifest", title: "PrivacyInfo.xcprivacy declares data types + required-reason API categories (incl. SDKs)", risk_if: "required-reason API used but not declared" },
      { id: "ios-att", title: "ATT prompt + NSUserTrackingUsageDescription if the app tracks", risk_if: "tracking without ATT" },
      { id: "ios-background-modes", title: "Declared UIBackgroundModes are justified by real use", blocker_if: "unjustified background mode" },
      { id: "ios-bundle-version", title: "Bundle id + CFBundleShortVersionString/CFBundleVersion sane", blocker_if: "bundle id/version mangled by the refactor" },
    ],
  },
  android: {
    detect: ["AndroidManifest.xml", "build.gradle", "build.gradle.kts"],
    items: [
      { id: "android-permissions", title: "Every uses-permission maps to real use; sensitive ones justified/declared", risk_if: "unused/over-broad permission" },
      { id: "android-target-sdk", title: "targetSdkVersion meets the enforced Play floor", blocker_if: "targetSdk below the current floor" },
      { id: "android-data-safety", title: "Manifest/SDK data collection matches the Play Data-safety form", risk_if: "data-safety mismatch" },
      { id: "android-exported", title: "android:exported explicit on components with intent-filters", blocker_if: "missing exported on modern target" },
    ],
  },
  web: {
    detect: ["manifest.webmanifest", "manifest.json", "service worker"],
    items: [
      { id: "web-manifest-fields", title: "Required manifest fields present (name, short_name, start_url, display, icons incl. maskable)", blocker_if: "missing required field breaks installability" },
      { id: "web-installability", title: "HTTPS + registered service worker + valid linked manifest", blocker_if: "moved manifest/SW path not updated → install prompt broken" },
    ],
  },
  desktop: {
    detect: ["electron-builder", "notarize", "*.entitlements (app)", "MSIX/AppX"],
    items: [
      { id: "desktop-signing", title: "Valid code-signing identity; app id/bundle layout intact", blocker_if: "signing broken by refactor" },
      { id: "desktop-notarize", title: "Notarization + hardened runtime + entitlements (macOS)", blocker_if: "un-notarized → Gatekeeper blocks launch" },
    ],
  },
};

const STEPS = [
  { id: "detect", title: "Detect publishable target(s) — the conditional gate; none → not applicable, stop" },
  { id: "scope", title: "git diff the manifest/config/entitlements/privacy/signing surface" },
  { id: "checklist", title: "Run the per-platform checklist for detected target(s)" },
  { id: "rank", title: "Rank each risk Blocker / Risk / Advisory with guideline reference + confidence" },
  { id: "report", title: "Write ranked rejection-risk report + clean assurances to templates/output.md" },
  { id: "gate", title: "Advisory by default; block the ship only on a Blocker; never fix here" },
];

const meta = {
  skill: "refactor-ship-readiness", phase: "review → ship", conditional: true,
  advisoryByDefault: true, blocksShipOnlyOn: "Blocker", editsCode: false,
  absorbs: ["anthropic-skills:apple-appstore-reviewer"],
  severities: ["Blocker", "Risk", "Advisory"], steps: STEPS,
};

const platArg = (() => { const i = process.argv.indexOf("--platform"); return i >= 0 ? process.argv[i + 1] : null; })();
const payload = platArg ? { ...meta, platform: platArg, checklist: PLATFORMS[platArg] || null } : { ...meta, platforms: PLATFORMS };

if (process.argv.includes("--ids")) {
  const ids = platArg ? (PLATFORMS[platArg]?.items || []).map((i) => i.id) : STEPS.map((s) => s.id);
  process.stdout.write(ids.join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
