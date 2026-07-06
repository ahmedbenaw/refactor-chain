---
name: refactor-ui-mobile
description: "Use this skill when refactoring the visual design of a native or cross-platform MOBILE UI — SwiftUI, UIKit, Jetpack Compose, React Native, or Flutter — and the user says things like \"make this iOS/Android screen feel native\", \"the tap targets are too small\", \"content is hidden under the notch / home indicator\", \"this doesn't follow Apple/Material guidelines\", \"fix the mobile navigation\", or \"polish this app screen\". It enforces platform HIG/Material conventions: ≥44pt (iOS) / 48dp (Android) touch targets, safe-area and notch/home-indicator insets, platform-correct navigation patterns, and Dynamic Type / scalable text. This is the mobile branch of the do-the-work UI lane in the refactor-chain pipeline; it runs after refactor-ui-tokens and before refactor-ui-components. It restyles presentation while preserving content, data, and behavior."
---

# Mobile UI Refactorer (native / cross-platform) — refactor-chain · do-the-work (UI · mobile)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (UI lane, mobile branch) · **Prerequisite:** refactor-ui-tokens (or plan) · **Next:** refactor-ui-components → refactor-ui-a11y → refactor-code-principles.
**Adaptivity / conditional:** activates for mobile targets (SwiftUI/UIKit/Compose/React Native/Flutter). It is the mobile counterpart to refactor-ui-visual (which owns web); pick this branch when the platform is mobile.

## Purpose
Make a mobile screen feel like it belongs on its platform. Phones are not small desktops: thumbs need big targets, hardware cutouts steal screen edges, and each OS has strong native conventions users already know (iOS tab bars and back-swipe; Android bottom nav and the back button; Material vs. Cupertino motion). This skill applies those platform rules and fixes the mobile-specific hazards — tiny tap targets, content jammed under the notch or home indicator, text that won't scale — while leaving what the screen says and does untouched.

## When to use
- Trigger phrases: "make this feel native", "the buttons are too small to tap", "text/content is cut off by the notch", "hidden behind the home indicator", "follow Apple/Material guidelines", "fix the mobile nav", "polish this app screen", "the keyboard covers the input".
- When the diagnostic pass (`refactor-diagnose`) reports a mobile platform (iOS/Android/RN/Flutter) and a UI lane.
- After tokens exist, so spacing/type/color come from the scale rather than literals.

## What I'll tell you (plain-language / ADHD-friendly)
- "This is an iOS screen, so I'll use iOS conventions — a tab bar at the bottom, swipe-back, and big enough tap targets for thumbs. Same content, just laid out the way iPhone users expect."
- "You are here: mobile step of the UI cleanup. Tokens are done; components come next."
- "Three buttons here are 30pt — below the 44pt minimum, so they're easy to miss-tap. I'll pad them to 44pt without changing what they do. OK?"
- "Some text sits under the notch and the home indicator. I'll wrap the screen in safe-area insets so nothing hides behind hardware."
- "I'll fix one thing at a time: targets first, then safe areas, then navigation. Stop me whenever."
- "That layout change overlapped the keyboard — I undid it and I'm trying a scroll-on-focus approach instead (attempt 2 of 3)."
- "Want the technical details? I can show the exact insets, the `minimumTapArea`, and the Dynamic Type mapping."

## Method
1. **Confirm platform & framework.** iOS (SwiftUI/UIKit), Android (Compose/Views), or cross-platform (React Native / Flutter). This sets which convention set applies (HIG vs. Material) and the inset/target APIs.
2. **Touch targets.** Ensure every interactive element meets the platform minimum: **44×44pt (iOS)** / **48×48dp (Android)**, with adequate spacing between adjacent targets. Expand hit areas via padding/`contentShape`/`hitSlop` — don't just enlarge visuals.
3. **Safe areas & insets.** Respect notch/Dynamic Island, status bar, home indicator, and keyboard. Use `safeAreaInsets` (SwiftUI), `WindowInsets` (Compose), `SafeAreaView`/`react-native-safe-area-context` (RN), `SafeArea`/`MediaQuery.viewInsets` (Flutter). Content never hides under hardware or the keyboard.
4. **Navigation patterns.** Use platform-native navigation: iOS tab bar + navigation stack + edge back-swipe; Android bottom navigation + system back; correct large-title / toolbar behavior. Don't port a desktop sidebar onto a phone.
5. **Scalable type & density.** Wire text to Dynamic Type (iOS) / `sp` + font scale (Android) so it respects the user's text-size setting; keep spacing on the token scale; size for one-handed reach.
6. **Platform polish.** Native motion/easing, correct control styles (Cupertino vs. Material), haptics where idiomatic, list/row affordances. Finishing touches last.

See `references/method.md` for the full per-platform rule tables (HIG + Material specifics, inset APIs, navigation mapping, Dynamic Type).

## Guardrails
- **Presentation only — behavior, content, and data preserved.** Restyle and re-lay-out; do not change copy, what controls do, or navigation destinations (only the *pattern* used to reach them).
- Don't impose one platform's look on the other (no Material buttons on iOS or iOS switches on Android) unless the app is deliberately brand-unified — ask.
- Enlarge the **hit area**, not just the icon; a 44pt target can wrap a 20pt glyph.
- Pull spacing/type/color from tokens (refactor-ui-tokens); don't reintroduce literals.

## Verify
- Plain: "Every button is now easy to tap, nothing hides under the notch or home bar, and it navigates the way this platform's users expect. Same content."
- Technical: measured interactive frames ≥44pt/48dp with non-overlapping spacing; root layout respects safe-area/window insets on notched + gesture-nav devices; navigation uses native components; text scales at largest Dynamic Type / font-scale without truncation or overlap; snapshot/preview compare shows only intended layout changes.

## Resources
- `references/method.md` — per-platform HIG/Material rules, inset APIs, nav mapping, Dynamic Type.
- `examples/before-after.md` — a SwiftUI screen and a Compose screen fixed for targets, safe areas, and nav.
- `scripts/audit-mobile.mjs` — heuristic scanner for undersized targets, missing safe-area usage, hardcoded fonts.
- `scripts/checklist.mjs` — prints this skill's checklist as JSON.
- `templates/output.md` — the mobile UI refactor report scaffold.

## Chain position
Mobile branch of the do-the-work UI lane, selected by platform (the web branch is refactor-ui-visual). Prerequisite refactor-ui-tokens. Feeds refactor-ui-components, then refactor-ui-a11y (the gate), then refactor-code-principles + the review gate.
