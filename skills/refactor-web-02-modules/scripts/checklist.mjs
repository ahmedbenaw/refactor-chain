#!/usr/bin/env node
/**
 * refactor-web-02-modules — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-web-02-modules",
  lane: "web governance",
  position: "step 02 of 05",
  prerequisite: "refactor-web-01-structure (clean layer map)",
  next: "refactor-web-03-components",
  adaptivity: "framework-adaptive via the signals registry (React features / Vue modules / Svelte route groups / Angular feature areas)",
  quorum: {
    rule: "3 of 5 signals -> separate module; exactly 3 is borderline (presented as a choice)",
    signals: ["business independence", "data boundary", "cohesion", "team ownership", "reusability"],
    hardRule: "split by business domain, never by page type (no lists/ forms/ details/ modules)"
  },
  anatomy: [
    { id: "MOD-01", rule: "contains its own views/pages", severity: "ERROR" },
    { id: "MOD-02", rule: "has an api/ layer for its own endpoints", severity: "ERROR" },
    { id: "MOD-03", rule: "has a types/ layer for its own data shapes", severity: "WARN" },
    { id: "MOD-04", rule: "exposes exactly one public entry file", severity: "ERROR" },
    { id: "MOD-05", rule: "module directory is kebab-case", severity: "WARN" },
    { id: "MOD-06", rule: "view components are PascalCase", severity: "WARN" },
    { id: "MOD-07", rule: "respects the size ceiling (default 10 views, configurable)", severity: "WARN" },
    { id: "MOD-08", rule: "api/ files and types/ files pair one-to-one", severity: "SUGGESTION" },
    { id: "MOD-09", rule: "sub-modules repeat the same anatomy", severity: "WARN" },
    { id: "MOD-10", rule: "routed module has a route registration; stateful one has a store slice/composable", severity: "ERROR" }
  ],
  steps: [
    { id: 1, title: "Load context", do: "Resolve framework + feature-layer location from the signals registry; inventory every module directory.", gate: "Framework and feature layer echoed before any finding." },
    { id: 2, title: "Boundary check", do: "Score the 5-signal quorum matrix per candidate boundary; 3+ -> separate module; split by domain, never page type.", gate: "Exactly-3 scores presented as a choice, not applied silently." },
    { id: 3, title: "Anatomy audit", do: "Grade each module MOD-01..MOD-10 with evidence.", gate: "ERROR tier blocks; WARN/SUGGESTION advisory." },
    { id: 4, title: "Encapsulation check", do: "Grep for imports of another module's internals, including its api/ layer.", gate: "Any cross-module internal import is a violation with a shared-layer fix." },
    { id: 5, title: "Report", do: "Emit templates/output.md: matrix scores, per-module rule table, violation list with fixes.", gate: "Every finding carries an ID + severity." },
    { id: 6, title: "Govern (confirmation-gated)", do: "Checkpoint, confirmed split/merge/move plan, execute in batches with routes+store updated in the same batch, re-run baseline.", gate: "No move without a confirmed plan; behavior unchanged." },
    { id: 7, title: "Scaffold (on request)", do: "Generate a standard module in the framework idiom, register routes, export the entry, re-audit against MOD-01..MOD-10.", gate: "New module passes its own audit before delivery." },
    { id: 8, title: "Verify + advance", do: "Baseline green; zero cross-module internal imports; every module passes or has a waiver; routes resolve; orchestrate.mjs advance.", gate: "Verify gate blocks on drift." }
  ],
  guardrails: [
    "Behavior preserved: boundary/structure changes only; endpoints and payloads unchanged when moved behind shared layers.",
    "No split or merge without a confirmed plan; routes and store registrations move in the same batch as the files.",
    "Module names come from the business vocabulary the code already uses, not invented taxonomy.",
    "Cross-module needs route through shared layers; only the public entry is importable."
  ]
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
