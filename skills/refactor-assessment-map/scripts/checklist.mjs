#!/usr/bin/env node
/**
 * refactor-assessment-map — prints this skill's step checklist as JSON.
 * Zero-dependency. Phase: understand/diagnose. Prereq: refactor-understand.
 * Feeds refactor-diagnose + the plan phase a ranked target list. Read-only.
 *
 * Usage:
 *   node scripts/checklist.mjs            # pretty JSON checklist
 *   node scripts/checklist.mjs --ids      # just the step ids, one per line
 */
const CHECKLIST = {
  skill: "refactor-assessment-map",
  phase: "understand/diagnose",
  prerequisite: "refactor-understand",
  next: "refactor-diagnose + plan",
  readOnly: true,
  advisoryOnly: true,
  formula: "risk = coupling_weight × complexity × blast_radius (blast_radius = normalized fan-in)",
  steps: [
    { id: "inputs", title: "Load Project Profile + signals (language, source roots, framework)", done_when: "stack and source roots known" },
    { id: "dep-graph", title: "Parse imports per file into a directed module graph (fan-in/fan-out/instability)", done_when: "edges + Ca/Ce/I recorded per node" },
    { id: "cycles", title: "Detect circular dependencies (SCCs with >1 node)", done_when: "all cycles flagged as blockers to safe extraction" },
    { id: "coupling", title: "Identify god modules, unstable-but-depended-on, layer violations", done_when: "coupling hotspots named with metrics" },
    { id: "hotspots", title: "Rank hotspots by complexity × churn × fan-in (git churn if available)", done_when: "hotspot score computed; churn limitation noted if no git" },
    { id: "rank", title: "Produce ranked target table + 1–3 quick-win leaf modules", done_when: "every rank traces to a counted metric" },
    { id: "map", title: "Fill templates/output.md and hand the ranked target list to diagnose/plan", done_when: "Assessment Map complete with coverage note" },
  ],
};

if (process.argv.includes("--ids")) {
  process.stdout.write(CHECKLIST.steps.map((s) => s.id).join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(CHECKLIST, null, 2) + "\n");
}
