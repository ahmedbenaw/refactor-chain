#!/usr/bin/env node
/**
 * refactor-web-05-naming — step checklist as JSON. Zero deps.
 *   node checklist.mjs            → the ordered steps
 *   node checklist.mjs --rules    → the eight rule-category index
 */
const STEPS = [
  { n: 1, step: "Detect the framework + the project's already-chosen naming dialect (file casing, shared-primitive prefix, styling convention)." },
  { n: 2, step: "Confirm scope: all eight categories, or the single one requested. Exclude vendor/build/generated dirs." },
  { n: 3, step: "Run NAME-01…NAME-08; emit a severity-ranked report (ERROR / WARNING / SUGGESTION) with rule ID, location, offending name, compliant form." },
  { n: 4, step: "Fix mode only: build the rename map + full propagation set (imports, template/JSX usages, registrations, style selectors, route/config strings, tests). Show the plan, wait for explicit approval." },
  { n: 5, step: "Apply renames (LSP-grade where available), atomically per rename; after each batch build/typecheck + run tests + grep for the old name." },
  { n: 6, step: "Re-check: prior ERRORs gone, none introduced; record the verify delta through the harness gate before handing to refactor-code-principles." },
];
const RULES = {
  "NAME-01": "Components: multi-word PascalCase, name matches file",
  "NAME-02": "Files & directories: project file convention (framework roles respected)",
  "NAME-03": "Variables/functions: camelCase, UPPER_SNAKE constants, PascalCase types, predicate booleans",
  "NAME-04": "Style classes: the project's declared convention, consistently",
  "NAME-05": "Event handlers: handle-prefixed fns, on-prefixed props, framework event casing",
  "NAME-06": "User-facing labels: short, business-worded, sibling-consistent",
  "NAME-07": "Workflow/menu nodes: verb-object, role-based",
  "NAME-08": "Props/contract types: <Component>Props/Emits, always typed",
};
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
if (process.argv.includes("--rules")) out({ skill: "refactor-web-05-naming", rules: RULES });
else out({ skill: "refactor-web-05-naming", lane: "web", phase: "do-the-work", prerequisite: "refactor-web-04-layout", next: "refactor-code-principles", behaviorPreserving: true, steps: STEPS });
