#!/usr/bin/env node
/**
 * refactor-plan-gate — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-plan-gate",
  phase: "plan (after init, before baseline)",
  prerequisite: "initialized chain (orchestrate.mjs init succeeded, state.json exists)",
  next: "refactor-safety-net (baseline) — unlocked only once plan.md is recorded",
  gate: "no plan.md on disk → do not call orchestrate.mjs baseline",
  steps: [
    { id: 1, title: "Confirm chain initialized", do: "orchestrate.mjs status --target <dir>; if inactive, run init first.", gate: "active:true and step list available." },
    { id: 2, title: "Write the four-part mini-plan", do: "Goal (1 sentence), Unknowns (each with a resolution path + when), Success criteria (checkable), Step order (mapped onto state.steps).", gate: "All four sections non-empty; every unknown has a resolution path; every criterion is command- or diff-checkable." },
    { id: 3, title: "Spec-kit checkpoint (conditional)", do: "If diagnosis signals include 'spec-kit' (.specify/ detected): ask the user to pick Mode 1 (Integrate) or Mode 3 (Adopt), with a recommendation. Mature+current specs + bounded refactor → Mode 1; absent/stale specs or architecture-scale → Mode 3.", gate: "User answered; mode + one-line rationale recorded in plan header." },
    { id: 4, title: "Record the plan into state", do: "Write <target>/.refactor-chain/plan.md; push marker note onto state.steps[0].notes (the one sanctioned direct state write).", gate: "plan.md exists; status output shows the marker note." },
    { id: 5, title: "Unlock baseline", do: "Hand off to refactor-safety-net → orchestrate.mjs baseline.", gate: "baseline called only after plan.md exists." },
  ],
  specKitModes: {
    "1-integrate": "spec.md/plan.md ARE the plan; verify also checks acceptance criteria; scope fences to the active tasks.md item; artifacts updated after.",
    "3-adopt": "spec-driven flow becomes the plan phase; tasks map 1:1 to chain steps.",
    heuristic: "mature specs + bounded refactor → Mode 1; absent/stale specs or architecture-scale → Mode 3",
  },
  guardrails: [
    "Edits no code; blocks baseline until the plan is recorded.",
    "A plan is a direction, not a contract — update it when reality disagrees.",
    "Unknowns without a resolution path are not plan items.",
    "Success criteria must be checkable, never vibes.",
    "The spec-kit checkpoint is a real user question, never a silent default.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
