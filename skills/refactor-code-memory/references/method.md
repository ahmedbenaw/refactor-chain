# Method — Diagnose & Fix Memory Leaks (heap-snapshot diffing)

The discipline: **a leak is memory that grows across repeated identical actions and survives a forced
GC. Prove it by diffing before/after heap snapshots, rank survivors by retained size, follow the
retaining path to the reference that pins them, fix that reference, and re-diff to prove the growth is
gone.** "Probably a listener somewhere" is a guess; a snapshot diff is evidence.

---

## Key concepts (read before capturing)

- **Shallow size:** memory held by the object itself.
- **Retained size:** memory that would be freed if this object were freed — i.e. everything only this
  object keeps alive. **Rank offenders by retained size**, not count alone; the object with the biggest
  retained size unlocks the most memory.
- **Retaining path / retainers:** the chain of references from a GC root down to the object. As long as
  one path to a root exists, the object cannot be collected. The **leak is the unexpected link** in that
  path (a global array, a live listener, a closure, a cache).
- **A leak survives GC.** Normal allocation churn is reclaimed by garbage collection. Only compare
  snapshots **after forcing a GC** — otherwise you'll "fix" ordinary temporary allocations.

## Phase 1 — Define the repeatable action & baseline

1. Pick the **exact** action suspected of leaking: open→close a dialog, mount→unmount a component, run a
   request, navigate to a route and back. It must be repeatable identically.
2. Warm up to a **steady state** (do the action once or twice so lazy init/caches settle).
3. Force a GC, then take **snapshot A** (baseline). This is your oracle's starting point.

## Phase 2 — Repeat & snapshot

1. Perform the action **N times** — enough that a leak becomes obvious (20–50 is typical).
2. **Force a GC** (DevTools "collect garbage" 🗑, or Node `global.gc()` under `--expose-gc`).
3. Take **snapshot B**.

## Phase 3 — Diff for survivors

### Browser (DevTools heap)
Use the **Comparison** view (B vs A). Sort by "# New" / "Size Delta". Look for object classes whose
**count grew by ~N** (proportional to your repetitions) and were not freed — classic culprits:
`Detached HTMLElement` / detached DOM trees, `EventListener`, `Array`, closures, framework component
instances that should have unmounted.

### Node.js
Write two snapshots and diff them:
```js
// run node --expose-gc app.js, or use v8.writeHeapSnapshot()
import v8 from 'node:v8';
global.gc(); v8.writeHeapSnapshot('a.heapsnapshot');
for (let i = 0; i < 50; i++) doSuspectAction();
global.gc(); v8.writeHeapSnapshot('b.heapsnapshot');
```
Load both in Chrome DevTools (Memory panel → Load) and use Comparison, or diff programmatically. Watch
RSS with `process.memoryUsage().heapUsed` across iterations — a rising, non-plateauing line = leak.

**The tell:** growth is **proportional to N**. Double the repetitions → roughly double the survivors.
If it doesn't scale with N, you have the wrong suspect — go back to Phase 1.

## Phase 4 — Follow the retaining path

1. Take the top survivor by **retained size**.
2. Open its **Retainers** and walk the chain up toward a GC root.
3. Find the **last unexpected reference** — the one that has no business still pointing at this object:
   a module-level array still holding it, an event target still subscribed, a `setInterval` closure, a
   `Map`/cache with no eviction, a detached node still referenced by a live variable.
That reference is the leak's origin.

## Phase 5 — Fix the retainer

Match the pattern to the fix (catalog):

| Leak pattern | Retainer | Fix |
|---|---|---|
| Listeners never removed | live `addEventListener` / subscription | `removeEventListener` / unsubscribe on teardown/unmount |
| Timers/intervals | `setInterval`/`setTimeout` closure | `clearInterval`/`clearTimeout` on cleanup |
| Detached DOM | JS var still referencing removed node | null the reference after removal; don't cache nodes |
| Unbounded cache/Map | grows forever | size cap + eviction (LRU), or `WeakMap`/`WeakRef` for key-tied lifetime |
| Closures capturing large scope | closure keeps big objects alive | narrow the closure; capture only what's needed |
| Global accumulation | module-level array/object pushed to, never cleaned | scope it, or remove entries on teardown |
| Observers | `IntersectionObserver`/`ResizeObserver`/`MutationObserver` | `.disconnect()` on cleanup |
| Framework subscriptions | store/emitter subscription in a component | return the unsubscribe from the effect / dispose on unmount |

Fix the **top retained-size retainer only** this round.

## Phase 6 — Prove it's gone

Repeat Phase 2 **exactly** (same N, forced GC) and re-diff:
- Post-GC heap returns to **~baseline** (snapshot ≈ A).
- The former survivor class **no longer grows proportionally to N**.
- Retained size of the former offender is stable across repetitions.
- The full existing test suite still passes (behavior preserved).

If growth persists, **revert** the change and follow the next-biggest retainer (max ~3 attempts before
escalating with the snapshot evidence).

---

## Honesty rules
- **No forced GC, no verdict.** Never call something a leak from pre-GC numbers.
- **Proportional or it's not the leak.** The survivor count must scale with repetitions.
- **One retainer at a time** keeps the win attributable and avoids regressions.
