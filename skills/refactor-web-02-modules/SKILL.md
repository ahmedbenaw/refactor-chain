---
name: refactor-web-02-modules
description: "Use this skill when the user wants to check or fix feature/module boundaries in a web frontend — trigger phrases like \"module boundaries review\", \"split this feature\", \"our features import each other's internals\", \"create a new feature module\", \"module structure check\", or \"this module is too big\". It decides boundaries by business domain (never by page type) using a 3-of-5 quorum matrix, audits each module against a 10-rule anatomy standard, enforces hard encapsulation between modules, and scaffolds new modules wired into routing. Step 2 of 5 in the refactor-chain web governance lane; framework-adaptive (React features, Vue modules, Svelte route groups, Angular feature areas)."
---

# Feature-Module Boundaries & Anatomy — refactor-chain · do-the-work (web lane, step 02/05)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (web lane, step 02 of 05) · **Prerequisite:** refactor-web-01-structure · **Next:** refactor-web-03-components.
**Adaptivity / conditional:** framework-adaptive via the harness signals registry — the feature layer is `features/` (React/Svelte), `modules/` (Vue), or Angular feature areas; router/store correspondence maps to the detected ecosystem.

## Purpose
Carve the feature layer into domain-driven modules with hard walls. Boundary decisions come from a quorum matrix, not gut feel; each module's internal anatomy follows one standard shape; and no module ever reaches into a sibling's internals — cross-module needs route through the shared layers instead. The skill audits existing modules, plans confirmed splits/merges, and scaffolds new modules wired into routing.

## When to use
- "Are our feature boundaries right?" / "module structure check" / "module dependency check".
- "This module has 30 pages, split it" / "this module is too big".
- "OrdersList imports customers' API file directly" / "features import each other's internals".
- "Create a new feature module" / "module scaffold".
- Automatically, as step 2 of the web lane after the structure step is clean.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm going to check that each feature folder maps to one business domain and keeps its hands out of the others. Your app keeps working the same — this is boundary tidying, not a rewrite."
- "You are here: web cleanup step 2 of 5 (module boundaries)."
- "Should 'invoices' be its own module? Scoring the five signals: it owns its data, has its own screens, one team owns it — that's 3 of 5, so yes. Here's the plan."
- "The orders module imports the customers module's API file directly. I'll move that call behind the shared services layer so both use one door."
- "That split broke a route — I rolled it back and I'm re-wiring the route registration first this time (attempt 2 of 3)."
- "Say 'show technical details' for the decision matrix scores and the full 10-rule audit."

## Method
1. **Load context.** Framework + feature-layer location from the harness signal (step 01's report if present). Inventory every module directory.
2. **Boundary check (quorum matrix).** For each candidate boundary, score five signals — business independence, data boundary, cohesion, team ownership, reusability. **3 of 5 or more → separate module.** Split by business domain, never by page type (no `lists/`, `forms/`, `details/` modules). Full scoring rubric in `references/method.md`.
3. **Anatomy audit (`MOD-01`…`MOD-10`).** Each module must contain views/pages, `api/`, `types/`, and a public entry file; kebab-case module dirs and PascalCase view components; a size ceiling (default 10 views, configurable) that triggers a sub-domain split; `api/` ↔ `types/` files pair one-to-one; sub-modules repeat the same shape; every routed module has a route registration and (if stateful) a store slice/composable.
4. **Encapsulation check.** No module imports another module's internals — **including its `api/` layer**. Cross-module data flows through `services/api/` (shared endpoints), shared hooks/composables, the store, or route navigation. Only the entry file is importable, and only where the architecture explicitly allows it.
5. **Report** via `templates/output.md`: matrix scores, per-module rule table, violation list with fixes.
6. **Govern (confirmation-gated).** Checkpoint (`orchestrate.mjs checkpoint --label pre-modules`), present the split/merge/move plan with the import-rewrite and route-update list, get explicit confirmation, execute in batches, re-run baseline.
7. **Scaffold (on request).** Generate a standard module from `templates/output.md`, register its routes in the framework layer, export the public entry, then re-audit it with the same 10 rules.

## Guardrails
- Behavior is preserved — boundary and structure changes only; API calls keep the same endpoints and payloads when moved behind shared layers.
- Never split or merge modules without a confirmed plan; routes and store registrations are updated in the same batch as the file moves, never later.
- Respect domain language: module names come from the business vocabulary the code already uses, not invented taxonomy.
- Borderline quorum scores (exactly 3) are presented as a choice, not silently applied.

## Verify
- Plain: "Every feature folder is one business domain with one front door, and the app still builds and passes its tests."
- Technical: baseline green after each batch; grep confirms zero cross-module internal imports (including sibling `api/` files); every module passes MOD-01…MOD-10 or carries an accepted waiver; routes resolve; then `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs advance --target <dir>` — the verify gate blocks on drift.

## Resources
- `references/method.md` — quorum rubric, the 10 rules in full, encapsulation policy, split procedure.
- `examples/before-after.md` — a page-type-organized app re-cut into domain modules, with the quorum scoring shown.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — audit-report scaffold + standard module skeleton (framework-adaptive).

## Chain position
Second step of the web lane: consumes the clean layer map from refactor-web-01-structure, feeds refactor-web-03-components a stable module layout so component standards apply to settled files. Lane closes with refactor-code-principles + the review gate.
