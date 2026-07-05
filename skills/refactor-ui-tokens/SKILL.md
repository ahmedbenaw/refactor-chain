---
name: refactor-ui-tokens
description: "Use this skill when a UI is full of hardcoded colors, spacing, font sizes, radii, or shadows scattered inline and the user wants to \"extract design tokens\", \"stop using magic numbers in CSS\", \"set up a design system scale\", \"use CSS variables / a Tailwind theme instead of hex codes\", or \"make the styling consistent\". It extracts one-off visual values into a small semantic token scale, migrates call sites to reference those tokens, and reports drift (values that don't fit any scale step). This is the first step of the do-the-work UI lane in the refactor-chain pipeline; it runs before refactor-ui-visual / refactor-ui-mobile and feeds them a stable token vocabulary. Behavior- and pixel-preserving by default."
---

# Design-Token Extractor — refactor-chain · do-the-work (UI · step 1)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (UI lane, step 1) · **Prerequisite:** plan (or none — can start a UI lane cold) · **Next:** refactor-ui-visual (web) or refactor-ui-mobile (native/cross-platform).
**Adaptivity / conditional:** repo-agnostic; adapts output format to the detected styling system (CSS variables, Tailwind, styled-components, SwiftUI/Compose theme, RN/Flutter theme object).

## Purpose
Turn a pile of scattered one-off visual values — `#3b82f6`, `padding: 13px`, `font-size: 15px`, `border-radius: 6px` — into a small, named, semantic token scale, then point every call site at the tokens. The pixels on screen do not move: this is a rename-and-centralize refactor. Once tokens exist, every later UI step (visual, mobile, components, a11y) has one dial to turn instead of hundreds of literals, and drift ("we have 14 slightly-different grays") becomes visible and fixable.

## When to use
- Trigger phrases: "extract design tokens", "get rid of the magic numbers in the CSS", "we have too many shades of gray", "set up a spacing/type scale", "move these hex codes into variables", "wire up a Tailwind theme", "make the styling consistent".
- When a diagnostic pass (`refactor-diagnose`) flags high literal-value density or palette drift in the styling layer.
- As the entry step of any UI lane, so downstream visual/mobile/component work references tokens, not literals.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm going to collect every color, spacing, and font-size you use, group the near-duplicates, and give them names. Your screen will look identical — I'm just renaming, not redesigning."
- "You are here: step 1 of the UI cleanup (tokens). Next is the visual pass."
- "I found 14 grays that are basically 5 grays. Want me to snap them to 5 named tokens? I'll show you which pixels change (usually none, sometimes a 1-value nudge) before I touch anything."
- "I'll do this one category at a time — colors first, then spacing, then type. One decision at a time, and you can stop after any category."
- "That token file didn't compile — I undid it and I'm trying the plain-CSS-variables format instead (attempt 2 of 3)."
- "Want the technical details? I can show the exact drift table and the codemod diff."

## Method
1. **Inventory.** Scan the styling layer for literal visual values and bucket them by category: color, spacing/size, font-size, font-weight, line-height, radius, shadow, z-index, duration/easing. `scripts/scan-tokens.mjs` does the collection and prints frequency counts.
2. **Cluster & choose a scale.** Within each category, cluster near-duplicates (colors by perceptual distance; numbers by proximity) and pick a small, restrictive scale — e.g. a 4/8px spacing scale, a modular type scale, a 5–10 step gray ramp plus semantic accents. Fewer steps than you think.
3. **Name semantically, not literally.** `--color-surface`, `--color-text-muted`, `--space-4`, `--radius-md` — name by role/scale position, not by value (`--blue-500` is fine as a primitive; `--color-primary` maps to it). Two tiers: primitives (raw scale) and semantic aliases (roles) that reference them.
4. **Emit the token file.** Produce the scaffold in the detected system's format from `templates/output.md` (CSS custom properties, `tailwind.config` theme, JS/TS theme object, or SwiftUI/Compose color/dimension sets).
5. **Migrate call sites.** Replace literals with token references, category by category, snapping each literal to its nearest scale step. Show the drift table (what snapped, by how much) and get a nod before committing snaps that move a pixel.
6. **Report drift.** List values that fit no step, appear once, or contradict the scale — these are the design-debt findings the next step consumes.

See `references/method.md` for the exhaustive clustering rules, naming taxonomy, per-system emit rules, and snap-tolerance policy.

## Guardrails
- **Behavior- and pixel-preserving by default.** Pure token extraction changes nothing visible. Any snap that would move a pixel is surfaced and confirmed first — never silent.
- Keep primitives and semantic aliases as two layers; never let a component reference a raw primitive directly once a semantic alias exists.
- Don't invent tokens for values used exactly once unless they belong to a scale — flag them as drift instead of enshrining them.
- Preserve existing token names if the repo already has a partial system; extend, don't rename out from under call sites.

## Verify
- Plain: "The app looks the same. Every color/spacing/size now has a name, and I've listed the leftover oddballs."
- Technical: token file compiles/builds; a grep for raw hex/`px` in component styles returns only intentional exceptions; visual diff (or screenshot compare) shows no unintended change; the drift report enumerates every unmigrated literal with a reason.

## Resources
- `references/method.md` — full clustering, naming, per-system emit, and snap-tolerance rules.
- `examples/before-after.md` — a scattered-CSS component migrated to CSS variables + a Tailwind variant.
- `scripts/scan-tokens.mjs` — zero-dep scanner: collects literals, clusters, prints JSON drift/frequency.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — token-file scaffold (CSS vars / Tailwind config / theme object) to fill in.

## Chain position
First step of the do-the-work UI lane. Fed by plan (or entered cold). Feeds refactor-ui-visual (web) or refactor-ui-mobile (native) with a stable token vocabulary, then refactor-ui-components, refactor-ui-a11y, and finally refactor-code-principles + the review gate.
