# Accessibility & Responsive Gate — full method (WCAG 2.2 AA)

Exhaustive "how" behind `refactor-ui-a11y`. SKILL.md gives the 6-step spine; this is the
per-criterion checklist, contrast math, ARIA rules, and focus/reflow patterns.

## Standard: WCAG 2.2 Level AA
Organized by the four principles — Perceivable, Operable, Understandable, Robust (POUR).
This gate targets the AA success criteria most refactors touch.

## 1. Contrast (Perceivable — 1.4.3, 1.4.11)
- **Text:** ≥ **4.5:1** against its background. **Large text** (≥24px, or ≥18.66px bold):
  ≥ **3:1**.
- **Non-text** (UI component boundaries, focus indicators, meaningful graphics): ≥ **3:1** (1.4.11).
- Contrast ratio = (L1 + 0.05) / (L2 + 0.05), where L is relative luminance
  (linearize sRGB channels, then 0.2126R + 0.7152G + 0.0722B). `audit-a11y.mjs` computes this.
- **Fix by snapping to the nearest passing token step** (e.g. `--color-text-muted` → a darker
  ramp step) — never invent an off-scale color; stay consistent with refactor-ui-tokens.

## 2. Semantic roles / names / ARIA (Robust — 4.1.2; Perceivable — 1.3.1, 1.1.1)
- **Native first.** `<button>` not `<div onClick>`; `<a href>` for navigation; `<nav>`,
  `<main>`, `<header>`, `<footer>` landmarks; `<label for>`/wrapping for form controls;
  real heading hierarchy (`<h1>`…`<h6>`, no skipped levels).
- **First rule of ARIA:** if a native element with the semantics/behavior exists, use it —
  don't re-add it with ARIA. **Incorrect ARIA is worse than no ARIA.**
- Every control needs an **accessible name** (visible label, `aria-label`, or `aria-labelledby`),
  correct **role**, and current **state** (`aria-expanded`, `aria-checked`, `aria-selected`,
  `aria-disabled`).
- Images: meaningful → `alt` describing purpose; decorative → `alt=""`.
- Dynamic updates: `aria-live` region for async status/toasts.

## 3. Keyboard & focus (Operable — 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11)
- **2.1.1 Keyboard:** all functionality operable via keyboard. No mouse-only interactions.
- **2.1.2 No trap:** focus can always move away (dialogs release focus on close).
- **2.4.3 Focus order:** logical, matching visual/reading order. Avoid positive `tabindex`;
  use DOM order + `tabindex="0"`/`"-1"` deliberately.
- **2.4.7 Focus visible:** a clearly visible focus indicator (don't `outline:none` without a
  replacement); use `:focus-visible`. Ring uses the `--ring`/`--color-primary` token, ≥3:1 (1.4.11).
- **2.4.11 Focus not obscured (2.2 new):** the focused element isn't hidden behind sticky headers/footers.
- Patterns: **skip-link** to `#main`; **focus management** on route change and on dialog
  open/close (move focus in, restore on close); roving tabindex for composite widgets
  (menus, tabs, listbox) per the ARIA Authoring Practices.

## 4. Responsive & reflow (Perceivable — 1.4.10; Operable — 2.5.8)
- **1.4.10 Reflow:** content usable at **320 CSS px** width (≈400% zoom on 1280px) with **no
  two-dimensional scrolling** — no horizontal scrollbar for reading content. Use fluid layouts,
  wrapping, and responsive tables (stack rows / horizontal scroll only for the data table itself).
- **1.4.4 Resize text:** usable at 200% zoom without loss of content/function.
- **2.5.8 Target size (Minimum, 2.2 new):** interactive targets ≥ **24×24 CSS px** (with
  spacing exceptions). Mobile targets go larger per refactor-ui-mobile (44pt/48dp).
- Ensure a correct `<meta name="viewport" content="width=device-width, initial-scale=1">`
  and **never** `user-scalable=no` / `maximum-scale=1` (blocks zoom).
- Breakpoints: design mobile-first; verify at ~320, 375, 768, 1024, 1280.

## 5. Mobile dynamic-type / scaling
- iOS Dynamic Type / Android font scale respected — text scales without truncation or overlap
  (ties to refactor-ui-mobile's scalable-type step). Test at the largest accessibility size.

## 6. Other AA criteria to spot-check
- 1.4.1 color not the only means of conveying info; 3.3.1/3.3.2 form errors identified in text
  + labels/instructions; 2.4.6 descriptive headings/labels; 3.2 consistent nav; 1.4.13 content
  on hover/focus dismissible & persistent; 2.5.7 dragging has a non-drag alternative (2.2 new).

## Gate behavior
Fix what's fixable while preserving content/behavior. If a **core AA criterion cannot be met**
(e.g. a required contrast can't be reached within the palette, or a third-party widget is a
keyboard trap), do NOT silently pass — surface it as a **blocker** with the criterion, the
evidence, and the options. The lane is not "done" until the gate is green or the blocker is
explicitly accepted.

## Guardrail recap
Preserve copy/data/behavior; make it reachable/perceivable/operable. Native HTML over ARIA;
wrong ARIA is worse than none. Fix contrast via passing token steps. As the gate: fix, then
block on unmet core AA — never rubber-stamp.
