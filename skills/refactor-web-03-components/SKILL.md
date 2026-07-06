---
name: refactor-web-03-components
description: "Use this skill when checking UI components against a design standard or generating standard-compliant components in a web frontend — trigger phrases like \"component standard check\", \"color check\", \"typography check\", \"button standard\", \"table standard\", \"input standard\", \"generate a data table\", \"generate a query panel\", \"UI full check\". It audits five rule categories (color, typography, buttons, inputs, tables — ~37 rules, three severity tiers, scopable to any subset), expresses every color and size as the project's semantic design tokens, and generates composite components (query panel, data table, form/detail cards, log view, progress) from templates cross-checked against the same rules. Step 3 of 5 in the refactor-chain web governance lane; framework-adaptive (React/Vue/Svelte/Angular via the signals registry)."
---

# Component Standards & Generation — refactor-chain · do-the-work (web lane, step 03/05)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (web lane, step 03 of 05) · **Prerequisite:** refactor-web-02-modules · **Next:** refactor-web-04-layout.
**Adaptivity / conditional:** framework-adaptive via the harness signals registry — audit selectors and generated code use the detected ecosystem's vocabulary (React JSX/hooks, Vue SFCs, Svelte components, Angular templates). Token-driven: colors and sizes resolve to the project's semantic tokens (from `refactor-ui-tokens` when it has run); dimensional caps are configurable thresholds, not magic numbers.

## Purpose
Make every screen-level component follow one visual contract. The skill audits components against five rule categories — color, typography, buttons, input controls, tables — with three severity tiers, and generates new composite components from templates that are themselves checked against the same rules before delivery. Nothing is expressed as a hard-coded hex or pixel value: rules reference the project's semantic token layer (`--color-primary`, `--color-danger`, `--font-size-body`, …), so the standard travels with the design system instead of freezing one palette.

## When to use
- "Component standard check" / "UI full check" / "color check" / "typography check" / "button standard" / "input standard" / "table standard".
- "Generate a data table" / "generate a query panel" / "generate a form card" / "scaffold a detail view".
- "Why does this button hard-code a blue?" / "our tables all look different".
- Automatically, as step 3 of the web lane once module boundaries (step 02) are settled.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm checking that your buttons, forms, and tables all follow the same visual rulebook. Behavior doesn't change — this is consistency, not redesign."
- "You are here: web cleanup step 3 of 5 (component standards)."
- "This button hard-codes a hex color. I'll switch it to your `--color-primary` token — it looks identical today, and follows the theme when it changes."
- "Two primary buttons on one page — that's the one rule I flag as an error; which action is the main one?"
- "Generating your data table now: row numbers, frozen action column, zebra rows, accessible labels — then I audit my own output before handing it over."
- "Say 'show technical details' for the full 37-rule table and severity map."

## Method
1. **Load context.** Framework + component-library signals from the harness registry; token vocabulary from the project's token layer (or `refactor-ui-tokens` output). If no token layer exists, flag it and cross-reference `refactor-ui-tokens` before enforcing color rules.
2. **Scope.** Whole app, one module, one file, or one rule category — checks are scopable; "color check" runs only CLR rules.
3. **Audit** against the five categories (full tables in `references/method.md`):
   - **CLR (color, 5 rules):** brand/functional colors correct (ERROR), neutrals consistent (WARN), palette-size cap (WARN), token usage instead of literals (SUGGESTION → ERROR once a token layer exists).
   - **TYP (typography, 5 rules):** sizes from the token scale (ERROR), weight conventions, label-width cap, alignment rules, numeric formatting (WARN).
   - **BTN (buttons, 8 rules):** ≤1 primary per view (ERROR), ≤1 danger (WARN), total-count cap with overflow-menu collapse, overflow-panel width cap, text on the body token size (ERROR), loading states, secondary-page ordering, back-button placement (WARN).
   - **INP (inputs, 8 rules):** required marker (ERROR), placeholders, disabled styling, select conventions, clearability, label layout and width cap, editable-area affordance, query-panel conventions (WARN/SUGGESTION).
   - **TBL (tables, 11 rules):** row-number column (ERROR), selection column, action column, frozen-column cap, zebra striping, header style, per-type alignment, totals rows, link style, column widths, filter/sort affordances (WARN/SUGGESTION).
4. **Report** via `templates/output.md`: per-rule verdicts, file:line evidence, token-resolved fix suggestions, severity totals.
5. **Fix (confirmation-gated).** Checkpoint first, then apply confirmed fixes: literals → tokens, structure adjustments per rule, batched with baseline re-runs.
6. **Generate (on request).** Compose from `references/method.md` §7 template recipes — query panel, data table, form card, detail card, log view, progress indicator — in the detected framework's idiom, with accessible names/labels (`aria-*` or framework equivalent) on every interactive element, then **self-audit the output** against the same rule categories before delivery.

## Guardrails
- Behavior is preserved — visual-consistency and structure changes only; handlers, data flow, and business logic are untouched.
- Token-driven, never palette-frozen: fixes map a literal to the *semantically matching* token; an unmappable literal is reported, not guessed.
- Dimensional caps (buttons per view, frozen columns, label width, panel width) are configurable thresholds with sane defaults — projects override them in the report header, and the audit uses the overridden values.
- Only ERROR-tier findings block; WARN and SUGGESTION are advisory and never auto-fixed without confirmation.
- Generated code is delivered only after passing its own audit.

## Verify
- Plain: "Every screen uses the same colors, sizes, and component shapes — and anything I generated follows the same rules I check yours against."
- Technical: zero ERROR-tier findings in scope (or accepted waivers); grep shows no new color/size literals introduced by fixes; generated components pass the self-audit with accessible labels present; baseline green; then `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs advance --target <dir>` — the verify gate blocks on drift.

## Resources
- `references/method.md` — all ~37 rules with severities, token-resolution policy, threshold table, generation recipes.
- `examples/before-after.md` — a hard-coded, inconsistent form + table brought onto the standard.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — audit-report scaffold + generation-request scaffold.

## Chain position
Third step of the web lane: consumes the settled module layout from refactor-web-02-modules, feeds refactor-web-04-layout components whose internals are already consistent. Works hand-in-hand with `refactor-ui-tokens` (token vocabulary) and `refactor-ui-a11y` (deeper accessibility passes). Lane closes with refactor-code-principles + the review gate.
