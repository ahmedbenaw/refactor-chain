---
name: refactor-backend-05-controller
description: "Use this skill when organizing the controller layer of a backend web service in any registry-detected stack — splitting controllers into an external-API sub-package and an internal-API sub-package (names configurable, e.g. `external/`/`internal/`), with placement decided by active controller annotations and a three-level deterministic classification chain, never by file names or guesswork. Triggers on phrases like \"controller layer check\", \"controller layer fix\", \"split external and internal controllers\", \"organize controllers by API audience\". This is step 5 of 9 in the layered-backend governance lane of the refactor-chain bundle. Works on any backend codebase in any registry-detected language; no product-, organization-, or language-locked rules."
---

# Controller-Layer Structure — refactor-chain · backend lane · step 05/09

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work · **Prerequisite:** refactor-backend-04-service · **Next:** refactor-backend-06-dependency-guard.
**Adaptivity / conditional:** repo-agnostic — works on any layered backend project in any registry-detected stack. The two audience sub-packages default to `external/` and `internal/`; projects with an existing convention (e.g. `custom/`/`common/`, `open/`/`admin/`) keep their names.

## Purpose
Check and, on request, fix the `controller` layer so every controller lives under `controller/<external>/<group>/` or `controller/<internal>/<domain>/`. Admission is annotation-truth: a file is a controller only if it carries an active (uncommented) `@RestController`/`@Controller` annotation — file names prove nothing. Placement comes from a three-level deterministic chain (exact-name table → keyword table → default external), so repeated runs agree. Only `package` lines, `import` lines, and file locations change.

## When to use
- After the service step (04) and before the dependency guard (06).
- You say things like: "controller layer check", "controller layer fix", "separate external and internal controllers", "why is this controller under config/", "organize controllers by audience".
- Controllers are scattered under feature/config packages, or sit in packages that disagree with the classification chain's computed target.

## What I'll tell you (plain-language / ADHD-friendly)
- "I only decide by annotations, never by file names — `FooController.java` with no live annotation stays exactly where it is, and I'll tell you why."
- "You are here: step 5 of 9. Scan first, then a plan, then nothing moves until you confirm."
- "Scanned 4 areas, found 62 controllers; the cross-check total matches (62 = 62), so nothing slipped through."
- "Moving 12 of 62; each file is copied whole — if a moved file's line count drifts, I roll it back and redo it."
- "Progress: 20 of 47 done. Same order every run, no skipping."
- Want the regex table and the classification pseudocode? Say "show technical details" — it's all in `references/method.md`.

## Method
1. **Scope & naming.** Locate the controller source trees; detect or confirm the two audience sub-package names (default `external/`/`internal/`).
2. **Admission gate (annotation truth).** For every candidate file, run the exact regex table in `references/method.md`: active `@RestController`/`@Controller` admits; `@FeignClient` or a remote-client package excludes; a commented-out annotation excludes; only `@Service`/`@Component`/`@Repository` excludes. Record a per-file audit trail — annotation line number for admitted files, exclusion-rule ID for the rest.
3. **Count-reconciled scan.** Scan area by area (each legacy area independently, then existing `controller/` trees, then a full-tree fallback sweep), output each partition's tally, and cross-validate: partition sum must equal the full-sweep total. Mismatch blocks progress. A zero count in a populated area raises a critical warning.
4. **Classify (three levels, first hit stops).** L1 exact class-name table (append-only, empty by default) → L2 keyword table mapping name/package keywords to internal-domain sub-packages (closed list) → L3 default: external, with the business group extracted by formula from the package path (lowercase the marker-adjacent segment; fallbacks defined for every path shape). Compute the target package with the module-prefix formula.
5. **Check** rules CTL-1…CTL-5 and report:
   - **CTL-1** both audience sub-packages exist — missing either is FAIL.
   - **CTL-2** each controller's package equals its computed target — mismatch is FAIL (no WARN: a file is either placed right or not).
   - **CTL-3** a second-level group holding >10 controllers, or controllers sitting at the audience root, is WARN (reported; never auto-split).
   - **CTL-4** a controller outside any `controller` package is FAIL — the scan must cover all sub-trees, with remote-client exclusions honored.
   - **CTL-5** non-controller classes inside `controller` packages are INFO only; they stay put.
   The check uses the same regexes, gate algorithm, pipeline, and scan patterns as the fix, so what check reports is exactly what fix will do.
6. **Fix (only when asked).** Plan table (class, current, target, level, rule hit) → explicit confirmation → migrate per file with the 9-step flow: read whole file, edit only the `package` line, write with encoding preserved, line-count tolerance ±2 or roll back and redo, update all importers plus the file's own imports via a pre-built old→new tracking map (handles both directions of cross-references), update component-scan and XML config, delete the original, verify. Fixed order (internal first, then external; alphabetical within), progress summary every 10 files, batch summaries above 20, and a completion gate: moved count must equal planned count before verification starts.

## Guardrails
- Behavior is preserved (refactor only): no method bodies, no URL paths, no HTTP methods, no annotation values change.
- Anti-semantics red lines: never rename, merge, or "tidy" group names — the formula output is final, even for misspelled package segments; no semantic grouping of similar names; typo fixes belong to earlier steps, not here.
- Classification tables are closed lists during a run; no on-the-fly additions.
- A controller mixing external and internal endpoints is flagged WARN, never auto-split.
- Same-name collision at a destination is a hard stop; the user decides.

## Verify
Plain language: "every controller is where the rules say, every reference still points at it, and every file is intact."
Three-stage reference verification plus fidelity (details in `references/method.md`):
1. **External references** — no importer anywhere still uses an old path.
2. **Internal cross-references** — each moved controller's own imports contain no legacy paths (tracking-map sweep).
3. **Global import consistency** — full-tree grep of every old package prefix; non-comment hits are failures.
Plus content fidelity (per-file line-count delta ≤ 2, else rollback) and count reconciliation (planned = moved). Then the chain verify gate runs. `node scripts/checklist.mjs` prints the machine-readable step list.

## Resources
- `references/method.md` — admission regex table, gate algorithm, classification pipeline, extraction formulas, scan and migration flows.
- `examples/before-after.md` — worked example including files that must *not* move.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — check-report, fix-plan, and progress scaffolds.

## Chain position
Runs as step 05 of the layered-backend governance lane: step 04 has just normalized the service layer, and step 06 (`refactor-backend-06-dependency-guard`) needs controllers in predictable packages to detect and repair layering violations. The orchestrator (`~/.claude/skills/refactor-chain/scripts/orchestrate.mjs`) tracks lane state and runs the verify gate between steps; `refactor-code-principles` and the review gate run near the end of every lane.
