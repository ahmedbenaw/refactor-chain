---
name: refactor-ui-a11y
description: "Use this skill for an accessibility and responsive audit-and-fix of a UI — when the user asks to \"make this accessible\", \"fix the contrast\", \"add ARIA / roles / labels\", \"make it keyboard-navigable\", \"fix the focus order\", \"check WCAG\", \"make it work with a screen reader\", \"fix the responsive layout / breakpoints\", or \"it breaks on mobile / doesn't reflow\". It audits and fixes color contrast, focus order and visible focus, semantic roles and ARIA, keyboard navigation, responsive breakpoints/reflow, and mobile dynamic-type, checking against WCAG 2.2 AA. This is the accessibility GATE of the do-the-work UI lane in the refactor-chain pipeline; it runs after refactor-ui-components and before refactor-code-principles. It fixes accessibility defects while preserving content and behavior, and it blocks the lane from being called done until the gate passes."
---

# Accessibility & Responsive Gate (WCAG 2.2 AA) — refactor-chain · do-the-work (UI · gate)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (UI lane) · **Prerequisite:** refactor-ui-components (and the tokens + visual/mobile pass) · **Next:** refactor-code-principles → the review gate.
**Adaptivity / conditional:** repo-agnostic; standards apply to any web or mobile UI. This is the **gate** of the UI lane — it both fixes and blocks "done" until AA passes.

## Purpose
Make the UI usable by everyone — people using a keyboard, a screen reader, high-zoom, or a phone at a large text size — and prove it against WCAG 2.2 AA. This step audits and fixes the accessibility and responsive defects the earlier UI steps didn't own: insufficient contrast, missing labels/roles, broken focus order, no visible focus, keyboard traps, layouts that don't reflow, and text that doesn't scale. As the lane's gate, it doesn't just advise — it fixes what it can and blocks the lane from being called done until the core AA criteria pass.

## When to use
- Trigger phrases: "make this accessible", "fix the contrast", "add ARIA/roles/labels", "make it keyboard-navigable", "fix the focus order", "check WCAG", "screen-reader support", "fix the responsive layout", "it breaks on mobile", "it doesn't reflow", "text doesn't scale".
- As the closing gate of any UI lane (tokens → visual/mobile → components → **a11y**).
- When the diagnostic pass flags accessibility or responsive risk.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm going to check that people using a keyboard, a screen reader, or a phone can all use this — and fix what's blocking them. The content and what things do won't change."
- "You are here: the accessibility gate — the last UI step before the general cleanup. This one has to pass before we call the UI done."
- "This gray text on white is too light to read (contrast 2.8, needs 4.5). I'll darken it one token step to pass, without changing the layout. OK?"
- "Two buttons can't be reached with the Tab key. I'll fix the focus order and add a visible focus ring so keyboard users can see where they are."
- "On a narrow screen this table runs off the edge. I'll make it reflow so nothing needs sideways scrolling."
- "That ARIA change made a screen reader announce the wrong thing — I undid it and I'm using a native element instead (attempt 2 of 3), which is more reliable than ARIA."
- "Want the technical details? I can show the WCAG criteria checked, the contrast ratios, and the axe-style findings list."

## Method
1. **Audit.** Check the UI against WCAG 2.2 AA across six areas: **contrast**, **focus order + visible focus**, **semantic roles/labels/ARIA**, **keyboard navigation**, **responsive reflow/breakpoints**, and **mobile dynamic-type/scaling**. `scripts/audit-a11y.mjs` flags the static, detectable defects; use a browser/axe tool when one is connected for the runtime checks.
2. **Contrast.** Verify text ≥ 4.5:1 (≥3:1 for large text/UI components); fix failures by nudging to the nearest token step that passes — not by inventing off-scale colors.
3. **Semantics first, ARIA second.** Prefer native elements (`<button>`, `<nav>`, `<label>`, headings, landmarks) over ARIA. Add roles/`aria-*` only where native semantics can't express it; ensure names, states, and relationships are exposed. First rule of ARIA: don't use ARIA if a native element does the job.
4. **Keyboard & focus.** Everything operable by mouse must be operable by keyboard; logical tab order; a visible focus indicator; no keyboard traps; skip-link to main; managed focus on route/dialog change.
5. **Responsive & reflow.** Content reflows to ~320px CSS px without horizontal scroll or loss; touch targets ≥24×24 CSS px (AA 2.5.8) — larger on mobile per refactor-ui-mobile; layout survives 200–400% zoom.
6. **Mobile dynamic-type.** Text respects the OS text-size setting (Dynamic Type / font scale) without truncation or overlap.

See `references/method.md` for the per-criterion WCAG 2.2 AA checklist, contrast math, the ARIA decision rules, focus-management patterns, and reflow breakpoints.

## Guardrails
- **Fix accessibility defects; preserve content and behavior.** Don't change copy, data, or what controls do — make them reachable, perceivable, and operable.
- Prefer semantic HTML over ARIA; incorrect ARIA is worse than none.
- Fix contrast by moving to a passing **token** step, not by inventing a one-off color (stay consistent with refactor-ui-tokens).
- This is a **gate**: if a core AA criterion can't be met, surface it as a blocker rather than silently passing.

## Verify
- Plain: "Keyboard users, screen-reader users, and people on phones or at large text sizes can all use this now, and nothing it says or does changed."
- Technical: text/UI contrast meets AA (4.5:1 / 3:1); tab order logical with a visible focus indicator and no traps; every control has an accessible name/role/state; landmarks + heading order valid; content reflows at 320px with no horizontal scroll; targets ≥24px; 200% zoom usable; largest dynamic-type renders without clipping. Automated pass (axe/audit script) plus the manual keyboard + screen-reader spot-check are clean.

## Resources
- `references/method.md` — WCAG 2.2 AA per-criterion checklist, contrast math, ARIA rules, focus/reflow patterns.
- `examples/before-after.md` — a low-contrast, keyboard-broken, non-reflowing component fixed to AA.
- `scripts/audit-a11y.mjs` — heuristic static auditor (contrast, missing labels/alt, click-on-nonbutton, viewport/reflow smells).
- `scripts/checklist.mjs` — prints this skill's checklist as JSON.
- `templates/output.md` — the accessibility gate report scaffold (findings by criterion + pass/block verdict).

## Chain position
Closing **gate** of the do-the-work UI lane, after refactor-ui-components. Must pass before the lane advances to refactor-code-principles and the final review gate. Complements refactor-security/performance/red-team, which review correctness and safety of the whole diff.
