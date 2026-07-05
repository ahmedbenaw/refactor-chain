#!/usr/bin/env node
/**
 * refactor-red-team — prints this skill's checklist as JSON.
 * Zero-dependency. Phase: review. Prereq: do-the-work diff + green baseline.
 * Adversarially verifies the refactor's "behavior preserved" promise.
 * refactor-review-gate consumes its verdicts (a credible BROKEN = Blocker).
 *
 * Usage:
 *   node scripts/checklist.mjs            # pretty JSON checklist
 *   node scripts/checklist.mjs --ids      # just the step ids, one per line
 */
const CHECKLIST = {
  skill: "refactor-red-team",
  phase: "review",
  prerequisite: "do-the-work diff + green baseline (refactor-safety-net)",
  next: "refactor-review-gate (folds BROKEN claims in as Blockers)",
  editsProductCode: false,
  maddTests: true,
  absorbs: ["pm-execution:red-team-prd"],
  posture: "behavior is broken until I fail to break it — compiles/looks-fine is not proof",
  claimTypes: [
    "rename-resolves", "extraction-equivalent", "order-preserved",
    "error-contract-same", "side-effect-same", "boundary-value-same", "concurrency-same",
  ],
  rank: "impact x likelihood x cheapness-to-test",
  verdicts: ["held", "BROKEN", "unprovable"],
  steps: [
    { id: "diff-baseline", title: "Get the diff vs lane base and confirm the baseline is green", done_when: "diff captured; baseline:true (else flag verdicts as read-only/unproven)" },
    { id: "extract-claims", title: "Extract the load-bearing behavior-preservation claims as falsifiable sentences", done_when: "each claim named with type + file:line" },
    { id: "attack", title: "Attack each claim — assume false, hunt the counterexample (callers, edges, error paths, ordering, string refs)", done_when: "each claim has a counterexample or a 'tried these, held' note" },
    { id: "rank", title: "Rank by impact x likelihood x cheapness-to-test", done_when: "priority score assigned; claims sorted descending" },
    { id: "cheapest-test", title: "For high-priority claims, write the single cheapest test pinning pre-refactor behavior and run it", done_when: "smallest decisive test per claim; run; FAIL=BROKEN(Blocker), PASS=assurance" },
    { id: "report", title: "Report ranked verdicts to templates/output.md and hand to the review gate", done_when: "each claim: attack + verdict + priority + test result; most-dangerous-first; product code untouched" },
  ],
};

if (process.argv.includes("--ids")) {
  process.stdout.write(CHECKLIST.steps.map((s) => s.id).join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(CHECKLIST, null, 2) + "\n");
}
