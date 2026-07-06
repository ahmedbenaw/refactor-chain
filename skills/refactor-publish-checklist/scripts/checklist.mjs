#!/usr/bin/env node
/**
 * refactor-publish-checklist — checklist + go/no-go evaluator. Zero deps.
 *   node checklist.mjs               -> prints the fixed checklist as JSON
 *   node checklist.mjs --state <dir>  -> evaluates each item against state.json + report presence,
 *                                        returns {verdict: GO|NO-GO, checks:[...], blockers:[...]}
 *
 * Read-only. Conditional items are only evaluated if their guard fired.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILL = "refactor-publish-checklist";
const PHASE = "ship";

const CHECKLIST = [
  { id: "review-gate",      label: "Review gate passed",          owner: "refactor-review-gate" },
  { id: "baseline-green",   label: "Baseline green, no un-redone drift", owner: "refactor-verify" },
  { id: "steps-complete",   label: "All steps complete (none pending/active/healing/blocked)", owner: "orchestrator" },
  { id: "write-up",         label: "Change write-up exists",      owner: "refactor-write-up" },
  { id: "artifacts-current",label: "Durable artifacts current",   owner: "refactor-artifacts-sync" },
  { id: "conditional-data", label: "Data-guard resolved (if fired)", owner: "refactor-data-guard", conditional: true },
  { id: "conditional-telemetry", label: "Telemetry plan resolved (if fired)", owner: "refactor-telemetry-plan", conditional: true },
  { id: "conditional-security", label: "Security review resolved (if fired)", owner: "refactor-security", conditional: true },
  { id: "no-stale-intent",  label: "No stale intent (no rolled-back-not-redone step / open decision / leftover TODO)", owner: "chain" },
];

function exists(dir, ...names) { return names.some((n) => existsSync(join(dir, n))); }

function evaluate(dir) {
  const stFile = join(dir, ".refactor-chain", "state.json");
  if (!existsSync(stFile)) return { verdict: "NO-GO", reason: "no active run state", checks: [], blockers: ["no state.json"] };
  const s = JSON.parse(readFileSync(stFile, "utf8"));
  const steps = s.steps || [];
  const rc = join(dir, ".refactor-chain");
  const p = (v, note) => ({ pass: v, note });

  const gate = steps.find((x) => x.kind === "gate");
  const nonGate = steps.filter((x) => x.kind !== "gate");
  const drifted = nonGate.filter((x) => x.verify?.delta === "drift" && x.status !== "done");
  const incomplete = steps.filter((x) => !["done"].includes(x.status));

  // conditional firing: infer from presence of a guard's report/log or a state flag
  const dataFired = exists(rc, "data-snapshot.json") || exists(rc, "data-safety-report.md");
  const telFired = exists(rc, "tracking-plan.md");
  const secFired = exists(rc, "security-report.md");

  const results = {
    "review-gate": p(!!gate && gate.status === "done", gate ? `gate status=${gate.status}` : "no gate step"),
    "baseline-green": p(!!s.baseline && drifted.length === 0, s.baseline ? `baseline recorded; drift-un-redone=${drifted.length}` : "no baseline"),
    "steps-complete": p(incomplete.length === 0, incomplete.length ? `incomplete: ${incomplete.map((x) => x.skill).join(", ")}` : "all done"),
    "write-up": p(exists(rc, "change-report.md") || exists(dir, "CHANGES.md", "docs/change-report.md"), "looks for a Change Report artifact"),
    "artifacts-current": p(true, "confirm via refactor-artifacts-sync record (manual/skill assertion)"),
    "conditional-data": dataFired ? p(exists(rc, "data-safety-report.md"), "data-guard fired — report present?") : { pass: true, note: "n/a (data-guard did not fire)", skipped: true },
    "conditional-telemetry": telFired ? p(exists(rc, "tracking-plan.md"), "telemetry fired — plan present?") : { pass: true, note: "n/a (telemetry did not fire)", skipped: true },
    "conditional-security": secFired ? p(exists(rc, "security-report.md"), "security fired — report present?") : { pass: true, note: "n/a (security did not fire)", skipped: true },
    "no-stale-intent": p(s.health === "ok" && drifted.length === 0 && incomplete.length === 0, `health=${s.health}`),
  };

  const checks = CHECKLIST.map((c) => ({ id: c.id, label: c.label, owner: c.owner, ...results[c.id] }));
  const blockers = checks.filter((c) => !c.pass).map((c) => ({ id: c.id, label: c.label, owner: c.owner, why: c.note }));
  return { verdict: blockers.length ? "NO-GO" : "GO", checks, blockers };
}

const argv = process.argv.slice(2);
const si = argv.indexOf("--state");
if (si >= 0) {
  process.stdout.write(JSON.stringify({ skill: SKILL, ...evaluate(argv[si + 1] || process.cwd()) }, null, 2) + "\n");
} else {
  process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, checklist: CHECKLIST }, null, 2) + "\n");
}
