# refactor-memory — worked example: recalling a stale note safely

## Setup
A new session opens on `~/projects/storefront`. Boot injects:

> refactor-chain memory: last refactor-chain run: web lane, done; 2 parked scope-drift item(s)
> awaiting attention (verify against the live repo before relying on it).

`sessions.jsonl` (latest line):
```json
{"at":"2026-06-20T18:04:11Z","lastRun":{"lane":"web","outcome":"done","at":"2026-06-20T17:58:02Z"},"flagged":["scope: checkout modal rewrite parked — out of lane","scope: dead CSS in legacy/ parked"]}
```

## Before (what NOT to do — memory treated as truth)

> "Welcome back! Last time we finished the web-lane run and you still have two parked items:
> the checkout modal rewrite and the dead CSS in `legacy/`. Shall I start on the modal rewrite?"

Three faults: it asserts two-week-old notes as current facts, it proposes work from a *parked
scope-drift flag* (the flag meant "explicitly out of lane", not "to-do"), and it never looked at
the repo. If a teammate already deleted `legacy/`, the session opens with a false claim.

## After (memory verified against the live repo first)

1. **Verify the outcome.** Read `.refactor-chain/history.jsonl` — last line confirms
   `{"lane":"web","outcome":"done"}`. ✓ memory matches the record.
2. **Verify parked item 1.** The checkout modal still exists (`src/checkout/Modal.jsx`, unchanged
   since the note). Still parked, still real — and still out of lane unless the human widens scope.
3. **Verify parked item 2.** `legacy/` was deleted three days ago (`git log --oneline -- legacy/`
   shows the removal). The note is stale.

What the session actually says:

> "Picking up where the chain left off here: the last web-lane run finished clean — confirmed in
> the run history, not just from memory. Of the two parked items, one is still real (the checkout
> modal rewrite — parked because it was out of scope, so it stays parked unless you want it), and
> one is already resolved: `legacy/` was deleted since, so the dead-CSS note is closed. Nothing
> is in flight; we can start fresh whenever you like."

## Why this is the pattern
- Every recalled claim got a named live check (history file, source path, git log).
- A stale note was **closed with evidence**, not silently repeated.
- A scope-drift flag was reported as parked — not promoted into work.
- The memory file itself was left untouched; next SessionEnd will capture the new reality.
