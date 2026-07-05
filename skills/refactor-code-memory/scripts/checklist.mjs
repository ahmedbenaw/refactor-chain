#!/usr/bin/env node
/**
 * refactor-code-memory — prints this skill's step checklist + the common
 * leak-pattern catalog as JSON. Zero dependencies.
 * Part of the refactor-chain DEBUG lane (fix→verify chain, memory case).
 *
 * Usage:
 *   node checklist.mjs           # full checklist + leak catalog (JSON)
 *   node checklist.mjs --pretty  # human-readable list
 */

const SKILL = "refactor-code-memory";
const LANE = "debug";
const PHASE = "do-the-work";

const STEPS = [
  { id: "baseline", title: "Define action & baseline", detail: "Pick the exact repeatable action. Warm to steady state, force GC, take snapshot A.", gate: "action is identically repeatable; A captured post-GC" },
  { id: "repeat-snapshot", title: "Repeat & snapshot", detail: "Perform the action N times (20–50), force GC, take snapshot B.", gate: "B captured post-GC after N repetitions" },
  { id: "diff", title: "Diff for survivors", detail: "Compare B vs A. Objects whose count grew ~proportional to N and survived GC are the leak. Rank by retained size.", gate: "survivors identified; growth scales with N" },
  { id: "retaining-path", title: "Follow the retaining path", detail: "For the top retained-size survivor, walk its retainers to a GC root. The last unexpected reference is the origin.", gate: "origin reference (retainer) named" },
  { id: "fix", title: "Fix the retainer", detail: "Match pattern → fix (see catalog). Fix the top retained-size retainer only this round.", gate: "single, behavior-preserving change to one retainer" },
  { id: "prove", title: "Prove it's gone", detail: "Repeat step 2 exactly and re-diff. Post-GC heap returns to ~baseline; survivor class no longer grows with N; suite green.", gate: "no proportional growth after fix; behavior preserved" },
];

const LEAK_CATALOG = [
  { pattern: "Listeners never removed", retainer: "live addEventListener / subscription", fix: "removeEventListener / unsubscribe on teardown or unmount" },
  { pattern: "Timers / intervals", retainer: "setInterval / setTimeout closure", fix: "clearInterval / clearTimeout on cleanup" },
  { pattern: "Detached DOM", retainer: "JS var still referencing a removed node", fix: "null the reference after removal; don't cache nodes" },
  { pattern: "Unbounded cache / Map", retainer: "collection that grows forever", fix: "size cap + LRU eviction, or WeakMap / WeakRef for key-tied lifetime" },
  { pattern: "Closures capturing large scope", retainer: "closure keeps big objects alive", fix: "narrow the closure; capture only what's needed" },
  { pattern: "Global accumulation", retainer: "module-level array/object pushed to, never cleaned", fix: "scope it, or remove entries on teardown" },
  { pattern: "Observers", retainer: "Intersection/Resize/MutationObserver", fix: ".disconnect() on cleanup" },
  { pattern: "Framework subscriptions", retainer: "store/emitter subscription in a component", fix: "return the unsubscribe from the effect / dispose on unmount" },
];

const argv = process.argv.slice(2);
const pretty = argv.includes("--pretty");

const payload = {
  skill: SKILL,
  lane: LANE,
  phase: PHASE,
  loop: "baseline snapshot → repeat N× → snapshot → diff survivors → follow retaining path → fix retainer → re-diff",
  principle: "A leak grows across repeated actions and survives a forced GC. Prove it by diffing snapshots; fix the retainer; re-diff to prove baseline is restored.",
  runtimes: { browser: "DevTools heap snapshots + Comparison view", node: "global.gc() + v8.writeHeapSnapshot(); watch process.memoryUsage().heapUsed" },
  rules: ["No forced GC, no verdict.", "Growth must be proportional to N or it's the wrong suspect.", "Fix one retained-size offender at a time."],
  steps: STEPS,
  leakCatalog: LEAK_CATALOG,
};

if (pretty) {
  console.log(`${SKILL}  [${PHASE}/${LANE}]`);
  console.log(payload.loop + "\n");
  STEPS.forEach((s, i) => console.log(`${i + 1}. ${s.title}\n   ${s.detail}\n   gate: ${s.gate}`));
  console.log("\nCommon leak patterns:");
  LEAK_CATALOG.forEach((c) => console.log(`  • ${c.pattern} — retainer: ${c.retainer}\n      fix: ${c.fix}`));
  console.log("\nRules:");
  payload.rules.forEach((r) => console.log(`  - ${r}`));
} else {
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
