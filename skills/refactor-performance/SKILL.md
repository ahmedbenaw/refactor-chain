---
name: refactor-performance
description: "Use this skill to review the refactor's DIFF for code-level performance problems before it ships — reading the changed code (not running a profiler) for algorithmic hotspots (accidental O(n^2), work inside a loop), database N+1 queries, unnecessary or repeated work (recomputation, re-fetching, redundant serialization), and cost added to the bundle or query path. Trigger phrases include \"did this make it slower\", \"check for N+1\", \"performance review of this change\", \"any hotspots in the diff\", \"is this O(n^2) now\", \"did we add a heavy dependency\". This is the performance reviewer in the review/verify phase of the refactor-chain pipeline; refactor-review-gate calls it and folds its findings into the final ranked report. Advisory — it reports ranked findings with file:line and a fix sketch; it never edits code on its own."
---

# Performance — code-level review of the diff — refactor-chain · review/verify

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** review / verify · **Prerequisite:** `refactor-verify` has confirmed behavior is preserved on the diff (review the *correct* change, not a broken one) · **Next:** `refactor-review-gate`, which folds these findings into the single ranked ship report.
**Adaptivity / conditional:** repo-agnostic, advisory-only. Reads the diff statically; if a runtime tracing tool is available it may confirm a hotspot, but it does not depend on one (runtime web-vitals work is `refactor-web-performance`'s job, not this skill's).

## Purpose
A behavior-preserving refactor can still quietly make code *slower* — a helper extraction
that turns one pass into two, a loop that now hits the database per row, a memo that was
dropped, a heavy dependency pulled in for one function. This skill reads the accumulated
diff and flags the code-level performance costs the refactor introduced or left on the
table: algorithmic hotspots, N+1 queries, unnecessary/repeated work, and bundle/query
cost. It ranks findings by likely impact and hands each one a concrete fix sketch. It is
advisory: it reports, it does not edit.

## When to use
- After `refactor-verify` confirms the diff preserves behavior, before/at the review gate.
- The person says: "did this change make anything slower?", "check the diff for N+1",
  "any O(n^2) hotspots?", "did we add a heavy import?", "performance review of this refactor".
- Called by `refactor-review-gate` as the performance leg of the final ship report.
- NOT for diagnosing a *reported* runtime slowdown of a running app — that is the debug
  lane (`refactor-web-performance` for pages, or a profiler session), not this static pass.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm reading just the changed code for anything that quietly got more expensive — I'm not changing anything, only pointing things out, worst-first."
- "Found the biggest one: the new `loadOrders` loop calls the database once per order — with 500 orders that's 500 queries instead of 1. Here's the one-line fix. (finding 1 of 3)"
- "Small one: a value that used to be computed once is now recomputed on every render. Cheap to move back out. Worth it, but not urgent."
- "Good news too — the extraction didn't add any heavy dependency, and the sort is still O(n log n)."
- "That's the ranked list, most impactful first. None of it blocks shipping unless you want it fixed now. Show technical details / the profiler evidence?"

## Method
1. **Scope to the diff.** Review only the changed/added lines (and their immediate call
   context). You are auditing what the refactor *did*, not the whole codebase.
2. **Scan the four cost classes** (full catalog in `references/method.md`):
   - **Algorithmic hotspots** — nested iteration over the same data (O(n²)+), work moved
     *into* a loop, a linear scan where a map/set lookup belongs, sorting inside a loop,
     re-deriving a value each iteration.
   - **N+1 / data-access** — a query or fetch executed per row/item instead of once
     (batch/`IN`/join/`Promise.all`), a lazy relation loaded inside a loop, an ORM call
     hidden behind a getter called repeatedly.
   - **Unnecessary / repeated work** — recomputation of a stable value, re-fetching data
     already in hand, dropped memoization/caching, redundant serialization/parsing,
     re-reading a file per iteration, effect over-invalidation re-running work.
   - **Bundle / query cost** — a heavy dependency pulled in for a trivial need, a
     no-longer-tree-shakeable import, `SELECT *`/over-fetching, an added index-missing
     query pattern.
3. **Rank by likely impact.** Order findings by (data-size sensitivity × call frequency
   × per-item cost). A per-request N+1 outranks a one-time cold-start recompute.
4. **Sketch a fix per finding.** For each: `file:line`, the cost, *why* the refactor
   introduced it, and a concrete minimal fix (batch the query, hoist the invariant,
   restore the memo, swap array scan for a `Set`). Keep fixes behavior-preserving.
5. **Optionally confirm.** If a runtime/tracing tool is available and a hotspot is
   ambiguous, take a quick measurement to confirm before ranking it high — but never gate
   on tooling; static evidence stands on its own.
6. **Report, don't edit.** Emit the ranked findings via `templates/output.md` for
   `refactor-review-gate` to fold in. This skill does not change code.

## Guardrails
- **Advisory only — never edits code.** It produces a ranked findings report; any fix is
  applied later, deliberately, and must itself pass `refactor-verify`.
- **Diff-scoped.** Flag costs the *refactor* introduced or made worse; note pre-existing
  hotspots briefly but don't expand the review into the whole codebase.
- **No micro-optimization theater.** Only flag what plausibly matters at real data sizes
  and call frequencies; do not chase constant-factor noise or premature optimization.
- **Behavior stays frozen.** Every suggested fix must preserve behavior — a perf fix that
  changes results is a different task, clearly labeled, and re-verified.

## Verify (of this skill's own success)
- Plain: "I've listed the ways the change could be slower, worst first, each with a fix — nothing edited."
- Technical: each finding has `file:line`, a cost class, a rank rationale, and a
  behavior-preserving fix sketch; the report is consumable by `refactor-review-gate`;
  any runtime confirmation used is cited.

## Resources
- `references/method.md` — full catalog of the four cost classes, detection patterns, the impact-ranking model, and fix recipes.
- `examples/before-after.md` — an N+1 introduced by an extraction, ranked and fix-sketched.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the ranked performance-findings report scaffold.

## Chain position
Runs in the review/verify phase after `refactor-verify` has confirmed the diff preserves
behavior. It is one of the legs `refactor-review-gate` coordinates (alongside security
and red-team); the gate de-dupes and merges its ranked findings into the single go/no-go
ship report. Advisory throughout — it never edits code.
