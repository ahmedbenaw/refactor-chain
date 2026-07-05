#!/usr/bin/env node
/**
 * refactor-web-performance — prints this skill's step checklist + Core Web
 * Vitals target thresholds as JSON. Zero dependencies.
 * Part of the refactor-chain DEBUG lane (fix→verify chain, performance case).
 *
 * Usage:
 *   node checklist.mjs           # full checklist + CWV thresholds (JSON)
 *   node checklist.mjs --pretty  # human-readable list
 */

const SKILL = "refactor-web-performance";
const LANE = "debug";
const PHASE = "do-the-work";

const CWV_THRESHOLDS = {
  LCP: { unit: "s", good: 2.5, needsWork: 4.0, note: "Largest Contentful Paint" },
  CLS: { unit: "score", good: 0.1, needsWork: 0.25, note: "Cumulative Layout Shift (unitless)" },
  TBT: { unit: "ms", good: 200, needsWork: 500, note: "Total Blocking Time (lab proxy for INP)" },
  INP: { unit: "ms", good: 200, needsWork: 500, note: "Interaction to Next Paint (field)" },
};

const STEPS = [
  { id: "baseline", title: "Baseline measure", detail: "Trace the target URL under realistic throttling (CPU + Slow 4G + mobile). Prefer a browser/DevTools performance trace or Lighthouse audit; capture LCP (+element), CLS (+shifters), TBT (+longest tasks), waterfall. No browser → static evidence (bundle size, render-blocking tags, unsized images, unpreloaded fonts).", gate: "before-numbers recorded = the oracle" },
  { id: "rank", title: "Rank by impact (one offender)", detail: "Pick the worst metric vs threshold, then the single biggest contributor to it. State it as one claim.", gate: "exactly one offender identified" },
  { id: "diagnose", title: "Diagnose the offender", detail: "Read WHY: render-blocking resource, oversized/late image, layout shift with no reserved space, longest main-thread task, waterfall, slow TTFB.", gate: "root cause of the offender named" },
  { id: "fix", title: "Fix the one lever", detail: "Apply the standard remedy for that offender and nothing else. Keep it behavior-preserving.", gate: "single, minimal, behavior-preserving change" },
  { id: "remeasure", title: "Re-measure & prove", detail: "Re-run the SAME audit under the SAME conditions. Target metric improved toward/past threshold; other two did not regress. If unmoved, revert and take the next offender.", gate: "before/after under identical conditions; no regression" },
];

const argv = process.argv.slice(2);
const pretty = argv.includes("--pretty");

const payload = {
  skill: SKILL,
  lane: LANE,
  phase: PHASE,
  loop: "baseline measure → rank → diagnose → fix one lever → re-measure",
  principle: "Measure a real trace, fix the ONE biggest offender on the worst metric, re-measure identically to prove it.",
  metrics: ["LCP", "CLS", "TBT/INP"],
  thresholds: CWV_THRESHOLDS,
  steps: STEPS,
  honesty: "Trace/Lighthouse numbers are LAB signals under synthetic throttling — directional, not a field guarantee.",
};

if (pretty) {
  console.log(`${SKILL}  [${PHASE}/${LANE}]`);
  console.log(payload.loop + "\n");
  console.log("Core Web Vitals targets:");
  for (const [k, v] of Object.entries(CWV_THRESHOLDS)) {
    console.log(`  ${k}: good ≤ ${v.good}${v.unit === "score" ? "" : v.unit}  (${v.note})`);
  }
  console.log("");
  STEPS.forEach((s, i) => console.log(`${i + 1}. ${s.title}\n   ${s.detail}\n   gate: ${s.gate}`));
  console.log(`\nHonesty: ${payload.honesty}`);
} else {
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
