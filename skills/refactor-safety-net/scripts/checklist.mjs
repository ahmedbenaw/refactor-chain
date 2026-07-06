#!/usr/bin/env node
/**
 * refactor-safety-net — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-safety-net",
  phase: "baseline",
  prerequisite: "plan",
  next: "first lane step (then refactor-verify gates each step)",
  invariant: "NEVER refactor on a red repo",
  steps: [
    { id: 1, title: "Detect suite", do: "Find test runner + existing tests via manifests, test dirs, CI.", gate: "Decision: suite exists OR none." },
    { id: 2, title: "If suite exists: run it", do: "Run narrowest-in-scope then full suite (prefer CI command).", gate: "GREEN → baseline; RED → STOP; FLAKY → exclude flaky." },
    { id: 3, title: "If no suite: derive characterization tests", do: "Enumerate seams the refactor crosses; capture ACTUAL current output as assertions, quirks/bugs included.", gate: "Minimal net covering the refactored surface." },
    { id: 4, title: "Run derived tests green", do: "They must pass against unmodified code (fix the test, never the code).", gate: "All derived tests green on untouched code." },
    { id: 5, title: "Record baseline in harness", do: "orchestrate.mjs baseline --target <dir> --cmd <cmd> --framework <fw> [--derived] --passset <summary>.", gate: "Phase flips baseline → lane; status shows baseline: true." },
    { id: 6, title: "Hand off", do: "Report command, pass-set, derived?/seams, excluded red/flaky areas.", gate: "Chain may run first lane step." },
  ],
  guardrails: [
    "Writes tests only — never edits production code.",
    "Red baseline is not a baseline: STOP and surface it.",
    "Pin current behavior including bugs; do not 'correct' while pinning.",
    "Keep the net minimal, fast, non-flaky (it runs after every step).",
    "Record the exact command + framework so refactor-verify re-runs precisely it.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
