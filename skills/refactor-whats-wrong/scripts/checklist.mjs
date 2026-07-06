#!/usr/bin/env node
/**
 * refactor-whats-wrong — prints this skill's step checklist as JSON.
 * Zero dependencies. Part of the refactor-chain DEBUG lane (fix→verify chain).
 *
 * Usage:
 *   node checklist.mjs            # full checklist (JSON)
 *   node checklist.mjs --airflow  # include conditional Airflow DAG tactics
 *   node checklist.mjs --pretty   # human-readable list
 *
 * The orchestrator (~/.claude/skills/refactor-chain/scripts/orchestrate.mjs)
 * consumes the JSON; --pretty is for a person / to-do view.
 */

const SKILL = "refactor-whats-wrong";
const LANE = "debug";
const PHASE = "do-the-work";

const STEPS = [
  { id: "reproduce", title: "Reproduce", detail: "Get a deterministic repro (steps/command/failing test). Capture exact error + stack. Kill any flake by pinning the hidden variable. No repro, no debugging.", gate: "repro is 100% reliable and becomes the oracle" },
  { id: "observe-bound", title: "Observe & bound", detail: "Read stack top-to-bottom with real values. Mark last-known-good and first-observed-bad; the cause lives between them.", gate: "search space bounded by two evidence anchors" },
  { id: "hypothesize", title: "Hypothesize (one at a time)", detail: "State ONE falsifiable claim, ranked by likelihood × cheapness-to-test.", gate: "exactly one live hypothesis" },
  { id: "probe", title: "Minimal probe", detail: "Smallest observation that decides it (log/assert/breakpoint/narrowed test). Read-only where possible; one probe per hypothesis.", gate: "probe changes as little as possible" },
  { id: "confirm-refute", title: "Confirm or refute → walk the chain", detail: "Refuted = discard and step one link back. Confirmed = check whether the producer of this value is also wrong; keep tracing until input is provably correct = origin.", gate: "root cause reached (correct-in, wrong-out boundary)" },
  { id: "fix-verify", title: "Fix at origin, then verify", detail: "Fix the earliest broken assumption, not the surface. Re-run original repro (must pass) + full suite (no regression). Convert repro into a regression test; remove probes.", gate: "oracle passes, suite green, symptom-patch rejected" },
];

const AIRFLOW_TACTICS = [
  { id: "which-context", title: "Isolate the failing context", detail: "Parsing vs scheduling vs task execution — different processes, different logs." },
  { id: "ti-logs", title: "Read task-instance logs", detail: "The specific try-number log is the real stack trace, not the UI summary." },
  { id: "top-level-code", title: "Check top-level DAG code", detail: "Module-scope code runs every scheduler heartbeat; datetime.now()/heavy work there causes intermittent failures." },
  { id: "xcom-deps", title: "Check XCom & trigger rules", detail: "Missing XCom key, or all_success vs all_done mismatch." },
  { id: "time-state", title: "Check time-as-state", detail: "execution/logical_date, schedule_interval, catchup backfills — wrong data is often wrong interval." },
  { id: "idempotency", title: "Check idempotency", detail: "Re-runs/backfills replay tasks; non-idempotent tasks fail on the second run." },
];

const argv = process.argv.slice(2);
const wantAirflow = argv.includes("--airflow");
const pretty = argv.includes("--pretty");

const payload = {
  skill: SKILL,
  lane: LANE,
  phase: PHASE,
  loop: "reproduce → hypothesize → minimal probe → confirm/refute → fix → verify",
  principle: "Trace the symptom backward to its true origin (evidence chain); fix the cause, not the surface.",
  steps: STEPS,
  conditional: {
    signal: "airflow-dags",
    active: wantAirflow,
    tactics: wantAirflow ? AIRFLOW_TACTICS : [],
  },
  stopRule: "3 refuted hypotheses with no narrowing → re-check the repro and the anchors before continuing.",
};

if (pretty) {
  console.log(`${SKILL}  [${PHASE}/${LANE}]`);
  console.log(payload.loop + "\n");
  STEPS.forEach((s, i) => console.log(`${i + 1}. ${s.title}\n   ${s.detail}\n   gate: ${s.gate}`));
  if (wantAirflow) {
    console.log("\nAirflow DAG tactics (conditional):");
    AIRFLOW_TACTICS.forEach((t, i) => console.log(`  a${i + 1}. ${t.title} — ${t.detail}`));
  }
  console.log(`\nStop rule: ${payload.stopRule}`);
} else {
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
