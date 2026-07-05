#!/usr/bin/env node
// Prints the refactor-backend-07-api-naming step checklist as JSON. Zero deps.
const checklist = {
  skill: "refactor-backend-07-api-naming",
  chain: { lane: "java", step: "07/09", prev: "refactor-backend-06-dependency-guard", next: "refactor-backend-08-common-extract" },
  behaviorPreserving: true,
  steps: [
    { id: 1, name: "scope", detail: "Enumerate production .java sources by layer; exclude tests, generated code, build output." },
    { id: 2, name: "check", detail: "Run N-01..N-06 in order (paths, class names, properties, request params, response wrappers, bean names); sort deterministically." },
    { id: 3, name: "classify", detail: "Split findings into fixable vs constrained via the contract-impact decision flow; constrained items are report-only." },
    { id: 4, name: "plan+confirm", detail: "Emit the fix plan from templates/output.md and wait for explicit user approval." },
    { id: 5, name: "fix", detail: "Apply F-1 method-compat, F-2 class renames (6-step, mv preserves encoding), F-3 bean-conflict tree — one item at a time, grep-verified." },
    { id: 6, name: "verify", detail: "Old identifiers grep to 0; file==class names; bean names unique; re-check reports 0 fixable; build compiles; harness gate passes." }
  ],
  guardrails: [
    "Never change URLs, HTTP-method semantics, serialized field names, or request parameter names.",
    "Never edit method bodies.",
    "Collision pre-check before every rename; stop and ask on ambiguity.",
    "Idempotent: a re-run over clean code changes nothing."
  ]
};
console.log(JSON.stringify(checklist, null, 2));
