#!/usr/bin/env node
// refactor-backend-04-service — step checklist as JSON (zero dependencies).
// Usage: node checklist.mjs [--pretty]

const checklist = {
  skill: "refactor-backend-04-service",
  lane: "backend",
  step: "04/09",
  prerequisite: "refactor-backend-03-dao-model",
  next: "refactor-backend-05-controller",
  rules: [
    { id: "SVC-1", check: "interface/implementation separation", severity: "FAIL/WARN" },
    { id: "SVC-2", check: "interface-package existence and full coverage", severity: "FAIL" },
    { id: "SVC-3", check: "service-interface ownership", severity: "FAIL/WARN" },
    { id: "SVC-4", check: "implementation ownership under service/impl", severity: "FAIL" },
    { id: "SVC-5", check: "non-service files mixed into target packages", severity: "WARN" }
  ],
  steps: [
    { n: 1, phase: "scope", do: "locate all service trees across modules; confirm interface-package name (default facade/)" },
    { n: 2, phase: "scan", do: "glob service roots + business sub-packages + nested */service/ + scattered impl/; merge and de-duplicate" },
    { n: 3, phase: "classify", do: "apply the deterministic tree (first match wins); remote clients and ambiguous files stay in place" },
    { n: 4, phase: "check", do: "evaluate SVC-1..SVC-5; emit the check report" },
    { n: 5, phase: "fix:pre-check", do: "same-name collision scan (destinations + candidates) and wildcard-import scan; any collision = hard stop" },
    { n: 6, phase: "fix:plan", do: "emit the fix-plan table; totals must reconcile with the scan" },
    { n: 7, phase: "fix:confirm", do: "obtain explicit user confirmation before any move" },
    { n: 8, phase: "fix:execute", do: "create target dirs; move interfaces then impls, alphabetically, one at a time; copy-not-generate; update imports/bean refs after each file" },
    { n: 9, phase: "fix:cleanup", do: "resolve wildcard imports; delete empty source dirs; never reuse imp//svc/ dirs" },
    { n: 10, phase: "verify", do: "4-way verification: structure, references, content, counts; residual grep sweep must be empty" },
    { n: 11, phase: "handoff", do: "report; run chain verify gate; advance to step 05" }
  ],
  invariants: [
    "behavior preserved: only package lines, import lines, and file locations change",
    "idempotent: re-running on a fixed tree plans zero moves",
    "deterministic: same input + same rules => same output",
    "file encodings (incl. BOM) preserved on move",
    "no move executes without user confirmation"
  ]
};

const pretty = process.argv.includes("--pretty");
process.stdout.write(JSON.stringify(checklist, null, pretty ? 2 : 0) + "\n");
