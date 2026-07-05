#!/usr/bin/env node
// refactor-backend-08-common-extract — step checklist as JSON (zero dependencies).
// Usage: node checklist.mjs [--pretty]

const checklist = {
  skill: "refactor-backend-08-common-extract",
  lane: "java-layered-architecture",
  step: "08/09",
  prerequisite: "refactor-backend-07-api-naming",
  next: "refactor-backend-09-code-optimize",
  scope: ["util", "cache", "constant", "enums", "exception", "config"],
  grades: ["EXTRACT (auto move)", "EVALUATE (user decides)", "RETAIN (stays put)"],
  gates: [
    { id: "Gate 1", check: "red lines: persistence-scanner config or name collision in common", result: "RETAIN / halt" },
    { id: "Gate 2", check: "imports of the module's service or DAO layer", result: "RETAIN" },
    { id: "Gate 3", check: "injected module-owned beans (whitelist tolerated) + cross-module reference count (threshold 2, deduped per module)", result: "RETAIN or EXTRACT/EVALUATE" },
    { id: "Gate 4", check: "config-class component-scan paths that only make sense in the owning module", result: "RETAIN or EXTRACT" }
  ],
  steps: [
    { n: 1, phase: "pre-flight", do: "confirm the common module exists and is registered in the parent build file; confirm the user holds a safety-net checkpoint; any failure aborts" },
    { n: 2, phase: "scan", do: "glob the six package families under each feature module; record module, package, path" },
    { n: 3, phase: "classify", do: "run the four-gate tree, first hit wins, grep evidence only; grade EXTRACT / EVALUATE / RETAIN" },
    { n: 4, phase: "confirm", do: "list EXTRACT (auto), show EVALUATE for a decision, exclude RETAIN with reasons; user approves before any move" },
    { n: 5, phase: "migrate", do: "file-by-file in order constant->enums->exception->util->cache->config, using the seven-step loop; never batch" },
    { n: 6, phase: "rewire", do: "add common dependency to source modules that need it; add to common only the third-party libs its new files import; confirm the parent module list" },
    { n: 7, phase: "verify", do: "packages match new paths; imports resolve; source paths gone; empty dirs cleaned; build compiles across modules; re-run reports an empty migration list" },
    { n: 8, phase: "handoff", do: "emit the migration report; run chain verify gate + refactor-verify; advance to step 09" }
  ],
  loop: ["read", "compare package vs target path", "cp (encoding preserved)", "grep referencing imports", "update imports only if the package changed (usually it does not)", "delete source", "verify"],
  invariants: [
    "behavior preserved: no method body, signature, annotation, field, class name, or file name changes",
    "persistence-scanner config classes are an absolute red line: never moved",
    "name collisions halt the file for a user merge/keep/replace decision; nothing overwritten silently",
    "copy-then-delete: the source survives until the copy verifies; cp, never read-and-rewrite",
    "only the six package families are in scope; business layers are other steps' business",
    "idempotent: a re-run on a finished project migrates nothing"
  ]
};

const pretty = process.argv.includes("--pretty");
process.stdout.write(JSON.stringify(checklist, null, pretty ? 2 : 0) + "\n");
