#!/usr/bin/env node
/**
 * refactor-performance — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-performance",
  phase: "review/verify",
  prerequisite: "refactor-verify confirmed behavior preserved on the diff",
  next: "refactor-review-gate (folds findings into the ranked ship report)",
  posture: "advisory — reports ranked findings with file:line + fix sketch; never edits code",
  steps: [
    { id: 1, title: "Scope to the diff", do: "Review changed/added lines + immediate call context only; audit what the refactor did.", gate: "Not a whole-codebase scan." },
    { id: 2, title: "Scan four cost classes", do: "Algorithmic hotspots; N+1/data-access; unnecessary/repeated work; bundle/query cost.", gate: "Each changed hot path checked against the catalog." },
    { id: 3, title: "Rank by impact", do: "impact ≈ data-size sensitivity × call frequency × per-item cost; worst-first.", gate: "Findings ordered; per-request N+1 outranks one-time recompute." },
    { id: 4, title: "Sketch a fix per finding", do: "file:line, cost class, why the refactor caused it, minimal BEHAVIOR-PRESERVING fix.", gate: "Every finding actionable." },
    { id: 5, title: "Optionally confirm at runtime", do: "If a tracing tool is available and cost is ambiguous, measure once and cite; never gate on tooling.", gate: "Ambiguous hotspots confirmed or left as static evidence." },
    { id: 6, title: "Report, don't edit", do: "Emit ranked findings via templates/output.md for refactor-review-gate.", gate: "No code changed by this skill." },
  ],
  costClasses: {
    algorithmic: ["nested iteration O(n^2)+", "work moved into a loop", "linear scan where a Map/Set lookup belongs", "sort inside a loop", "re-derive invariant per iteration"],
    "n+1_data": ["query/fetch per row", "lazy relation in a loop", "repeated identical fetch", "chatty external calls"],
    repeated_work: ["recompute stable value", "dropped memo/cache", "re-fetch data in hand", "redundant serialize/parse", "effect over-invalidation"],
    bundle_query: ["heavy dep for trivial need", "broken tree-shaking", "SELECT */over-fetch", "missing-index query pattern", "payload growth"],
  },
  guardrails: [
    "Advisory only — never edits code; fixes are applied later and must re-pass refactor-verify.",
    "Diff-scoped — flag what the refactor introduced/worsened; note pre-existing hotspots briefly.",
    "No micro-optimization theater — only what matters at real data sizes/frequencies.",
    "Every suggested fix preserves behavior.",
    "Runtime web-vitals investigation is refactor-web-performance, not this skill.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
