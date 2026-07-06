---
name: refactor-backend-04-service
description: "Use this skill when tidying the service layer of a backend project in any registry-detected stack — separating service interfaces from their implementations into a dedicated interface package and an `impl/` package, verifying the interface package exists and covers every service interface, and reporting misplaced or non-service files. Triggers on phrases like \"service layer check\", \"service layer fix\", \"split service interfaces and implementations\", \"move ServiceImpl into impl\". This is step 4 of 9 in the layered-backend governance lane of the refactor-chain bundle. Works on any backend codebase in any registry-detected language; no product-, organization-, or language-locked rules."
---

# Service-Layer Structure — refactor-chain · backend lane · step 04/09

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work · **Prerequisite:** refactor-backend-03-dao-model · **Next:** refactor-backend-05-controller.
**Adaptivity / conditional:** repo-agnostic — works on any layered backend project in any registry-detected stack; directory names are configurable (interface package defaults to `facade/`, but `api/` or any project convention is fine).

## Purpose
Check and, on request, fix the structure of the `service` layer so that every service interface lives in one dedicated interface package and every implementation lives in `impl/`. The skill classifies each file with a deterministic decision tree, reports findings at FAIL/WARN/INFO severity, and performs confirmation-gated moves that never touch business logic — only `package` lines, `import` lines, and file locations change.

## When to use
- After the DAO/model step (03) has run and before the controller step (05).
- You say things like: "service layer check", "service layer fix", "check interface/impl separation", "consolidate scattered impl folders", "move ServiceImpl classes into impl/".
- Service interfaces sit loose in the `service/` root or inside business sub-packages, or implementations are scattered across per-feature `impl/` folders.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm only moving files and fixing the package/import lines that point at them — your code keeps working the same."
- "You are here: step 4 of 9 in the backend lane. Next up is the controller layer."
- "I found 14 interfaces and 12 implementations to move. Here's the plan — nothing moves until you say go."
- "Two files would collide at the destination, so I stopped before touching anything. You choose: rename, merge, or skip."
- "That move left a dangling import — I undid it and I'm retrying another way (attempt 2 of 3)."
- Want the exact rules and regexes? Say "show technical details" and I'll walk through `references/method.md`.

## Method
1. **Scope.** Locate every `service` source tree in the build (all Maven/Gradle modules). Confirm the interface-package name with the user (default `facade/`; honor an existing project convention).
2. **Scan exhaustively.** Glob the `service/` roots *and* nested locations (business sub-packages, `*/service/` folders under config or view trees, per-feature `impl/` folders). Merge and de-duplicate before classifying.
3. **Classify deterministically** (first match wins; full tree in `references/method.md`):
   - `interface` whose name ends in `Service` → interface package;
   - remote-client interfaces (e.g. `@FeignClient`) and non-`Service` interfaces → leave in place;
   - class ending in `Impl`/`ServiceImpl`, or `@Service`-annotated class implementing a service interface → `impl/`;
   - ambiguous cases (annotation but no interface, `Service` name without annotation) → leave in place, note in the report.
4. **Check** rules SVC-1…SVC-5 and emit the report from `templates/output.md`:
   - **SVC-1** interface/implementation separation — implementation in the `service/` root is FAIL; interface and impl mixed in one directory is WARN.
   - **SVC-2** interface-package existence and coverage — missing, or not holding every service interface, is FAIL.
   - **SVC-3** interface ownership — a service interface outside the interface package is FAIL; a non-service file inside it is WARN.
   - **SVC-4** implementation ownership — impls outside `service/impl/` (including scattered or misspelled dirs like `imp/`) are FAIL.
   - **SVC-5** non-service file handling — constants, enums, utils, models, remote clients mixed into the two packages are WARN (reported, not moved).
5. **Fix (only when asked).** Phase 1 scan → Phase 1.5 mandatory conflict pre-check (same-name collisions at the destinations and among candidates; wildcard-import impact) → Phase 2 written plan → Phase 3 explicit user confirmation → Phase 4 execute in alphabetical order, interfaces first then implementations, one file at a time using the copy-not-generate move flow (read whole file → change only the `package` line → write to the flattened target → update every referrer's imports project-wide, including build-config and Spring bean references → delete the original) → Phase 5 verify and remove now-empty directories.
6. The target path is a flattening formula: any nesting under `service/` collapses to `service.<interfacePkg>.Name` or `service.impl.Name`. Never reuse a non-standard directory (`imp/`, `svc/`) as a destination.

## Guardrails
- Behavior is preserved (refactor only). No method bodies, signatures, annotations, or comments change — ever.
- Same input + same rules ⇒ same output. If two runs would disagree, stop and report the ambiguity instead of guessing.
- Any name collision halts the run before the first move; the user decides.
- Public interfaces shared across modules are flagged for impact review, not silently moved.
- Preserve file encodings (including BOMs) when moving files.

## Verify
Plain language: "every interface is in one folder, every implementation in another, nothing else changed, and nothing went missing."
Technically, four checks (details in `references/method.md`):
1. **Structure** — interface package and `impl/` exist and contain exactly the classified files; no stragglers match the interface/impl patterns elsewhere under `service/`.
2. **References** — project-wide grep finds zero imports of the old paths; wildcard imports resolved correctly.
3. **Content** — each moved file is byte-identical apart from its `package` line (line-count delta ≤ 1).
4. **Counts** — interfaces and implementations counted after the move equal the counts before.
Then hand off to the chain's verify gate (`refactor-verify`) before advancing. Run `node scripts/checklist.mjs` for the machine-readable step list.

## Resources
- `references/method.md` — full classification tree, scan patterns, move flow, conflict and Spring-reference handling.
- `examples/before-after.md` — worked example of a scattered service layer being consolidated.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — check-report and fix-plan scaffolds.

## Chain position
Runs as step 04 of the layered-backend governance lane, after `refactor-backend-03-dao-model` normalizes DAO and model packages and before `refactor-backend-05-controller`. Getting every service interface into a known package here is what lets step 06 (`refactor-backend-06-dependency-guard`) repair dependency violations without inventing interfaces. The orchestrator (`~/.claude/skills/refactor-chain/scripts/orchestrate.mjs`) tracks lane state and runs the verify gate between steps; `refactor-code-principles` and the review gate run near the end of every lane.
