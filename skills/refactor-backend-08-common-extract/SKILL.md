---
name: refactor-backend-08-common-extract
description: "Use this skill when extracting shared code out of feature modules into a project's shared common module — utility, cache, constants, enums, exception, and configuration packages — in a multi-module layered backend project in any registry-detected stack. Triggers on phrases like \"extract common module\", \"consolidate shared code\", \"move utils to common\", \"common package check\". Step 8 of 9 in the refactor-chain backend lane (do-the-work phase). Behavior-preserving: files move between modules and build files gain dependencies, but no class is renamed and no logic changes. Idempotent — a re-run on a finished project migrates nothing."
---

# Shared-Module Extraction — refactor-chain · backend lane · step 08/09

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work · **Prerequisite:** refactor-backend-07-api-naming · **Next:** refactor-backend-09-code-optimize.
**Adaptivity / conditional:** repo-agnostic — any multi-module Maven or Gradle project with (or ready to gain) a shared `<project>-common` module. Spring idioms below are examples, not requirements.

## Purpose
This step finds shared, dependency-free code that is stranded inside feature modules — the six universal package families `util`, `cache`, `constant`, `enums`, `exception`, and `config` — and migrates it into the project's shared common module so every module can use one copy. Each candidate file is classified by mechanical dependency analysis (grep results, not vibes) into **EXTRACT** (moves automatically), **EVALUATE** (user decides), or **RETAIN** (stays put — anything coupled to a service or data-access layer). Migration is file-by-file with immediate verification, then the build files are rewired: source modules depend on common, and common gains exactly the third-party libraries the moved files need. Business logic never moves and nothing is renamed.

## When to use
- After naming is stable (step 07) and before the code-quality pass (step 09) — moving files after renames means references only need updating once.
- When the user says "extract the common module", "consolidate shared utilities", "why is DateUtils copy-pasted in three modules", or "common package check".
- Check-only mode is available: classify and report without moving anything.

## What I'll tell you (plain-language / ADHD-friendly)
The calm, jargon-free way this skill talks to the person running it:
- "I'm listing the shared-looking code in your feature modules and checking what each file depends on — nothing moves yet. (You are here: step 8 of 9.)"
- "22 files are safe to move, 3 need your judgment, 11 should stay because they're wired into this module's services or database layer."
- "Moving `DateUtils` now: copy → check references → delete the original. The original stays in place until the copy verifies."
- "This one stays put — it's a persistence-scanner config; moving it would break your app at startup, so I won't."
- "All moves done and every reference still resolves. Your code behaves exactly as before — it just lives in a tidier place."

## Method
Full rules in `references/method.md`; the shape:
1. **Pre-flight.** Confirm the common module exists and is registered in the parent build file, and that the user has a checkpoint (`refactor-safety-net`). Any failure aborts.
2. **Scan.** Glob the six package families under each feature module.
3. **Classify each file** through the four-gate decision tree: Gate 1 red lines (persistence-scanner configs and name collisions always RETAIN), Gate 2 imports of the module's service/DAO layers, Gate 3 injected dependencies (a whitelist of framework-provided components like `RedisTemplate`/`ObjectMapper` is tolerated) plus cross-module reference count (threshold 2, deduplicated per module), Gate 4 config-class specials (component-scan paths). First hit wins; grep evidence only.
4. **Confirm the migration list.** EXTRACT auto-listed, EVALUATE shown for a decision, RETAIN excluded. User approves before any move.
5. **Migrate file-by-file** in dependency order — `constant → enums → exception → util → cache → config` — using the seven-step loop: read → compare package vs target path → copy with `cp` (encoding preserved) → grep all referencing imports → update imports only if the package actually changed (usually it does not) → delete the source file → verify (target package correct, references resolve, source gone). Never batch.
6. **Rewire builds.** Add the common-module dependency to each source module that now needs it; add to common only the third-party libraries its new files import; confirm the parent module list; then emit the migration report from `templates/output.md`.

## Guardrails
- Behavior preserved: no method body, signature, annotation, field, class name, or file name changes — files move, nothing else.
- Persistence-scanner configuration classes (e.g. anything carrying a MyBatis `@MapperScan`) are an absolute red line: never moved.
- A name collision in the common module halts that file — the user chooses merge/keep/replace; nothing is overwritten silently.
- Copy-then-delete, never move-in-one-step: the source survives until the copy verifies. Use `cp`, never read-and-rewrite (encoding/BOM).
- Only the six package families are in scope; service/controller/DAO/model code is other steps' business.
- If moving a Spring-managed bean, verify component-scan coverage of its package in the target module; warn if not covered.

## Verify
- Plain language: "Every moved file compiles from its new home, every old copy is gone, and nothing that stayed behind lost a dependency."
- Technical: each moved file's package declaration matches its new path; grep shows all imports of moved classes resolve; source paths are gone; empty source directories cleaned; the build compiles across modules; a re-run reports an empty migration list. The harness verify gate (`~/.claude/skills/refactor-chain/scripts/orchestrate.mjs`) plus `refactor-verify` must pass before advancing.

## Resources
- `references/method.md` — decision tree, whitelist, seven-step loop, build rewiring, special cases.
- `examples/before-after.md` — one EXTRACT migration and one RETAIN refusal, worked.
- `scripts/checklist.mjs` — prints the step checklist as JSON.
- `templates/output.md` — classification report and migration report scaffolds.

## Chain position
Runs eighth in the backend lane: fed by refactor-backend-07-api-naming (stable names mean each reference updates once), it feeds refactor-backend-09-code-optimize (the quality pass then covers the consolidated code once instead of per-copy). `refactor-code-principles` and the review gate close the lane; the harness records completion before advancing.
