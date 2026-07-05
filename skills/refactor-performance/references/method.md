# Performance — full method (code-level review of the diff)

This is the static, code-reading performance review of a refactor's diff. It reads the
changed code for cost the refactor introduced or left behind, ranks findings by likely
real-world impact, and hands each a behavior-preserving fix sketch. It is advisory — it
never edits code. SKILL.md is the summary; this is the exhaustive "how".

Absorbs and bakes in the intent of: performance-review (systematic diff-level perf
audit) and the *code-slice* of debug-optimize-lcp (spotting expensive work in code —
without the browser-tracing runtime work, which belongs to `refactor-web-performance`).
No runtime dependency on those skills.

---

## 0. Boundary — what this skill is and is not

- **Is:** a static read of the *diff* for code-level cost (algorithms, queries, wasted
  work, bundle/query weight). Runs at the review gate on a behavior-verified change.
- **Is not:** a live profiler session or a reported-slowdown investigation. A user saying
  "the running app is slow" → debug lane (`refactor-web-performance` for web vitals, or a
  profiler). This skill reviews *what the refactor did to the code*, worst-first.

---

## 1. Scope to the diff

Review the changed and added lines plus their immediate call context (the loop a new
helper sits in, the caller of a changed query). Do not audit the whole codebase.
Pre-existing hotspots may be noted in one line, but the review is about cost the refactor
*introduced or worsened*.

---

## 2. The four cost classes (detection catalog)

### 2a. Algorithmic hotspots
- **Nested iteration over the same/related data** → O(n²) or worse. Look for a loop
  whose body loops again over the collection (`for … for …`, `.find`/`.filter`/
  `.includes` inside a `.map`/`for`).
- **Work moved *into* a loop** by an extraction — a compile of a regex, a sort, an
  object allocation, a config read that used to be hoisted now runs every iteration.
- **Linear scan where a lookup belongs** — repeated `array.find`/`.includes` on a large
  array inside a loop; should be a `Map`/`Set` built once (O(n) → O(1) per lookup).
- **Sort inside a loop**, or re-sorting already-sorted data.
- **Re-deriving a value each iteration** that is invariant across the loop.

### 2b. N+1 / data-access
- **A query/fetch per row/item** — the classic N+1: load a list, then loop and query per
  element. Fix: batch (`WHERE id IN (…)`), join/eager-load, or `Promise.all` a bounded
  batch.
- **Lazy relation accessed in a loop** — an ORM getter that triggers a query each access.
- **Repeated identical fetch** — the same request issued per iteration instead of once
  before the loop.
- **Chatty external calls** — a network round-trip per item where a bulk endpoint exists.

### 2c. Unnecessary / repeated work
- **Recomputation of a stable value** — something computed once now computed on every
  call/render because a hoist or memo was dropped in the refactor.
- **Dropped memoization/caching** — a `useMemo`/`useCallback`/cache the refactor removed,
  causing re-computation or child re-renders.
- **Re-fetching data already in hand** — fetching what a caller already passed.
- **Redundant serialization/parsing** — JSON parse→stringify round-trips, re-parsing the
  same payload, re-reading a file per iteration.
- **Effect over-invalidation** — an effect/dependency array that now re-runs expensive
  work on every change because the refactor widened its inputs.

### 2d. Bundle / query cost
- **Heavy dependency for a trivial need** — pulling a large lib (moment, lodash-whole,
  a date/validation megapackage) for one function; prefer a small/native equivalent.
- **Import that broke tree-shaking** — a namespace/`* as` import or a barrel that now
  drags the whole module in.
- **Over-fetching in SQL** — `SELECT *` where a few columns suffice; a new query pattern
  with no supporting index; N rows fetched to use one.
- **Payload growth** — the refactor now returns/serializes more than the caller needs.

---

## 3. Impact ranking model

Rank each finding by approximate:

```
impact ≈ data-size sensitivity  ×  call frequency  ×  per-item cost
```

- **Data-size sensitivity** — does cost grow with n (list length, row count)? O(n²) and
  N+1 dominate as data grows; a one-time O(n) setup rarely matters.
- **Call frequency** — per-request/per-render/hot-path >> cold-start/once-at-boot.
- **Per-item cost** — a DB/network round-trip per item >> a cheap in-memory op per item.

So: a per-request N+1 on an unbounded list ranks highest; a one-time recompute at module
load ranks lowest. Report worst-first. When two are close, the one on user-facing latency
(request/render path) wins.

---

## 4. Fix recipes (all behavior-preserving)

| Finding | Minimal fix sketch |
|---|---|
| N+1 query | Batch: collect ids, one `WHERE id IN (…)` / join / eager-load; map results back. |
| Linear scan in loop | Build a `Map`/`Set` once before the loop; O(1) lookups inside. |
| Work hoisted into loop by extraction | Move the invariant (regex compile, sort, config read, allocation) back out above the loop. |
| Dropped memo / recompute | Restore `useMemo`/`useCallback`/cache; or compute once and pass down. |
| Repeated fetch | Fetch once before the loop; reuse the result. |
| Redundant serialize/parse | Keep the parsed form; avoid parse→stringify→parse round-trips. |
| Heavy dep for one function | Replace with a small/native equivalent; import the single function, not the barrel. |
| Broken tree-shaking | Named imports from the specific module path. |
| `SELECT *` / over-fetch | Select only needed columns; add the supporting index if the pattern is hot. |

Every fix must keep results, ordering, and side effects identical. A fix is a *separate*
deliberate change that must itself pass `refactor-verify` — this skill only *proposes* it.

---

## 5. Optional runtime confirmation

If a tracing/profiling tool is available and a hotspot's real cost is ambiguous, take one
quick measurement (a timed run, a query count, a bundle-size diff) to confirm before
ranking it high. Cite the evidence. But never gate on tooling — static evidence
(a visible per-row query, an obvious nested loop) stands on its own. Runtime web-vitals
investigation (LCP/CLS/TBT of a live page) is out of scope here; that is
`refactor-web-performance`.

---

## 6. Report — do not edit

Emit findings with `templates/output.md`: for each, `file:line`, cost class, why the
refactor introduced it, rank rationale, and the behavior-preserving fix sketch. Also note
what was checked and found clean (so the gate can say so). Hand the report to
`refactor-review-gate`, which de-dupes and merges it with the security and red-team legs
into one ranked go/no-go. This skill changes no code.
