# Memory Leak Report — `<what leaks / area>`

**Skill:** refactor-code-memory · refactor-chain DEBUG lane (do-the-work) · **Date:** <YYYY-MM-DD>
**Runtime:** <browser (DevTools heap) | Node.js (v8 heap snapshots)>
**Status:** <FIXED (baseline restored) | RETAINER-FOUND (fix pending) | NOT-A-LEAK (churn reclaimed by GC)>

---

## 1. What was reported
> <the user's words — "memory keeps growing", "OOMs after a while", "gets slower over time">

## 2. Repeatable action under test
- **Action:** <e.g. open→close the settings dialog | mount→unmount component | run request>
- **Repetitions (N):** <20–50>
- **Forced GC between snapshots?** <yes — required>

## 3. Baseline vs after (the oracle)
| Measurement | Snapshot A (baseline) | Snapshot B (after N + GC) |
|---|---|---|
| `heapUsed` / RSS | <42 MB> | <61 MB> |
| Dropped after GC? | — | <no — survives GC = leak> |

## 4. Diff — survivors (B − A)
| Object class | # New | Retained size Δ | Proportional to N? |
|---|---|---|---|
| `<Detached HTMLDivElement>` | <+50> | <large> | <yes (+N)> |
| `<EventListener>` | <+50> | <—> | <yes> |

> The tell: survivor count scales with N (double the repetitions → ~double the survivors).

## 5. Retaining path (survivor → GC root)
```
<top survivor>
  ← <reference>
    ← <reference>
      ← <the unexpected retainer>   ← GC root
```
**Origin (the leak):** <the reference that should have been released but wasn't — file:line>

## 6. Fix (the one retainer)
```diff
<the minimal, behavior-preserving change that releases the retainer>
```
- **Leak pattern:** <listeners | timers | detached DOM | unbounded cache | closure | global accumulation | observer | subscription>

## 7. Re-measure (same N + forced GC) — the proof
| Check | Before fix | After fix |
|---|---|---|
| `heapUsed` after N + GC | <61 MB climbing> | <43 MB ≈ baseline> |
| Survivor class (B − A) | <+50> | <+0> |
| Grows with N? | yes | **no** |
| Test suite | green | green |

- [ ] Post-GC heap returns to ~baseline.
- [ ] Former survivor class no longer scales with N.
- [ ] App behavior unchanged; full suite passes.

## 8. Handoff
- **Next in chain:** review gate → docs → ship.
- **Remaining retainers (if any), ranked:** <next-largest retainer to pursue in a future pass>
