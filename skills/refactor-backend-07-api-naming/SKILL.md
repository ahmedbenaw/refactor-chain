---
name: refactor-backend-07-api-naming
description: "Use this skill when checking or fixing REST API and naming conventions in a backend project — endpoint path structure, HTTP-method usage, class and property naming, request-parameter conventions, response-wrapper conventions, and bean-name conflicts. Triggers on phrases like \"API naming check\", \"naming convention fix\", \"check endpoint conventions\", \"rename classes to standard suffixes\", \"bean name conflict\". Step 7 of 9 in the refactor-chain backend lane (do-the-work phase). Behavior-preserving: it renames and re-annotates, it never changes what the code does or breaks a published API contract."
---

# API & Naming Conventions — refactor-chain · backend lane · step 07/09

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work · **Prerequisite:** refactor-backend-06-dependency-guard · **Next:** refactor-backend-08-common-extract.
**Adaptivity / conditional:** repo-agnostic — works on any layered backend project in any registry-detected stack. Spring/Jakarta idioms appear below as examples, not requirements; adapt the patterns to whatever web framework the repo uses.

## Purpose
This step audits a Java codebase against API and naming conventions and then repairs the subset of findings that can be fixed without touching any external contract. It runs six severity-ranked checks — endpoint path structure, class naming, property naming, request-parameter conventions, response-wrapper conventions, and bean-name conflicts — and sorts every finding into **fixable** (safe internal rename or annotation change) or **constrained** (would alter a published URL, JSON shape, or parameter name, so it is reported but never auto-changed). Fixes are deterministic and idempotent: the same input always produces the same plan, and a second run over clean code changes nothing.

## When to use
- Right after the dependency guard (step 06) has passed, and before shared-code extraction (step 08) — renames must land before files start moving between modules.
- When the user says "API naming check", "naming convention check/fix", "standardize endpoint paths", "fix class suffixes", or "resolve bean name conflicts".
- When a review found classes like `OrderCtrl` or `UserSvc`, duplicate bean names, or endpoints with inconsistent verbs and casing.

## What I'll tell you (plain-language / ADHD-friendly)
The calm, jargon-free way this skill talks to the person running it:
- "I'm scanning your controllers and services for naming issues — read-only for now, nothing changes yet. (You are here: step 7 of 9.)"
- "I found 12 issues. 7 are safe to fix automatically; 5 would change your public API, so I'll only list those — your endpoints keep working exactly the same."
- "Next up: rename `OrderCtrl` to `OrderController` and update the 5 files that reference it. OK to proceed?"
- "That rename would collide with an existing class — I stopped before touching anything and need your call."
- "Done. I re-checked: zero stale references, and running me again would change nothing. Want to see the technical details?"

## Method
Work through `references/method.md` for the exhaustive rules; the shape is:
1. **Scope the scan.** Enumerate production `.java` sources in web, service, persistence, and model packages; skip tests, generated code, and build output.
2. **Check (read-only).** Run the six checks in fixed order (N-01…N-06), classify each finding fixable vs constrained via the contract-impact decision flow, and emit the report from `templates/output.md` — deterministically sorted so repeat runs produce identical reports.
3. **Plan and confirm.** Build a fix plan (file, current → target, affected references, risk) for fixable items only. Show it and wait for explicit user approval — the refactor-chain review gate applies.
4. **Fix in strict order.** (a) HTTP-method compatibility broadening on delete/update mappings where the team requires it; (b) class renames via the six-step procedure (idempotence check → collision pre-check → class declaration → file rename with `mv` to preserve encoding → imports → usages and injection-point variable names); (c) bean-conflict resolution via the decision tree. One item at a time; grep-verify zero stale references after each.
5. **Verify.** Re-run the check; the fixable count must reach zero and no new findings may appear.

## Guardrails
- Behavior is preserved — this is a rename/annotation pass only. Method bodies are never edited.
- Never change a URL path, an HTTP method's existing semantics, a serialized property name, or a request-parameter name: those are constrained items, reported only.
- Every fix plan needs user confirmation before any edit; on any ambiguity (a comment explaining an odd name, a three-way conflict, possible external callers) stop and ask.
- Rename files with `mv`, never read-and-rewrite — this preserves the original file encoding (including BOMs).
- A fix must not create a new problem: pre-check every target name against the whole project and the global bean-name list.
- Pair with `refactor-safety-net` (checkpoint before the fix pass) and `refactor-verify` (behavior comparison after it).

## Verify
- Plain language: "I re-checked everything I changed; the old names are gone everywhere, and your app's endpoints and JSON responses are exactly what they were."
- Technical: grep each old class name and old import → 0 hits; every file name matches its class name; the bean-name list has no duplicates; the re-run check reports 0 fixable items; the project compiles. The harness verify gate (`~/.claude/skills/refactor-chain/scripts/orchestrate.mjs`) must pass before the chain advances.

## Resources
- `references/method.md` — full check rules, classification table, fix procedures, determinism/idempotence rules.
- `examples/before-after.md` — worked rename and method-compat example.
- `scripts/checklist.mjs` — prints the step checklist as JSON.
- `templates/output.md` — check-report and fix-plan scaffolds.

## Chain position
Runs seventh in the backend lane: fed by refactor-backend-06-dependency-guard (clean layer dependencies mean renames cannot mask structural problems), it feeds refactor-backend-08-common-extract (names must be stable before files move between modules) and, through it, refactor-backend-09-code-optimize. `refactor-code-principles` and the review gate run near the end of every lane; the harness records this step's completion before advancing.
