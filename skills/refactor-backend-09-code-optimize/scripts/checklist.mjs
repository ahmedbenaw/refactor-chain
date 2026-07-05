#!/usr/bin/env node
/**
 * refactor-backend-09-code-optimize — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-backend-09-code-optimize",
  lane: "java layered-architecture",
  position: "step 09 of 09",
  prerequisite: "refactor-backend-08-common-extract",
  next: "refactor-code-principles (default final pass) -> review gate",
  modes: ["check (report only)", "fix (confirmed repairs)"],
  steps: [
    { id: 1, title: "Scope & filter", do: "Select @Service/@Repository implementations; exclude interfaces, mappers, controllers, config, DTO/model; record oversized files (default >1000 lines) on the skip list.", gate: "Candidate + excluded + skipped counts reconcile." },
    { id: 2, title: "Detect idioms", do: "Identify the project's logging idiom and persistence stack; repairs adopt what exists, never introduce a new framework.", gate: "Idioms recorded in the report header." },
    { id: 3, title: "Analyze & rank", do: "Label findings SQL-1..3 (P1 security), LOG-1..3 (P2 observability), OPT-1..5 (P3 hygiene).", gate: "Every finding carries a rule ID and severity." },
    { id: 4, title: "Check report", do: "Emit templates/output.md section A; stop unless fix mode is requested and confirmed.", gate: "Explicit confirmation before any edit." },
    { id: 5, title: "Fix in priority order", do: "Per file: parameterize SQL values, whitelist dynamic tables, pattern-validate dynamic columns; add logger/entry/exception logging; clean redundancy, dead-code comments, resources.", gate: "Red lines hold: no class renames, no signature changes, no edits to existing logs, no business-flow changes; functional comments and TODOs preserved." },
    { id: 6, title: "Style checkpoint", do: "After the first fixed file, show the diff and confirm style before auto-continuing; progress summary every 5-10 files.", gate: "User approved the style sample." },
    { id: 7, title: "Change report + verify", do: "Reconcile processed+skipped=candidates; grep for residual SQL concatenation; one logger per class; build + baseline tests green.", gate: "Zero unreported residual findings; baseline pass-set identical." },
  ],
  guardrails: [
    "Behavior preserved: binding mechanisms change, query semantics never do.",
    "Whitelist/validation rejections fail loudly, never silently substitute.",
    "Equivalence unprovable locally -> report, don't edit.",
    "Oversized files skipped whole, never partially edited.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
