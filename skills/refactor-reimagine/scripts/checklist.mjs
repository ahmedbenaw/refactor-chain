#!/usr/bin/env node
/**
 * refactor-reimagine — prints this skill's step checklist as JSON.
 * Zero dependencies. Part of the refactor-chain bundle.
 *
 * Usage:
 *   node checklist.mjs           # pretty JSON
 *   node checklist.mjs --compact # single-line JSON
 *
 * ADVISORY-ONLY. This skill proposes; it never edits code. Execution of an
 * approved step happens only on explicit opt-in, via refactor-transform.
 */

const checklist = {
  skill: "refactor-reimagine",
  phase: "do-the-work (advisory branch)",
  prerequisite: "refactor-understand (+ refactor-assessment-map if available)",
  advisoryOnly: true,
  optIn: true,
  editsCode: false,
  default: "behavior-preserving refactoring stays the default; this is the opt-in exception",
  designLenses: [
    "boundaries",
    "layering",
    "coupling-to-cohesion",
    "dependency-direction",
    "seams-for-testability",
    "state-and-data-ownership",
  ],
  scoringCriteria: [
    "solves-core-pain",
    "effort-cost",
    "risk",
    "testability-gained",
    "reversibility",
    "team-familiarity",
  ],
  migrationPatterns: ["strangler-fig", "branch-by-abstraction", "seam-first-extraction"],
  steps: [
    { n: 1, id: "frame", title: "State the advisory frame",
      detail: "Say plainly: proposal only, no code changes, cleanup is the default." },
    { n: 2, id: "ground", title: "Ground in real pain",
      detail: "Use understand + assessment-map; name the specific structural pain with evidence." },
    { n: 3, id: "candidates", title: "Generate 2-3 target designs",
      detail: "Through the design lenses; each with what it does and does NOT solve." },
    { n: 4, id: "tradeoffs", title: "Trade off honestly",
      detail: "Score each incl. Option 0 (do-nothing) on the rubric; bolder is not automatically better." },
    { n: 5, id: "recommend", title: "Recommend one (falsifiable)",
      detail: "Give 'choose if' AND 'avoid if' conditions." },
    { n: 6, id: "migration", title: "Sketch incremental migration",
      detail: "Small, behavior-preserving, shippable, reversible steps. Never big-bang." },
    { n: 7, id: "writeup-stop", title: "Write proposal and STOP",
      detail: "Fill templates/output.md; present the opt-in gate; do not execute anything." },
  ],
  optInGate: "No approved step is handed to refactor-transform until the human explicitly opts in.",
  guarantees: {
    codeUnchanged: "git working tree unchanged by this skill",
    option0Always: true,
    bigBangNever: true,
  },
};

const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
