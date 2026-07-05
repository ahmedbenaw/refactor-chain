#!/usr/bin/env node
/**
 * refactor-backend-06-dependency-guard — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-backend-06-dependency-guard",
  lane: "java layered-architecture",
  position: "step 06 of 09",
  prerequisite: "refactor-backend-05-controller (interfaces and packages settled by 03-05)",
  next: "refactor-backend-07-api-naming",
  steps: [
    { id: 1, title: "Scope & module map", do: "Detect which build modules hold controller/service/DAO/model code from pom.xml or Gradle settings; confirm scope.", gate: "Module map recorded in the report header." },
    { id: 2, title: "Scan injections", do: "Collect @Autowired/@Resource fields and imports for every controller.", gate: "Every controller file accounted for." },
    { id: 3, title: "Exclusion gate", do: "Test each injected type for remote-client signals (EXC-1..EXC-5) and logger-only class literals before any rule fires.", gate: "Each SKIP carries a recorded reason." },
    { id: 4, title: "Deterministic labeling", do: "Apply DEP-1..DEP-6 in strict priority; first match on the injected type's characteristics wins.", gate: "Repeated runs produce identical labels." },
    { id: 5, title: "Report", do: "Emit the check report from templates/output.md with file:line, rule, evidence, remedy.", gate: "FAIL/WARN/SKIP counts reconcile with the scan." },
    { id: 6, title: "Fix plan + confirmation", do: "Order: DEP-6 moves, DEP-1 decision tree, DEP-2 delegate synthesis (pre-flight checklist per service), DEP-3 interface switches.", gate: "Explicit user confirmation before any edit." },
    { id: 7, title: "Execute with checkpoints", do: "Repair per method.md; exact signatures, deterministic collision prefixes and ordering, SQL never moves; compile every 3-5 fixes.", gate: "Each batch compiles before the next starts." },
    { id: 8, title: "Completeness loop", do: "V-1 impl-residue sweep, V-2 DAO-residue sweep, V-3 interface completeness (all overloads, all callers), V-4/V-5 builds, V-6 placement.", gate: "Zero non-SKIP residue; full build green; fixed+skipped = planned." },
  ],
  guardrails: [
    "Behavior preserved: no method bodies, endpoints, or SQL change; delegates are pure forwarders.",
    "No renames, merges, splits, or type tightening while repairing.",
    "Interfaces declare only methods callers actually invoke.",
    "Remote clients are excluded before rules ever run.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
