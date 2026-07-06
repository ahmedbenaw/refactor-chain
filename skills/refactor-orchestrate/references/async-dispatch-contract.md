# Async dispatch contract

How the Conductor's emit-as-data model turns into real parallelism. The engines never run anything; the host does.

## The rule

The Node engines are synchronous, single-threaded, and deterministic, and they stay that way. There is no `Promise.all`, no `worker_threads`, no `await import(...)` fan-out anywhere in `conductor.mjs`, `review-loop.mjs`, `skill-registry.mjs`, `spec-kit.mjs`, or `lanes.mjs` (asserted by `tests/async-hooks.test.mjs`). 100% of concurrency is host-side.

## The emitted shape

`conduct` returns, among other fields:

```json
{
  "dispatch": {
    "parallel":   ["lens:architecture", "lens:correctness", "lens:security", "/tech-debt", "/code-review"],
    "sequential": ["refactor-code-principles", "refactor-review-gate"]
  },
  "fastPath": false
}
```

- **`parallel[]`** — independent work with no ordering dependency: the review lenses (`lens:<id>`) and the resolved external skills. The host runs these concurrently.
- **`sequential[]`** — true dependencies: the lane chain, ending at the gate. The host runs these in order.

## What the host must do

1. Run every `parallel[]` item concurrently. On Claude Code: one `Agent` call each, in a single message. On Codex (no parallel subagents): run them one after another — same result, more wall-clock.
2. Run `sequential[]` in order; do not start step N+1 before step N verifies.
3. For the review loop, record each finished lens with `review-loop-record` (writes that lens's own file — safe to call concurrently for different lenses). Never run two records for the **same** lens concurrently.
4. Aggregate only after the record barrier (`review-loop-aggregate`). The `--final` verdict is refused until the floor is met.

## Failure and resumption

- If a background Agent hangs or dies, its per-lens file is simply absent; `board-status` / `review-loop-status` show it pending. Re-dispatch just that lens; nothing else is lost (the other lenses wrote their own files).
- Loop state (`board.json.reviewLoop`: seen ledger, dry-rounds, ceiling) and the per-lens files persist under `.refactor-chain/`, so a compaction resumes from `review-loop-status`.
- `board.json` is written only at round start and after the record barrier, both single-writer, so a crash mid-record never corrupts the round.

## Why this is safe

Atomic write (temp + rename) prevents a torn file but not a lost update. The per-lens-file design removes the shared mutable object entirely from the concurrent path, so there is no read-modify-write race to lose. This is the durability fix proven by `tests/board-concurrency.test.mjs` (two concurrent records, no lost lens).
