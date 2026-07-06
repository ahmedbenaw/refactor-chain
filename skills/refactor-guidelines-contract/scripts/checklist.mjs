#!/usr/bin/env node
// refactor-guidelines-contract — the five clauses as a JSON checklist (zero-dep).
// Usage:
//   node checklist.mjs             -> full contract checklist as JSON
//   node checklist.mjs --clauses   -> just the five clauses

const CLAUSES = [
  {
    id: 1,
    key: "no-invented-apis",
    title: "No invented APIs",
    rule:
      "Nothing in an edit may call, import, extend, or configure a symbol whose existence has not been verified in this repo or its declared dependencies.",
    cue: "“It probably has a helper for this”; writing a call before opening the file it lives in.",
    repair:
      "Stop, locate or admit absence; use the real symbol or write the missing one as an explicit, planned addition — never leave the phantom call in.",
  },
  {
    id: 2,
    key: "no-silent-scope-creep",
    title: "No silent scope creep",
    rule:
      "The run does what was diagnosed and planned — nothing more rides along. Improvements noticed en route become parked notes for the human, not edits.",
    cue: "“While I'm in this file…”; diffs touching files the plan never named; a renamed variable in a bugfix diff.",
    repair:
      "Revert the stowaway change, write it as a parked state note, tell the human it exists. Scope only widens when the human widens it.",
  },
  {
    id: 3,
    key: "done-means-verified",
    title: "Done means verified",
    rule:
      "A completion claim requires an executed check (tests ran and passed, build built, gate said PASS) and names its evidence. “Written” and “should work” are not done.",
    cue: "“That should work now”; “done” typed in the same breath as the edit; success declared on code that never executed.",
    repair:
      "Withdraw the claim out loud, run the real check, re-claim with evidence — or report the failure honestly.",
  },
  {
    id: 4,
    key: "smallest-sufficient-diff",
    title: "Smallest sufficient diff",
    rule:
      "Prefer the targeted edit. A rewrite is allowed only when the human explicitly approves it after being told why the small diff will not serve.",
    cue: "“This file is a mess anyway”; regenerating a whole file to change one branch; churn dwarfing the fix.",
    repair:
      "Discard the rewrite, produce the minimal diff, offer the larger restructuring as a separate, human-approved proposal.",
  },
  {
    id: 5,
    key: "uncertainty-stated-plainly",
    title: "Uncertainty stated plainly",
    rule:
      "Guesses are labeled guesses; confidence is named in plain words; “I don't know yet — checking” is always acceptable. Never dress an assumption as a fact.",
    cue: "Asserting behavior of code never opened; quoting line numbers from memory; answering a config question without reading the config.",
    repair:
      "Restate with honest confidence, then convert uncertainty into verification — check the thing, then speak.",
  },
];

const ENFORCEMENT = {
  loaded: "By the orchestrator at run start (orchestrate.mjs init); steps do not opt in.",
  selfCheck:
    "At every claim boundary — before advance, before “done”, before presenting any diff: a 10-second pass over the five cues.",
  onViolation:
    "Stop, name the clause, undo or park the offending work, record it via templates/output.md; violations feed the improvement retro.",
  blocking:
    "Advisory over conduct, blocking over claims: a completion claim failing Clause 3 must not advance past the review gate.",
  override:
    "The human may relax any clause explicitly; overrides are recorded, never assumed.",
  disambiguation:
    "This is the execution CONTRACT (agent conduct). The guidelines ENGINE (scripts/lib/guidelines.mjs, via refactor-rules) audits the target codebase's style — different subject.",
};

const args = process.argv.slice(2);
const out = args.includes("--clauses")
  ? { skill: "refactor-guidelines-contract", clauses: CLAUSES }
  : { skill: "refactor-guidelines-contract", clauses: CLAUSES, enforcement: ENFORCEMENT };

console.log(JSON.stringify(out, null, 2));
