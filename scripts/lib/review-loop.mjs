#!/usr/bin/env node
/**
 * refactor-chain — the review-loop controller. A THIN controller over the existing review board
 * (board.mjs rounds + panel-aggregate). It adds only what the board lacks: a cross-round SEEN
 * ledger, a DRY predicate, depth auto-scaling, the >=3-pass floor (review-class only), a budget
 * ceiling, scope-mode re-absorb, and the findings→SPEC+sprint-plan shaper. Finders / adversarial
 * refute / dedupe / rank / decide remain the board's job — this never re-implements them.
 *
 * Zero deps, synchronous, deterministic. dedup reuses panel-aggregate.dedupeFindings so there is
 * ONE definition of "the same finding" that cannot drift.
 */
import { dedupeFindings } from "./panel-aggregate.mjs";

export const FLOOR = 3;      // >=3 passes for a review-class target (the user's mandate)
export const CEILING = 6;    // budget cap, in rounds
export const DRY_TARGET = 2; // stop after this many consecutive dry rounds (past the floor)

// The seen-ledger key mirrors panel-aggregate's dedupeKey (where | normalized cause) so a finding
// seen in round N is recognized as the same finding in round N+1.
function keyOf(f) {
  return `${String(f.where || "?").trim()}|${String(f.cause || f.summary || "").toLowerCase().replace(/\s+/g, " ").trim()}`;
}

/** A target is review-class (earns the >=3-pass floor) when it says so, or is a review/audit run. */
export function isReviewClass(target) {
  if (!target || typeof target !== "object") return false;
  return !!target.reviewClass || target.kind === "review" || target.kind === "audit";
}

/**
 * The max-round ceiling for a target. Non-review-class / trivial → 1 (the fast path, no >=3 loop).
 * Review-class scales by size, bounded to [FLOOR, CEILING]. Deterministic, no clock/size probe here.
 */
export function depthFor(target) {
  if (!isReviewClass(target)) return 1;
  const size = (target && (Number(target.loc) || Number(target.files))) || 0;
  const scaled = size > 2000 ? CEILING : size > 500 ? 4 : FLOOR;
  return Math.min(CEILING, Math.max(FLOOR, scaled));
}

/**
 * Dedup a round's findings against the cross-round seen ledger. Drops REFUTED (the adversary won)
 * and anything already seen; returns the FRESH findings + the updated seen set. `seen` may be a Set
 * or an array of keys; the return `seen` is always a Set.
 */
export function dedupVsSeen(newFindings, seen) {
  const set = seen instanceof Set ? new Set(seen) : new Set(Array.isArray(seen) ? seen : []);
  const fresh = [];
  for (const f of dedupeFindings(newFindings || [])) {
    if (String(f.verdict || "").toUpperCase() === "REFUTED") continue;
    const k = keyOf(f);
    if (set.has(k)) continue;
    set.add(k);
    fresh.push(f);
  }
  return { fresh, seen: set };
}

/** A round is DRY when it adds zero fresh (non-REFUTED, not-already-seen) findings. */
export function isDryRound(newFindings, seen) {
  return dedupVsSeen(newFindings, seen).fresh.length === 0;
}

/**
 * Should the loop run another round? For a review-class target: keep going until the >=3 floor is
 * met, then stop at 2 dry rounds or the budget ceiling. For a non-review-class (fast-path) target:
 * exactly one pass.
 */
export function shouldContinue({ rounds = 0, dryRounds = 0, ceiling = CEILING, floor = FLOOR, reviewClass = true } = {}) {
  if (!reviewClass) return rounds < 1;
  if (rounds < floor) return true;
  if (rounds >= ceiling) return false;
  return dryRounds < DRY_TARGET;
}

/** Scope mode: "full" folds prior-deferred (dropped) findings back into the current set. */
export function absorb(current, dropped, scope = "full") {
  if (scope !== "full") return dedupeFindings(current || []);
  return dedupeFindings([...(current || []), ...(dropped || [])]);
}

// ── findings → SPEC + sprint-plan shaper (the write-spec / sprint-plan artifacts) ───────────────
export function shapeSpec(ledger, meta = {}) {
  const list = (ledger && ledger.list) || [];
  const rows = list.map((f, i) => `| ${i + 1} | ${f.severity} | ${f.where} | ${f.cause} | ${f.fix || ""} |`).join("\n");
  return [
    `# SPEC — ${meta.title || "review findings"}`,
    "",
    `Decision: **${(ledger && ledger.decision) || "n/a"}** · blockers: ${(ledger && ledger.blockers) || 0} · total: ${(ledger && ledger.total) || 0}`,
    "",
    "## Findings",
    "| # | severity | where | cause | fix |",
    "|---|---|---|---|---|",
    rows || "| — | — | — | (clean) | — |",
    "",
  ].join("\n");
}
export function shapeSprintPlan(ledger, meta = {}) {
  const tasks = ((ledger && ledger.list) || []).filter((f) => f.severity !== "optional")
    .map((f, i) => `| S${i + 1} | ${f.where} | ${f.cause} | ${f.fix || ""} | ${f.severity} |`).join("\n");
  return [
    `# Sprint plan — ${meta.title || "remediation"}`,
    "",
    "| # | where | issue | fix | severity |",
    "|---|---|---|---|---|",
    tasks || "| — | — | (nothing to schedule) | — | — |",
    "",
  ].join("\n");
}
export function shapeArtifacts(ledger, meta = {}) {
  return { spec: shapeSpec(ledger, meta), sprintPlan: shapeSprintPlan(ledger, meta) };
}

// ---- CLI (space-safe main check) ----
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const write = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
  const cmd = argv[0];
  if (cmd === "depth") {
    write({ ceiling: depthFor({ reviewClass: true, loc: Number(opt("loc", "0")) }), floor: FLOOR });
  } else if (cmd === "continue") {
    write({ continue: shouldContinue({ rounds: Number(opt("rounds", "0")), dryRounds: Number(opt("dry", "0")) }) });
  } else {
    write({ usage: "depth --loc N | continue --rounds N --dry N", floor: FLOOR, ceiling: CEILING });
    process.exit(cmd ? 2 : 0);
  }
}
