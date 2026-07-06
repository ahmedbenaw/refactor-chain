# Worked Example — LCP 3.1s → 1.2s (fix the biggest offender, prove it)

The point: measure a real trace, fix the **one** thing driving the worst metric, re-measure identically.

---

## The report

> "The landing page feels really slow to load on mobile."

## Phase 1 — Baseline measure (trace under throttling)

Loaded the page cold with 4× CPU throttle + Slow 4G + mobile viewport (via a DevTools performance
trace). Scoreboard:

| Metric | Value | Threshold | Verdict |
|---|---|---|---|
| **LCP** | **3.1s** | ≤ 2.5s | ❌ Poor — worst metric |
| CLS | 0.04 | ≤ 0.1 | ✅ Good |
| TBT | 180ms | ≤ 200ms | ✅ OK |

**LCP element:** the hero `<img src="hero.png">` (2400×1600, PNG, 1.8 MB), discovered late in the
waterfall and not preloaded. That single image *is* the LCP.

## Phase 2 — Rank by impact (one offender)

Worst metric = LCP. Single biggest contributor = the hero image:
- 1.8 MB PNG over Slow 4G dominates download time.
- It's referenced deep in the DOM, so the browser discovers it late.
- No `fetchpriority`, no `preload` → it queues behind other requests.

CLS and TBT are already fine — leave them alone.

## Phase 3 — Diagnose

The image is (a) too many bytes, (b) discovered late, (c) not prioritized. Three properties of the same
one offender → one coordinated fix on that resource.

## Phase 4 — Fix the one lever

```diff
  <!-- in <head> -->
+ <link rel="preload" as="image" href="/hero.avif" fetchpriority="high">
  ...
- <img src="hero.png" alt="…">
+ <img src="/hero.avif" width="1200" height="800" fetchpriority="high" alt="…">
```

- Re-encoded `hero.png` (1.8 MB) → `hero.avif` (210 KB) at the actual display size.
- Preloaded it so the browser fetches it immediately.
- Added explicit `width`/`height` (keeps CLS safe — no reflow).

Nothing else changed this round.

## Phase 5 — Re-measure & prove (same conditions)

Same trace, same 4× CPU / Slow 4G / mobile:

| Metric | Before | After | Verdict |
|---|---|---|---|
| **LCP** | 3.1s | **1.2s** | ✅ Good — target hit |
| CLS | 0.04 | 0.04 | ✅ no regression |
| TBT | 180ms | 175ms | ✅ no regression |

The hero image now renders in 1.2s; LCP crosses under 2.5s; the other two metrics did not regress. Win
is attributable to exactly one change.

## Why this is the right approach

We did **not** also lazy-load scripts, tree-shake the bundle, or tweak fonts in the same pass — TBT and
CLS were already good, so those would have added regression risk for no measured benefit. One trace, one
offender, one fix, one re-measure. If the AVIF swap hadn't moved LCP, we'd revert and take the next
contributor (e.g. TTFB or a render-blocking stylesheet).

**Honesty note:** these are *lab* numbers under synthetic throttling — directional, not a guarantee of
every user's field LCP. Confirm with field data (CrUX/RUM) where available.
