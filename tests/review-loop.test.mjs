#!/usr/bin/env node
// review-loop controller: seen-ledger dedup, dry predicate, depth auto-scale, >=3 floor + budget,
// scope-mode re-absorb, SPEC/sprint-plan shaper (C3). Pure lib — no board coupling here.
import {
  FLOOR, CEILING, isReviewClass, depthFor, dedupVsSeen, isDryRound,
  shouldContinue, absorb, shapeArtifacts,
} from "../scripts/lib/review-loop.mjs";

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- review-class + depth ----
t("review-class by flag", isReviewClass({ reviewClass: true }) && isReviewClass({ kind: "audit" }), null);
t("non-review-class default", !isReviewClass({}) && !isReviewClass(null), null);
t("depthFor non-review → 1 (fast path)", depthFor({}) === 1, depthFor({}));
t("depthFor small review → floor", depthFor({ reviewClass: true, loc: 100 }) === FLOOR, depthFor({ reviewClass: true, loc: 100 }));
t("depthFor huge review → ceiling", depthFor({ reviewClass: true, loc: 9000 }) === CEILING, depthFor({ reviewClass: true, loc: 9000 }));

// ---- dedupVsSeen: fresh excludes already-seen AND REFUTED ----
const f1 = { where: "a.mjs:1", cause: "off by one", severity: "blocker", confidence: 0.9 };
const f2 = { where: "b.mjs:2", cause: "leak", severity: "worth-fixing", confidence: 0.8 };
const r1 = dedupVsSeen([f1, f2], new Set());
t("first round: both fresh", r1.fresh.length === 2, r1.fresh);
const r2 = dedupVsSeen([f1, { ...f2, cause: "brand new" }], r1.seen);
t("second round: only the new one is fresh", r2.fresh.length === 1 && r2.fresh[0].cause === "brand new", r2.fresh);
const refuted = dedupVsSeen([{ where: "c:3", cause: "nope", verdict: "REFUTED" }], new Set());
t("REFUTED dropped from fresh", refuted.fresh.length === 0, refuted.fresh);

// ---- dry predicate ----
t("a round adding nothing new is dry", isDryRound([f1], r1.seen) === true, null);
t("a round adding something new is NOT dry", isDryRound([{ where: "z:9", cause: "fresh" }], r1.seen) === false, null);

// ---- shouldContinue: >=3 floor, then 2-dry-stop, then ceiling ----
t("continues below the floor even if dry", shouldContinue({ rounds: 1, dryRounds: 1 }) === true, null);
t("continues at floor if not yet 2 dry", shouldContinue({ rounds: 3, dryRounds: 1 }) === true, null);
t("stops at floor after 2 dry rounds", shouldContinue({ rounds: 3, dryRounds: 2 }) === false, null);
t("stops at the ceiling regardless", shouldContinue({ rounds: CEILING, dryRounds: 0 }) === false, null);
t("fast-path: exactly one pass", shouldContinue({ rounds: 0, reviewClass: false }) === true && shouldContinue({ rounds: 1, reviewClass: false }) === false, null);

// ---- scope-mode re-absorb ----
const cur = [f1];
const dropped = [f2];
t("scope full folds dropped back in", absorb(cur, dropped, "full").length === 2, absorb(cur, dropped, "full"));
t("scope focused keeps only current", absorb(cur, dropped, "focused").length === 1, absorb(cur, dropped, "focused"));

// ---- SPEC + sprint-plan shaper ----
const ledger = { decision: "fix-these-first", blockers: 1, total: 2, list: [f1, f2], appendix: [] };
const art = shapeArtifacts(ledger, { title: "v4.7.0 dogfood" });
t("shaper emits a SPEC with the finding", /off by one/.test(art.spec) && /# SPEC/.test(art.spec), art.spec.slice(0, 80));
t("shaper emits a sprint plan with a task row", /Sprint plan/.test(art.sprintPlan) && /a.mjs:1/.test(art.sprintPlan), art.sprintPlan.slice(0, 80));
t("shaper is deterministic", JSON.stringify(shapeArtifacts(ledger, { title: "x" })) === JSON.stringify(shapeArtifacts(ledger, { title: "x" })), null);

console.log(`\n${fail === 0 ? "✅" : "❌"} review-loop: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
