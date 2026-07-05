#!/usr/bin/env node
/**
 * refactor-rules — prints this skill's step checklist as JSON.
 * Zero dependencies. Part of the refactor-chain bundle.
 *
 * Usage:
 *   node checklist.mjs           # pretty JSON
 *   node checklist.mjs --compact # single-line JSON
 *
 * The checklist is the extract → confirm → enforce(before) → enforce(after)
 * loop. Enforcement emits a `legal|drift` delta that maps onto
 * `orchestrate.mjs advance --delta`.
 */

const checklist = {
  skill: "refactor-rules",
  phase: "diagnose (extract) → do-the-work (enforce)",
  prerequisite: "refactor-understand",
  advisory: true,
  editsCode: false,
  severities: ["ERROR", "WARNING", "SUGGESTION"],
  ruleCategories: [
    "dependency-injection",
    "naming",
    "module-boundaries",
    "layering",
    "error-return-conventions",
    "immutability-purity",
  ],
  dominanceThresholds: {
    ERROR: ">=90% conform AND >=5 sites",
    WARNING: "70-90% conform, or 3-4 sites at >=90%",
    SUGGESTION: "50-70% conform, or a thin but clear 2-site pattern",
    notARule: "<50% conform, or only 1 site",
  },
  steps: [
    { n: 1, id: "inputs", title: "Confirm stack & scope",
      detail: "Use refactor-understand's summary; else quick read-only pass.",
      readOnly: true },
    { n: 2, id: "infer", title: "Infer dominant rules",
      detail: "Scan the 6 categories; record only dominant patterns per thresholds.",
      readOnly: true },
    { n: 3, id: "manifest", title: "Write rules-manifest.md",
      detail: "Fill templates/output.md: id, statement, severity, detection, counts.",
      readOnly: true },
    { n: 4, id: "confirm", title: "Confirm with the human",
      detail: "Show manifest; drop vetoed rules (record reason); apply upgrades.",
      readOnly: true },
    { n: 5, id: "before", title: "Enforce — baseline",
      detail: "Record per-rule violating count BEFORE the step touches code.",
      readOnly: true },
    { n: 6, id: "after", title: "Enforce — drift check",
      detail: "Re-run identical detection AFTER the step; compute new violations.",
      readOnly: true },
    { n: 7, id: "verdict", title: "Emit delta",
      detail: "New ERROR => drift (STOP, surface to gate); else legal. Emit {delta,newViolations}.",
      readOnly: true },
  ],
  passCondition: "Zero new ERROR-severity violations after the step.",
  harnessSignal: { delta: "legal|drift", newViolations: "[{rule,file,detail}]" },
};

const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
