---
name: refactor-legacy-assess
description: "Use this skill to detect the anti-patterns and modernization-readiness gaps that decide which refactor lane and steps make sense — tight coupling, missing/loose types, deprecated or end-of-life APIs, dead code, no test seam, outdated language/runtime targets. Trigger phrases: \"is this ready to modernize\", \"what's blocking an upgrade\", \"find the anti-patterns\", \"how bad is the tech debt\", \"can we safely migrate this\", \"what's deprecated in here\". This runs in the diagnose phase of the refactor-chain pipeline, after refactor-understand, and its readiness verdict informs which lane/steps refactor-diagnose and the plan phase choose. Read-only and advisory — it grades and gates, it never edits code."
---

# Assess Legacy & Readiness — refactor-chain · diagnose

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** diagnose · **Prerequisite:** refactor-understand · **Next:** feeds refactor-diagnose + plan.
**Adaptivity / conditional:** repo-agnostic; anti-pattern set scales to the detected stack — advisory-only.

## Purpose
Not every codebase is ready for every refactor. This skill reads the code (never
runs or edits it) and grades **modernization readiness**: it detects the
anti-patterns and gaps that determine whether a step is safe and which steps to
run at all — tight coupling and hidden `new`-ing (no seam to test against),
missing or loose types, deprecated / end-of-life APIs and runtimes, dead code, and
the absence of a test safety net. It produces a readiness verdict with gates —
GREEN (go), YELLOW (fix a prerequisite first), RED (blocked until X) — so
`refactor-diagnose` and the plan phase pick a lane and order the code can actually
survive.

## When to use
- After `refactor-understand`, before committing to a modernization plan.
- Someone asks "is this ready to modernize", "what's blocking an upgrade", "find
  the anti-patterns", "how bad is the debt", "can we safely migrate this",
  "what's deprecated".
- Any time a lane's plan assumes a seam/types/current-runtime that may not exist.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm checking how ready this code is to be changed safely — reading only,
  nothing touched."
- "Good news: types are solid and there's a test seam. This is GREEN — safe to
  refactor."
- "One thing to fix first (YELLOW): there are no tests around `orders`, so I'd add
  a small safety net before changing it — otherwise we can't tell if we break
  something."
- "Blocker (RED): the code calls `crypto.createCipher`, which is removed in your
  target Node version. We have to replace that before the upgrade, not after."
- "I found ~5 dead functions nothing calls — low-risk cleanup we can bundle in."
- "Want the full readiness report with every finding, or just the gates?"

## Method
1. Start from the Project Profile + signals
   (`node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs signals --target <dir>`)
   for language, framework, runtime target, and `hasTests`.
2. **Coupling & seams:** find tight coupling / hard-wired construction (direct
   `new`, static singletons, global state) that leaves no injection seam to test
   or swap. Cross-reference `refactor-assessment-map` cycles if present.
3. **Type safety:** detect missing/loose typing — `any`/`@ts-ignore`, untyped
   params, `// @ts-nocheck`, dynamic `dict`/`Object` bags, raw reflection.
4. **Deprecated / EOL APIs & runtimes:** flag deprecated stdlib/framework calls and
   language/runtime versions past support (engines field vs installed, EOL Node/
   Python/Java targets, removed APIs).
5. **Dead code & test seam:** find unreferenced exports/functions; confirm whether a
   real test safety net exists (`hasTests`).
6. **Grade the gates:** each dimension → GREEN / YELLOW (prerequisite) / RED
   (blocker). Roll up to an overall readiness verdict + the ordered prerequisites.
7. Fill `templates/output.md` (the Readiness Report) and hand the verdict + gates to
   `refactor-diagnose` / the plan phase. See `references/method.md` for the full
   anti-pattern catalog and grading rubric.

## Guardrails
- **Read-only. Advisory only.** Never edits, never runs, never installs — static
  detection and grading only.
- A RED gate is a *stop-and-fix-first*, not a veto of the whole job — state the
  single prerequisite that clears it.
- Don't invent deprecations — flag only APIs/runtimes you can tie to a known
  removal/EOL; when unsure, mark "verify against release notes".
- Skip generated/vendored trees (same exclusions as the harness walker).

## Verify
- Plain: "I can give a one-word readiness verdict (GREEN/YELLOW/RED) and name the
  exact thing to fix first if it isn't GREEN."
- Technical: each gate (coupling, types, deprecations, dead-code, test-seam) has a
  grade backed by concrete evidence (file:line or count); the overall verdict and
  ordered prerequisites are consistent with the worst gate.

## Resources
- `references/method.md` — anti-pattern catalog, deprecation/EOL rules, GREEN/YELLOW/RED rubric.
- `examples/before-after.md` — worked example: legacy module → Readiness Report with gates.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the Readiness Report scaffold this skill fills in.

## Chain position
Runs in the **diagnose** phase after `refactor-understand`, alongside
`refactor-assessment-map`. Its readiness verdict + gates tell `refactor-diagnose`
which lane is viable and hand the **plan** phase its prerequisites (e.g. "add a
test seam before extracting", "replace the removed API before the runtime bump").
`refactor-code-principles` + the review gate run near the end of every lane.
