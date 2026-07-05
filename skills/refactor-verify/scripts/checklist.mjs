#!/usr/bin/env node
/**
 * refactor-verify — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-verify",
  phase: "verify (inside every lane step + final gate)",
  prerequisite: "green baseline from refactor-safety-net",
  next: "identical → next step; drift → roll back + self-heal",
  gate: "binary — identical pass-set advances, assertion failure rolls back",
  steps: [
    { id: 1, title: "Re-run exact baseline", do: "Run the precise command safety-net recorded; no subset, no substitute.", gate: "Full recorded baseline executed." },
    { id: 2, title: "Compare pass-sets", do: "Same tests, same pass/fail, same snapshots, same order-sensitive output.", gate: "Classify: identical | assertion-drift | rename-churn." },
    { id: 3, title: "Legal fix ONLY: rename churn", do: "Fix import/path statements a rename/move necessitated; touch no assertion or logic; re-run.", gate: "Identical after churn fix → delta=legal." },
    { id: 4, title: "On drift: roll back the step", do: "Restore pre-step checkpoint; report the assertion that moved (expected vs actual). Do NOT edit tests/code to pass.", gate: "Baseline green again at last good state." },
    { id: 5, title: "Signal harness", do: "advance --delta legal (advance) OR advance --delta drift then fail --reason (self-heal).", gate: "State single-sourced via orchestrate.mjs." },
    { id: 6, title: "Final gate", do: "Re-run whole baseline over the complete diff; must equal ORIGINAL baseline exactly.", gate: "Behavior preserved end-to-end." },
  ],
  deltaTable: {
    legal: ["pass-set identical", "rename-induced import/path churn fixed then identical"],
    drift: ["assertion value changed", "snapshot content changed", "baseline test vanished/skipped", "non-rename compile error", "new flakiness"],
  },
  guardrails: [
    "A gate, never a fixer — assertion failure is answered by rollback, not by editing tests/code.",
    "Only rename-induced import/path churn is legal to mechanically fix.",
    "Identical means identical (tests, assertions, snapshots, ordering).",
    "Never weaken/skip/.only a baseline test to get green.",
    "Advance only through orchestrate.mjs; the harness owns state.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
