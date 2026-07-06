#!/usr/bin/env node
/**
 * refactor-web-03-components — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-web-03-components",
  lane: "web governance",
  position: "step 03 of 05",
  prerequisite: "refactor-web-02-modules (settled module layout)",
  next: "refactor-web-04-layout",
  adaptivity: "framework-adaptive (signals registry); token-driven (project semantic tokens); thresholds configurable",
  steps: [
    { id: 1, title: "Load context", do: "Detect framework/component library from the signals registry; resolve the semantic token map; record threshold overrides.", gate: "Token map and thresholds echoed in the report header; no token layer -> flag + cross-ref refactor-ui-tokens." },
    { id: 2, title: "Scope", do: "Whole app, module, file, or rule-category subset (CLR/TYP/BTN/INP/TBL).", gate: "Scope stated before any finding." },
    { id: 3, title: "Audit ~37 rules", do: "Evaluate CLR-1..5, TYP-1..5, BTN-1..8, INP-1..8, TBL-1..11 with file:line evidence and token-resolved fixes.", gate: "Every finding carries rule ID + severity (ERROR/WARN/SUGGESTION)." },
    { id: 4, title: "Report", do: "Emit templates/output.md section A, including unmappable literals for human decision.", gate: "ERROR tier blocks; WARN/SUGGESTION advisory." },
    { id: 5, title: "Fix (confirmation-gated)", do: "Checkpoint, confirmed plan, batches (literal->token first, then structural), baseline re-run per batch.", gate: "No new literals introduced; behavior unchanged." },
    { id: 6, title: "Generate (on request)", do: "Compose query panel / data table / form card / detail card / log view / progress from method.md recipes in the detected framework idiom with accessible names on every interactive element.", gate: "Output passes its own audit (0 ERROR) before delivery." },
    { id: 7, title: "Verify + advance", do: "Zero ERROR findings or recorded waivers; diff grep for literals clean; baseline green; orchestrate.mjs advance.", gate: "Verify gate blocks on drift." },
  ],
  guardrails: [
    "Behavior preserved: handlers, data flow, business logic untouched.",
    "Token-driven, never palette-frozen: unmappable literals are reported, not guessed.",
    "Dimensional caps are configurable thresholds, not magic numbers.",
    "Generated code ships only after passing the same rules it enforces.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
