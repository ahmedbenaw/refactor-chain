# Web Performance Report — `<page / URL>`

**Skill:** refactor-web-performance · refactor-chain DEBUG lane (do-the-work) · **Date:** <YYYY-MM-DD>
**Status:** <FIXED (win proven) | NO-MOVEMENT (reverted, next offender) | STATIC-ONLY (no browser, inferred)>

---

## 1. What was reported
> <the user's words — "slow", "laggy", "jumps around", a metric, a Lighthouse score>

## 2. Measurement conditions (must match before AND after)
- **URL:** `<url>`
- **Tool:** <DevTools performance trace | Lighthouse audit | static/build evidence (fallback)>
- **Throttle:** <CPU 4× · Slow 4G · mobile viewport · cold cache>

## 3. Baseline (the oracle)
| Metric | Value | Good threshold | Verdict |
|---|---|---|---|
| **LCP** | <x.xs> | ≤ 2.5s | <✅/❌> |
| **CLS** | <x.xx> | ≤ 0.1 | <✅/❌> |
| **TBT** | <xxx ms> | ≤ 200ms | <✅/❌> |

- **Worst metric:** <LCP | CLS | TBT>
- **LCP element:** `<selector / node>`

## 4. The single biggest offender
> <one sentence: e.g. "LCP is 3.1s; the offender is the hero `<img>` — unsized, uncompressed, not preloaded.">

**Why it's slow:** <render-blocking | oversized bytes | late discovery | no reserved space | longest task | waterfall | slow TTFB>

## 5. Fix (one lever only)
```diff
<the minimal, behavior-preserving change to the single offender>
```
- **What stayed untouched (and why):** <the metrics already in the green — left alone to keep the win attributable>

## 6. Re-measure (same conditions) — the proof
| Metric | Before | After | Verdict |
|---|---|---|---|
| **LCP** | <x.xs> | <x.xs> | <✅ target hit / improved> |
| CLS | <x.xx> | <x.xx> | <✅ no regression> |
| TBT | <xxx ms> | <xxx ms> | <✅ no regression> |

- [ ] Targeted metric improved toward/past threshold.
- [ ] Other two metrics did **not** regress.
- [ ] Page renders and behaves identically.

## 7. Honesty note
Lab numbers under synthetic throttling — **directional, not a field guarantee**. Confirm with field data
(CrUX / RUM) where available: <link / status>.

## 8. Handoff
- **Next in chain:** review gate → docs → ship.
- **Remaining offenders (if any), ranked:** <next thing to tackle in a future pass>
