#!/usr/bin/env node
/**
 * refactor-improve — checklist + history analyzer (self-improvement). Zero deps.
 *   node checklist.mjs                -> prints the step checklist as JSON
 *   node checklist.mjs --history <dir> -> parses .refactor-chain/history.jsonl and surfaces
 *                                         recurring patterns + a one-improvement candidate.
 *
 * History line schema (written by orchestrate.mjs reset -> diagnose.mjs learn):
 *   { lane, case, mode, confidence, clarified, steps:[{skill,attempts,healed,status}], outcome, at }
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILL = "refactor-improve";
const PHASE = "improve";

const STEPS = [
  { id: 1, step: "read-history", detail: "Load .refactor-chain/history.jsonl (append-only retros the harness writes on reset)." },
  { id: 2, step: "confirm-recorded", detail: "Ensure this run's retro is appended; record it first if reset hasn't run." },
  { id: 3, step: "find-patterns", detail: "Steps repeatedly needing >1 attempt / self-heal; often-clarified lanes; recurring fail reasons; clean streaks." },
  { id: 4, step: "pick-one", detail: "Rank by leverage (frequency x cheapness); propose EXACTLY ONE improvement." },
  { id: 5, step: "strengthen-prior", detail: "Confirm harness historyPrior will read updated history; note /update if it's a chain/config change." },
  { id: 6, step: "report", detail: "Fill templates/output.md into a Self-improvement Retro: patterns + the one improvement + confidence picture." },
];

function analyze(dir) {
  const hf = join(dir, ".refactor-chain", "history.jsonl");
  if (!existsSync(hf)) return { runs: 0, note: "no history yet — not enough for a pattern" };
  const runs = readFileSync(hf, "utf8").trim().split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  if (runs.length < 2) return { runs: runs.length, note: "only one run — record more before over-fitting a pattern", lastOutcome: runs[0]?.outcome || null };

  const stepStats = {};   // skill -> { seen, multiAttempt, healed }
  const laneStats = {};   // lane  -> { runs, done, clarified }
  for (const r of runs) {
    const L = (laneStats[r.lane] ||= { runs: 0, done: 0, clarified: 0 });
    L.runs++; if (r.outcome === "done") L.done++; if (r.clarified) L.clarified++;
    for (const s of r.steps || []) {
      const S = (stepStats[s.skill] ||= { seen: 0, multiAttempt: 0, healed: 0 });
      S.seen++; if ((s.attempts || 1) > 1) S.multiAttempt++; if (s.healed) S.healed++;
    }
  }

  // recurring trouble steps: needed >1 attempt in a majority of appearances (min 2)
  const troubleSteps = Object.entries(stepStats)
    .filter(([, v]) => v.seen >= 2 && v.multiAttempt >= 2 && v.multiAttempt / v.seen >= 0.5)
    .map(([skill, v]) => ({ skill, multiAttempt: v.multiAttempt, seen: v.seen, rate: +(v.multiAttempt / v.seen).toFixed(2) }))
    .sort((a, b) => b.multiAttempt - a.multiAttempt);

  // lanes with a clean streak -> trust more; lanes often clarified -> diagnosis friction
  const cleanLanes = Object.entries(laneStats).filter(([, v]) => v.runs >= 3 && v.done === v.runs).map(([lane, v]) => ({ lane, runs: v.runs }));
  const frictionLanes = Object.entries(laneStats).filter(([, v]) => v.runs >= 2 && v.clarified / v.runs >= 0.5).map(([lane, v]) => ({ lane, clarified: v.clarified, runs: v.runs }));

  // one-improvement candidate = the single highest-frequency trouble step, else a friction lane
  const candidate = troubleSteps[0]
    ? { kind: "pre-step-safety", target: troubleSteps[0].skill, why: `needed >1 attempt in ${troubleSteps[0].multiAttempt}/${troubleSteps[0].seen} runs`, suggestion: `Add a characterization test / checkpoint before ${troubleSteps[0].skill} so it stops drifting here.` }
    : frictionLanes[0]
      ? { kind: "diagnosis", target: frictionLanes[0].lane, why: `clarified in ${frictionLanes[0].clarified}/${frictionLanes[0].runs} runs`, suggestion: `Add a repo signal so the ${frictionLanes[0].lane} lane is auto-detected without a clarify.` }
      : { kind: "none", suggestion: "No recurring pain point — the chain is running clean here." };

  return { runs: runs.length, troubleSteps, cleanLanes, frictionLanes, oneImprovement: candidate };
}

const argv = process.argv.slice(2);
const hi = argv.indexOf("--history");
if (hi >= 0) {
  process.stdout.write(JSON.stringify({ skill: SKILL, ...analyze(argv[hi + 1] || process.cwd()) }, null, 2) + "\n");
} else {
  process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, steps: STEPS }, null, 2) + "\n");
}
