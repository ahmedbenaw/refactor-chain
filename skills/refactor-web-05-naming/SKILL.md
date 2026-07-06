---
name: refactor-web-05-naming
description: "Use this skill when the user wants front-end names checked or repaired — trigger phrases like \"naming check\", \"naming review\", \"rename this component properly\", \"fix our file names\", \"CSS class conventions\", \"event handler naming\", \"props type naming\", or \"our casing is all over the place\". Covers component, file, variable, CSS class, event, label, workflow-node, and props/type naming, with safe rename propagation across imports, templates, and styles. Step 05 of the web governance lane in the refactor-chain pipeline. Framework-adaptive: the signals registry detects React, Vue, Svelte, or Angular and applies that framework's naming idiom."
---

# Front-End Naming Check & Repair — refactor-chain · Web lane · step 05

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (web lane, step 05 of 05) · **Prerequisite:** refactor-web-04-layout · **Next:** refactor-code-principles, then the review gate.
**Adaptivity / conditional:** framework-adaptive — the harness signals registry (`scripts/lib/signals.mjs` + `languages.mjs` under `~/.claude/skills/refactor-chain/scripts/`) identifies the framework, and each rule is applied in that framework's naming idiom (React callback props, Vue emitted-event casing, Angular file-role suffixes, and so on). Style-class rules are convention-aware: the skill detects whether the project uses BEM, CSS Modules, or utility classes and enforces *that*, not a foreign convention.

## Purpose
Make every name in the front end say what the thing is. This skill audits eight naming categories — components, files and directories, variables and functions, CSS classes, event handlers, user-facing labels, workflow/menu nodes, and props/contract types — and produces a severity-ranked report. In fix mode it performs renames the safe way: plan first, get a yes, then propagate every rename through imports, template/JSX usages, style selectors, and tests so nothing dangles.

## When to use
- A naming audit is requested: "naming check", "naming review", "are our names consistent".
- A repair is requested: "fix the naming", "rename these properly", "clean up our casing".
- One category is in question: "component naming", "file naming", "CSS class names", "handler prefixes", "props types".
- The orchestrator reaches step 05 of the web lane.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm only checking names — what your code does stays exactly the same."
- "You are here: step 5 of 5 in the web lane. After this, the standard final quality pass."
- "Worst first: 2 names that can break tooling, 6 that are just inconsistent, 3 that are taste."
- "Renaming `tableData.ts` to `table-data.ts` touches 4 imports — here's the list. OK to proceed?"
- "That rename broke a test import — I put it back and I'm redoing it with the test included (attempt 2 of 3)."
- "Say 'show technical details' for rule IDs, regexes, and the full rename map."

## Method
1. **Detect the stack and the local dialect.** Ask the signals registry for the framework, then sample the codebase to learn conventions the project has *already chosen* (component-file casing, `Base`/`App`/`Ui` prefix for shared primitives, BEM vs CSS Modules vs utility classes). Enforce the project's own choice consistently; only fall back to the defaults in `references/method.md` where no choice exists.
2. **Scope.** Confirm files/directories and categories (all eight, or the one asked about). Vendor, build, and generated directories are always excluded.
3. **Check.** Run `NAME-01`…`NAME-08` from `references/method.md`. Every finding carries a rule ID, severity (ERROR / WARNING / SUGGESTION), location, the offending name, and the compliant form. Emit the severity-ranked report on `templates/output.md`.
4. **Plan the fix (fix mode).** Build a rename map (old → new, per symbol/file/class) plus the full propagation set: import/export paths, template and JSX usages, component registrations, style selectors, route/config strings, test files. Show the plan and wait for explicit approval — batch renames never run unannounced.
5. **Apply and propagate.** Prefer language-server/IDE-grade renames where available; otherwise edit all references atomically per rename. After each batch: build/typecheck, run tests, and grep for the old name to prove zero survivors.
6. **Re-check.** The audit must come back clean (or with accepted, documented exceptions) before the step is done. `node scripts/checklist.mjs` prints this checklist; `--rules` prints the rule index.

The eight categories in one breath: components are multi-word PascalCase and match their file; non-component files and directories are kebab-case (framework component-file conventions respected — Angular's role-suffixed kebab-case files included); variables are camelCase with UPPER_SNAKE_CASE constants, PascalCase types, and `is/has/can/should` booleans; style classes follow the project's declared convention; handlers are `handle`-prefixed with `on`-prefixed callback props and framework-correct event-name casing; user-facing labels are short, business-worded, and sibling-consistent; workflow/menu nodes are verb-object and role-based; props/contract types are `ComponentName` + `Props`/`Emits` and always typed.

## Guardrails
- Behavior is preserved — names only; no logic, signature, or data changes.
- Every rename propagates everywhere or does not happen: no dangling imports, stale component registrations, orphaned selectors, or broken test paths. Grep-for-survivors is mandatory.
- Batch renames require a shown plan and an explicit yes; undo is one step away via the chain's safety-net branch.
- Never rename inside vendor/build output, public API surfaces, or externally-consumed exports without calling that risk out separately.

## Verify
- Plain: "Everything still builds and every test still passes — the names just make sense now."
- Technical: re-run the check — prior ERROR findings gone, none introduced; typecheck/build green; test suite green; `grep` for each old name returns only intentional survivors (e.g. changelog mentions). Record completion through the harness verify gate: `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs step-done --skill refactor-web-05-naming` so the orchestrator logs the verify delta before the lane hands over to `refactor-code-principles`.

## Resources
- `references/method.md` — the eight rule categories in full, framework idiom table, dialect-detection procedure, and the rename-propagation protocol.
- `examples/before-after.md` — a component + file + class rename propagated end to end.
- `scripts/checklist.mjs` — zero-dependency step checklist (JSON); `--rules` prints the rule index.
- `templates/output.md` — the severity-ranked report / rename-plan scaffold.

## Chain position
Final governed step of the web lane, after `refactor-web-04-layout`. On success the orchestrator hands over to `refactor-code-principles` (the default closing pass of every lane), and `refactor-review-gate` then arbitrates the whole diff before shipping.
