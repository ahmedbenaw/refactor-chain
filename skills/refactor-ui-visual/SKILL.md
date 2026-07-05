---
name: refactor-ui-visual
description: "Improves the visual design of a web UI from first principles — visual hierarchy, spacing systems, typography scale, semantic color roles, and depth/affordance. Use when the user asks to \"make this look better\", \"clean up the UI\", \"fix the spacing/colors/fonts\", wants a more professional interface, or needs styling decisions made with taste. It can be scoped to one concern (hierarchy, spacing, typography, color, or depth). Presentation-only: it changes how things look while preserving content, structure, data, and behavior. Part of the UI lane of the refactor-chain pipeline; runs after refactor-ui-tokens and before refactor-ui-a11y."
---

# Visual Design Refactor — refactor-chain · UI lane

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (UI lane) · **Prerequisite:** refactor-ui-tokens (a token scale to draw from) · **Next:** refactor-ui-components / refactor-ui-a11y, then refactor-code-principles and the review gate.
**Adaptivity / conditional:** repo-agnostic across CSS, CSS-in-JS, Tailwind, and framework component styles. Can run whole-surface or scoped to a single concern.

## Purpose
Make an interface look considered instead of accidental — by applying a small set of durable visual-design principles rather than ad-hoc tweaks. It fixes what the eye reads as "amateur": flat hierarchy, arbitrary spacing, too many font sizes, muddy color, and missing depth cues. Every change is presentation-only; the DOM's meaning, copy, and behavior are untouched.

## When to use
- "Make this look better / more professional / less cluttered."
- A specific concern: "the spacing is off", "too many font sizes", "the colors feel muddy", "nothing stands out", "it looks flat".
- Establishing or tightening a visual system on top of extracted tokens.
- The orchestrator reaches the visual step of the UI lane.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm only changing how it looks — the words, data, and what every button does stay exactly the same."
- "You are here: the visual pass of the UI lane. I work one concern at a time so it never turns into a redesign."
- "Biggest win first: right now everything is the same size, so nothing guides the eye. I'll fix hierarchy, then spacing, then color."
- "Here's the before/after for this screen's header — same content, clearer emphasis. Keep it? (keep / undo)."
- "Say 'show technical details' for the exact size/weight/token changes per element."

## Method
Work concern by concern; each is a small, reversible pass verified before the next.
1. **Read the surface and pick the concern order.** Default order: hierarchy → spacing → typography → color → depth. If the user scoped one concern, do only that. Draw values from the project's token scale (refactor-ui-tokens); never introduce new magic numbers.
2. **Hierarchy** (`references/hierarchy.md`): establish what should draw the eye first via size, weight, and contrast — not by adding decoration. De-emphasize secondary/supporting text; give primary actions visual priority.
3. **Spacing** (`references/layout-spacing.md`): apply one consistent spacing scale; use whitespace to group related things and separate unrelated ones; remove uneven, arbitrary gaps.
4. **Typography** (`references/typography.md`): collapse to a small type scale; set comfortable line-length and line-height; restrain to one or two families used deliberately by weight.
5. **Color** (`references/color.md`): use semantic roles (surface, ink, accent, muted, states) rather than one-off hexes; ensure text/background pairings stay legible; carry warmth/brand through accent and imagery, not muddy body backgrounds.
6. **Depth & affordance** (`references/depth-and-polish.md`): use elevation, borders, and restrained shadow to signal what is interactive and what floats above; avoid decorative glassmorphism and gradient text.
7. **Verify and record.** After each concern, capture a before/after and confirm content/behavior are unchanged. `node scripts/checklist.mjs` prints these steps; `--concern <name>` scopes to one.

## Guardrails
- Presentation only — no content edits, no structural/DOM meaning changes, no behavior or data changes.
- Every value comes from the token scale; no reintroduced magic numbers.
- One concern at a time, each reversible; a whole-screen redesign is out of scope (that is `refactor-reimagine`, advisory).
- Accessibility is not sacrificed for looks — contrast stays legible; `refactor-ui-a11y` gates the lane afterward.

## Verify
- Plain: "Same screen, same words, same buttons — it just reads clearly now."
- Technical: content and DOM structure diff shows style-only changes; contrast ratios still pass; no new hardcoded values (all resolve to tokens); the before/after ledger lists each change with its concern and rationale. Record completion through the harness verify gate before the lane advances.

## Resources
- `references/hierarchy.md`, `references/layout-spacing.md`, `references/typography.md`, `references/color.md`, `references/depth-and-polish.md` — the per-concern methods in depth.
- `examples/before-after.md` — a cluttered screen worked through every concern.
- `scripts/checklist.mjs` — zero-dependency step checklist (JSON); `--concern <name>` scopes it.
- `templates/output.md` — the visual-change report (change · concern · before · after · why · keep/undo).

## Chain position
Runs in the UI lane after `refactor-ui-tokens` (which gives it a token scale) and the structural passes, before `refactor-ui-a11y` (the accessibility gate). On success the lane continues to `refactor-code-principles` and then `refactor-review-gate` arbitrates the whole diff.
