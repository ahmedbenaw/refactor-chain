---
name: refactor-web-01-structure
description: "Use this skill when the user asks for a \"project structure check\", \"folder structure audit\", \"layered architecture review\", \"directory cleanup\", \"scaffold a frontend project\", or \"fix our import directions\" on a web frontend codebase. It audits the source tree against a layered reference layout, enforces an allowed-imports matrix, and can scaffold a compliant skeleton. Step 1 of 5 in the refactor-chain web governance lane. Framework-adaptive: it detects React, Vue, Svelte, or Angular via the harness signals registry and speaks that framework's vocabulary (hooks vs composables, router/store equivalents)."
---

# Frontend Structure Audit & Scaffold — refactor-chain · do-the-work (web lane, step 01/05)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (web lane, step 01 of 05) · **Prerequisite:** green baseline (`refactor-safety-net`) · **Next:** refactor-web-02-modules.
**Adaptivity / conditional:** framework-adaptive — the harness signals registry (`refactor-chain/scripts/lib/signals.mjs`, surfaced by `diagnose.mjs`) detects React / Vue / Svelte / Angular / React Native, and every rule is phrased in that framework's native vocabulary.

## Purpose
Give a web frontend a predictable, layered source tree: every file has one obvious home, and dependencies only flow downward. The skill does two jobs — **audit** (scan the tree, report violations with severities and fixes) and **scaffold** (generate a compliant skeleton, including a design-token variables file, then self-check it against the same rules). Directory moves are planned first, confirmed by the user, and executed with full import-path rewriting so nothing breaks.

## When to use
- "Is our folder structure sane?" / "project structure check" / "layered architecture review".
- "Set up a new frontend project properly" / "scaffold the app skeleton".
- "Components are importing feature code and it's a mess" / "fix our import directions".
- As the entry step whenever the orchestrator routes a repo into the web lane.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm going to map your `src/` folders against a standard layered layout and show you what's out of place. Nothing moves until you say so — your app keeps working the same."
- "You are here: web cleanup step 1 of 5 (folder structure). Modules come next."
- "I found 3 blockers and 5 warnings. Here's the first one: `components/UserBadge` imports from a feature folder — shared components must never do that. Want the fix plan?"
- "Moving these 12 files means rewriting 41 import lines. I'll do all of them in one confirmed step, then re-run your tests."
- "That move broke two imports — I rolled it back and I'm redoing it with path aliases (attempt 2 of 3)."
- "Say 'show technical details' for the full rule table and the dependency matrix."

## Method
1. **Detect the framework.** Run `node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs classify --target <dir>` and read the `framework` signal. Adopt that framework's vocabulary: React/Svelte *hooks* ↔ Vue *composables* ↔ Angular *injectable services/signals*; router and store map to the detected ecosystem (React Router/Next, vue-router/Pinia, SvelteKit routes/stores, Angular Router/NgRx).
2. **Scan the tree.** Inventory `src/` against the reference layers: `assets/` (styles, icons, images), `components/` (shared, tiered `common`/`layout`/`business`), `composables/` or `hooks/`, `features/` (or `modules/`), a framework layer (`router/`, `store/`, `plugins/`, `directives/`, `config/` — whichever exist in this ecosystem), `services/` (`http/` client + shared `api/`), `utils/`, `types/`.
3. **Apply the rule set** (`STR-01`…`STR-08`, full definitions in `references/method.md`): layer completeness (blocker), asset foldering (warning), component tiering (blocker), composite-component folders (warning), framework-layer split (warning), services split (warning), hook/composable naming — `useXxx` camelCase or the repo's established `use-` file convention (blocker), and the **allowed-imports matrix** (blocker): features depend downward on shared layers; `components/`, `utils/`, and `services/` never import features; the framework layer touches features only to register routes; no feature imports another feature's internals.
4. **Report.** Fill `templates/output.md`: per-rule pass/fail, severity, evidence paths, fix suggestion.
5. **Govern (confirmation-gated).** Build a move plan (source → destination → every import line that changes). Take a harness checkpoint (`orchestrate.mjs checkpoint --label pre-structure`), get explicit user confirmation, execute moves, rewrite all import paths, re-run the baseline.
6. **Scaffold (on request).** Generate the skeleton from `templates/output.md`'s scaffold section — including `assets/styles/tokens` (design-token variables file) — then re-run steps 2–4 on the generated tree until clean.

## Guardrails
- Behavior is preserved — structure-only refactor; never edit logic while moving files.
- Never move a file without a confirmed plan; every move batch is checkpointed and reversible via `orchestrate.mjs`.
- Respect existing conventions when they are internally consistent (e.g. `features/` vs `modules/`, `hooks/` vs `composables/`) — align names, don't churn them.
- Monorepos: audit each app package separately; never hoist feature code to the workspace root.

## Verify
- Plain: "Everything still builds and tests pass; every file now has one home, and imports only point downward."
- Technical: baseline re-run is green; type-check/build resolves every rewritten import; a fresh audit pass reports zero blockers; then advance the harness — `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs advance --target <dir>` (the verify gate refuses to advance on drift).

## Resources
- `references/method.md` — full rule definitions, severity policy, framework vocabulary map, move-plan procedure.
- `examples/before-after.md` — a tangled React `src/` audited and restructured, with the import-rewrite diff.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — audit-report scaffold + compliant-skeleton scaffold (with token variables file).

## Chain position
Entry step of the web governance lane (fed by plan + baseline). Feeds refactor-web-02-modules a clean layer map so module boundaries land on solid ground. The lane continues 02 → 03 → 04 → 05, then `refactor-code-principles` and the review gate close it out.
