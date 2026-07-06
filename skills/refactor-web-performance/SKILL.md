---
name: refactor-web-performance
description: "Use this skill when a web page or app feels slow to load or janky and the user wants it measured and fixed — plain triggers like \"the page loads slowly\", \"it's laggy\", \"first paint takes forever\", \"improve my Lighthouse score\", \"fix LCP/CLS/TBT\", \"why is the site sluggish\", \"the layout jumps around\". It runs a trace/Lighthouse-style audit of the Core Web Vitals (LCP, CLS, TBT/INP), finds the single biggest offender, fixes it, and re-measures to prove the win. It is the do-the-work step of the refactor-chain DEBUG lane, reached when the harness classifies a case as debug/web-performance. Uses a browser/DevTools tracing tool when one is available; otherwise falls back to static evidence."
---

# Web Performance — Diagnose & Fix Core Web Vitals — refactor-chain · DEBUG lane

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (debug) · **Prerequisite:** diagnose (harness classified the case as `debug`/`web-performance`) · **Next:** review gate → docs → ship.
**Adaptivity / conditional:** web/front-end only. **Prefers a live trace** via a browser/DevTools tool (chrome-devtools performance trace or Lighthouse audit) when one is connected; **falls back** to static/build-artifact evidence (bundle sizes, render-blocking tags, missing image dimensions) when no browser is available.

## Purpose
Turn "the site feels slow" into a measured, ranked, fixed result. This skill audits the page's Core
Web Vitals — **LCP** (Largest Contentful Paint), **CLS** (Cumulative Layout Shift), and **TBT/INP**
(Total Blocking Time / Interaction to Next Paint) — from a real trace, identifies the **single biggest
offender** driving the worst metric, fixes that one thing, and re-runs the same audit to prove the
improvement. It fixes the largest lever first rather than scattering micro-optimizations.

## When to use
- The page is slow to load or paint. Triggers: "loads slowly", "first paint takes forever", "sluggish".
- The UI is janky or shifts. Triggers: "it's laggy", "the layout jumps around", "buttons feel unresponsive".
- The user cites a metric or tool. Triggers: "fix my LCP", "improve Lighthouse score", "high TBT/CLS".
- Not for: a functional bug/crash (use `refactor-whats-wrong`) or memory growth over repeated actions (use `refactor-code-memory`).

## What I'll tell you (plain-language / ADHD-friendly)
- "First I'm going to load your page and time it — I'm just measuring, I won't change anything yet."
- "You are here: step 1 of 2 (find-and-fix, then a quick review gate). Here's the scoreboard: the slow part is the big hero image taking 3.1s to show up. That's the one thing worth fixing."
- "I'm fixing the biggest offender only — the hero image. Everything else stays as-is so we can prove this one change helped."
- "Done. Same test again: the big image now shows in 1.2s instead of 3.1s. That's the win."
- "That change didn't move the number — I reverted it and I'm trying the next-biggest offender (attempt 2 of 3)."
- "Want the technical trace details — the waterfall, the blocking scripts, the exact numbers?"

## Method
Follow `references/method.md`; short form:
1. **Baseline measure.** Load the target URL and capture a trace. Prefer a browser/DevTools tool: run a
   performance trace (with CPU/network throttling for a realistic profile) or a Lighthouse audit. Record
   LCP, CLS, TBT/INP and the LCP element. **No browser available** → gather static evidence (bundle
   sizes, render-blocking `<script>`/`<link>`, images lacking width/height, unpreloaded fonts).
2. **Rank by impact.** Identify the **worst metric** and the **single biggest contributor** to it (the
   LCP element and what delays it; the largest layout-shift source; the longest main-thread task). One
   offender, not a list.
3. **Diagnose the offender.** Read *why*: render-blocking resource, oversized/unoptimized image, late
   font, hydration/long task, missing dimensions causing shift, waterfall dependency.
4. **Fix the one lever.** Apply the standard remedy (preload/prioritize LCP resource, size & compress
   images, reserve space to kill CLS, defer/split/​code-split blocking JS, cache/CDN). Change one thing.
5. **Re-measure & prove.** Run the *same* audit under the *same* conditions. Confirm the target metric
   improved and nothing regressed. Record before/after numbers in the output template.

Use `scripts/checklist.mjs` to print the step checklist and the CWV target thresholds as JSON.

## Guardrails
- **Behavior-preserving.** The page must render and behave identically; only its performance changes.
- **Measure before and after — same conditions.** Same URL, same throttling, same viewport. An
  unmeasured "optimization" is a guess; a comparison under different conditions is invalid.
- **One offender at a time.** Fixing several things at once makes the win unattributable and risks
  regressions. Biggest lever first.
- **Field vs lab.** Trace/Lighthouse numbers are *lab* signals; note them as directional, not a promise
  of every user's field experience.
- **Undo is one step away.** If a fix doesn't move the metric, revert it and try the next offender (max ~3).

## Verify
- Plain: "Same test, run twice — the slow number got clearly better and the page still works the same."
- Technical: re-run the identical trace/Lighthouse audit; the targeted metric crosses toward its "good"
  threshold (LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms / INP ≤ 200ms) or improves materially; other metrics do
  not regress; the LCP element / offender is demonstrably resolved in the new trace.

## Resources
- `references/method.md` — full audit method, CWV thresholds, per-offender remedies, browser-vs-static paths.
- `examples/before-after.md` — a worked LCP fix (3.1s → 1.2s) with the trace reasoning.
- `scripts/checklist.mjs` — zero-dep Node script; prints the checklist + CWV target thresholds as JSON.
- `templates/output.md` — the performance report scaffold (baseline, offender, fix, re-measure).

## Chain position
Reached from the harness `diagnose` step when the case is `debug`/`web-performance`. It is the DEBUG
lane's fix→verify chain (diagnose → reproduce → fix → verify) applied to performance. The debug lane is
a single step (this skill) followed directly by the review gate (`refactor-review-gate`) —
`refactor-code-principles` does **not** run in the debug lane, unlike the refactor lanes. On success the
orchestrator advances to that review gate, then docs and ship.
