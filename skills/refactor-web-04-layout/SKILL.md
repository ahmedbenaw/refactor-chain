---
name: refactor-web-04-layout
description: "Use this skill when the user wants front-end page layout or interaction behavior checked against a consistent standard, or wants a conforming page scaffold generated — trigger phrases like \"check my page layout\", \"is this dialog the right size\", \"drawer conventions\", \"scrollbar rules\", \"hover feedback\", \"toast rules\", \"the spacing feels off\", or \"generate a page skeleton\". Step 04 of the web governance lane in the refactor-chain pipeline. Framework-adaptive: the signals registry detects React, Vue, Svelte, or Angular and the rules are applied in that framework's vocabulary."
---

# Page Layout & Interaction Consistency — refactor-chain · Web lane · step 04

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (web lane, step 04 of 05) · **Prerequisite:** refactor-web-03-components · **Next:** refactor-web-05-naming.
**Adaptivity / conditional:** framework-adaptive — the harness signals registry (`scripts/lib/signals.mjs` + `languages.mjs` under `~/.claude/skills/refactor-chain/scripts/`) identifies the UI framework (React, Vue, Svelte, Angular, or plain DOM) and every rule is expressed and fixed in that framework's idiom.

## Purpose
Make every screen in the app behave like it belongs to the same product. This skill audits page structure (surface hierarchy, dialog and drawer proportions, pinned toolbars, spacing rhythm) and interaction feel (scrollbars, hover affordances, truncation, notifications), then either reports violations with fixes or generates a new page scaffold that already passes the audit. All dimensions are expressed as design tokens and ratio thresholds — never bare pixel constants — so the standard survives theme and density changes.

## When to use
- A layout audit is requested: "check the page layout", "does this screen follow our conventions", "dialog/drawer sizing review".
- An interaction audit is requested: "scrollbar rules", "hover states", "toast behavior", "why do notifications feel inconsistent".
- A new screen is needed: "generate a workspace page", "scaffold a drawer form", "give me a standard confirm dialog".
- The orchestrator reaches step 04 of the web lane.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm checking how your pages are built and how they feel — your features keep working exactly the same."
- "You are here: step 4 of 5 in the web lane. This step is about layout and interaction only."
- "Found 3 must-fix items and 5 nice-to-haves. Want the list first, or shall I fix the must-fix ones?"
- "This drawer is wider than half the screen — I'll pull its width from your size tokens instead. One file changes."
- "That didn't render right — I undid it and I'm trying another approach (attempt 2 of 3)."
- "Say 'show technical details' for the rule IDs, selectors, and exact diffs."

## Method
1. **Detect the stack.** Ask the signals registry which framework and styling approach the project uses (React/Vue/Svelte/Angular; CSS Modules, scoped styles, utility classes, or plain CSS). Do not guess from file extensions alone.
2. **Resolve the token vocabulary.** Find the project's design tokens (CSS custom properties, theme object, or Tailwind config). Map the standard's size roles — small/medium/large dialog, narrow/wide drawer, spacing steps — onto existing tokens; propose tokens only where none exist.
3. **Pick the mode.** *Check* (audit existing pages) or *generate* (produce a new page scaffold). Confirm scope: which routes/components, and whether to audit layout rules, interaction rules, or both.
4. **Check mode.** Run the two rule sets from `references/method.md` — `LAY-01`…`LAY-09` (structure) and `INT-01`…`INT-08` (interaction). Every finding carries a rule ID, severity (ERROR / WARNING / SUGGESTION), file and location, and a concrete behavior-preserving fix. Emit the report on `templates/output.md`.
5. **Generate mode.** Have the user pick one of four archetypes — workspace page, full-screen detail page, drawer panel, or modal dialog — then build it in the detected framework, sized entirely by tokens, and self-audit it against both rule sets before handing it over.
6. **Fix loop (check mode, with consent).** Apply fixes smallest-first, re-render or re-run tests after each, and report progress one decision at a time.
7. Print the step checklist any time with `node scripts/checklist.mjs`.

The load-bearing rules in one breath: surfaces stack lighter-inward (full-screen page > drawer > modal dialog, and a child surface never opens something heavier than its host); dialog and drawer widths come from size tokens with a drawer never exceeding half the viewport; toolbars stay pinned while data scrolls; scrollbars share one quiet global style; long text truncates with a full-value reveal; notifications are non-blocking by default with severity-driven dismissal; every interactive element answers hover; user surface preferences (nav width, unit scale) are remembered. Full definitions with thresholds live in `references/method.md`.

## Guardrails
- Behavior is preserved — this is structural and stylistic refactoring only; no business logic, data flow, or route changes.
- Never introduce a bare pixel constant where a token or ratio exists; never violate the surface-hierarchy descent rule in generated code.
- Ask before any multi-file fix; one undo step is always available (the safety-net branch from earlier in the chain).
- Skip vendor, build, and generated directories entirely.

## Verify
- Plain: "Every screen I touched still shows the same data and buttons — it just sits and moves consistently now."
- Technical: re-run the check — previously reported ERROR findings are gone and no new ones appeared; generated pages pass a full LAY/INT self-audit; the app builds and existing tests pass. Record completion through the harness verify gate: `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs step-done --skill refactor-web-04-layout` so the orchestrator logs the verify delta before advancing.

## Resources
- `references/method.md` — full rule catalog (LAY-01…09, INT-01…08), thresholds, token mapping, framework adaptation notes, and the four generation archetypes.
- `examples/before-after.md` — a drawer page brought up to standard, step by step.
- `scripts/checklist.mjs` — zero-dependency step checklist (JSON); `--rules` prints the rule index.
- `templates/output.md` — the audit-report / generation-summary scaffold.

## Chain position
Runs after `refactor-web-03-components` has normalized component boundaries, so this step can reason about whole pages. On success the orchestrator advances to `refactor-web-05-naming`; `refactor-code-principles` and `refactor-review-gate` still close out the lane as with every refactor-chain run.
