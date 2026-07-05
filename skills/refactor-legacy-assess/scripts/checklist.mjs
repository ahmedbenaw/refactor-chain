#!/usr/bin/env node
/**
 * refactor-legacy-assess — prints this skill's step checklist as JSON.
 * Zero-dependency. Phase: diagnose. Prereq: refactor-understand.
 * Grades modernization readiness (GREEN/YELLOW/RED gates). Read-only, advisory.
 *
 * Usage:
 *   node scripts/checklist.mjs            # pretty JSON checklist
 *   node scripts/checklist.mjs --ids      # just the step ids, one per line
 */
const CHECKLIST = {
  skill: "refactor-legacy-assess",
  phase: "diagnose",
  prerequisite: "refactor-understand",
  next: "refactor-diagnose + plan",
  readOnly: true,
  advisoryOnly: true,
  gates: ["coupling/seam", "types", "deprecations", "dead-code", "test-seam"],
  grades: ["GREEN", "YELLOW", "RED"],
  rule: "overall verdict = the worst gate; RED = stop-and-fix-first, not a veto",
  steps: [
    { id: "inputs", title: "Load Project Profile + signals (stack, runtime target, hasTests) and any Assessment Map", done_when: "stack, runtime target, and test posture known" },
    { id: "coupling", title: "Detect tight coupling / hard-wired construction / missing seams", done_when: "seam gate graded with evidence" },
    { id: "types", title: "Detect missing/loose typing (any, ts-ignore, untyped params)", done_when: "type gate graded with file:line evidence" },
    { id: "deprecations", title: "Flag deprecated / removed / EOL APIs and runtimes vs the target", done_when: "each flagged item tied to a known removal/EOL or marked verify-against-release-notes" },
    { id: "dead-code", title: "Find unreferenced exports/functions (low-risk cleanup)", done_when: "dead code listed" },
    { id: "test-seam", title: "Confirm whether a real test safety net covers the target", done_when: "test-seam gate graded (RED if none around target)" },
    { id: "grade", title: "Grade each gate GREEN/YELLOW/RED; roll up to overall verdict + ordered prerequisites", done_when: "overall verdict = worst gate; prerequisites ordered most-blocking first" },
    { id: "report", title: "Fill templates/output.md and hand {verdict, gates, prerequisites} to diagnose/plan", done_when: "Readiness Report complete" },
  ],
};

if (process.argv.includes("--ids")) {
  process.stdout.write(CHECKLIST.steps.map((s) => s.id).join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(CHECKLIST, null, 2) + "\n");
}
