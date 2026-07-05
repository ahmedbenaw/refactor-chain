#!/usr/bin/env node
/**
 * refactor-backend-05-controller — step checklist as JSON. Zero deps.
 *   node checklist.mjs           → ordered steps
 *   node checklist.mjs --rules   → the classification/admission rule index
 */
const STEPS = [
  { n: 1, step: "Scope & naming: confirm the target modules/packages; controllers are identified by active (non-commented) controller annotations, never by file name." },
  { n: 2, step: "Admission gate (annotation truth): admit a class only when a live controller annotation is present; record the annotation line for the audit trail." },
  { n: 3, step: "Count-reconciled scan: enumerate all controller classes in a pass whose counts reconcile (found = classified + excluded)." },
  { n: 4, step: "Classify (three levels, first hit stops): exact class-name table → ordered keyword table → default external audience; split into external (custom) and internal (common) groups." },
  { n: 5, step: "Check: report placement violations with severity; no renames, merges, or typo fixes — classification only." },
  { n: 6, step: "Fix (only when asked): move controllers into the external/internal sub-packages, propagate imports/registrations, verify counts reconcile and the build stays green; record the verify delta through the harness gate." },
];
const RULES = {
  admission: "Active controller annotation required; commented annotations and file names never admit",
  "level-1": "Exact class-name mapping table (deterministic)",
  "level-2": "Ordered keyword table (first match wins)",
  "level-3": "Default: external audience",
  "red-lines": "No renaming, merging, typo-fixing, or business-logic edits",
};
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
if (process.argv.includes("--rules")) out({ skill: "refactor-backend-05-controller", rules: RULES });
else out({ skill: "refactor-backend-05-controller", lane: "backend", phase: "do-the-work", prerequisite: "refactor-backend-04-service", next: "refactor-backend-06-dependency-guard", behaviorPreserving: true, steps: STEPS });
