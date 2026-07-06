# Method — Diagnose & Fix Web Performance (Core Web Vitals)

The discipline: **measure a real trace, find the ONE biggest offender on the worst metric, fix that one
lever, re-measure under identical conditions to prove it.** Scattering micro-optimizations without a
before/after trace is guessing.

---

## The three metrics you optimize (and their "good" thresholds)

| Metric | What it measures | Good | Needs work | Poor |
|---|---|---|---|---|
| **LCP** — Largest Contentful Paint | time until the biggest above-the-fold element renders | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **CLS** — Cumulative Layout Shift | how much visible content jumps around (unitless) | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| **TBT / INP** — Total Blocking Time / Interaction to Next Paint | main-thread blocking / responsiveness | TBT ≤ 200ms · INP ≤ 200ms | ≤ 500ms | higher |

TBT is the lab proxy you measure in a trace; INP is its field-metric successor. Optimize TBT in the lab
to move INP in the field.

---

## Phase 1 — Baseline measure (never skip; this is the oracle)

### Preferred path — live trace via a browser/DevTools tool
If a chrome-devtools / Lighthouse-style tool is connected:
1. **Set realistic conditions.** Emulate CPU throttling (e.g. 4×) and a slow network profile (e.g. Slow
   4G) and a mobile viewport — most CWV problems only appear under throttling.
2. **Record a performance trace** of a cold load (clear cache) OR run a **Lighthouse audit**. Capture:
   - LCP value **and the LCP element** (which DOM node is "largest").
   - CLS value **and the shifting elements**.
   - TBT and the **longest main-thread tasks** (scripting, layout, hydration).
   - The network **waterfall** — render-blocking resources, request chains, byte weights.
3. Save the raw numbers; they are your before/after oracle.

### Fallback path — static evidence (no browser available)
Infer the likely offenders from the code/build:
- **Bundle size:** large JS bundles / no code-splitting → high TBT.
- **Render-blocking:** synchronous `<script>` in `<head>`, blocking `<link rel=stylesheet>`, no `defer`/`async`.
- **Images:** no `width`/`height` (→ CLS), no `loading`/`fetchpriority`, oversized/uncompressed, no modern format.
- **Fonts:** no `preload`, no `font-display: swap` (→ LCP/CLS text flash).
- **Waterfalls:** imports that chain (A must load before B before C).
Label these as *inferred* and confirm with a trace when a browser becomes available.

## Phase 2 — Rank by impact (one offender)

1. Pick the **worst metric** vs its threshold.
2. Find the **single biggest contributor** to that metric:
   - LCP → what delays the LCP element? (late resource, blocking CSS/JS, slow TTFB, large image bytes)
   - CLS → which element shifts, and why? (image/ad/iframe with no reserved space, late-injected banner, web font swap)
   - TBT → the **longest task** on the main thread (parse/compile, hydration, a heavy synchronous loop).
3. State it as one claim: *"LCP is 3.1s; the offender is the hero `<img>` — unsized, uncompressed, not preloaded."*

## Phase 3 — Diagnose the offender

Read *why* the offender is slow before touching it. Common causes → the lever that fixes them:

| Offender | Root cause | Fix (the lever) |
|---|---|---|
| Slow LCP image | large bytes / late discovery | compress + modern format, correct dimensions, `fetchpriority="high"`, `<link rel=preload>` |
| Render-blocking CSS/JS | synchronous in critical path | inline critical CSS, `defer`/`async`, code-split, move below the fold |
| Layout shift (CLS) | no reserved space | set explicit `width`/`height` / `aspect-ratio`; reserve slots for ads/embeds; `font-display: optional/swap` |
| Long main-thread task (TBT) | heavy JS / hydration | code-split & lazy-load, break up long tasks, defer non-critical work, memoize |
| Waterfall | serial request chain | preconnect/preload, parallelize, inline small critical resources |
| Slow TTFB | server/edge | cache, CDN, edge render, reduce blocking server work |

## Phase 4 — Fix the one lever

Apply the standard remedy for the diagnosed offender **and nothing else this round**. Keep the change
minimal and behavior-preserving — the page must render and behave identically; only its timing changes.

## Phase 5 — Re-measure & prove

1. Re-run the **same** audit under the **same** conditions (same URL, throttle, viewport, cold cache).
2. Confirm the **targeted metric improved** toward/past its threshold.
3. Confirm **no regression** in the other two metrics.
4. Record before → after in the output template. If the number didn't move, **revert** and take the
   next-biggest offender (max ~3 attempts before escalating with the trace data).

---

## Notes & honesty rules
- **Lab ≠ field.** Trace/Lighthouse numbers are lab signals under synthetic throttling. Report them as
  directional; real users' field CWV can differ. Say so.
- **Same conditions or it doesn't count.** A "faster" number measured without the original throttling is
  not a win.
- **One at a time.** Batching fixes hides which one helped and multiplies regression risk.
