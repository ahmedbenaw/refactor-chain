#!/usr/bin/env node
/**
 * refactor-backend-01-architecture — prints this skill's step checklist as JSON.
 * Zero-dependency. Lane: java (step 01/09). Prereq: none (entry). Next: refactor-backend-02-module-rename.
 * Verify gate: ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs advance
 *
 * Usage:
 *   node scripts/checklist.mjs            # pretty JSON checklist
 *   node scripts/checklist.mjs --ids      # just the step ids, one per line
 */
const CHECKLIST = {
  skill: "refactor-backend-01-architecture",
  lane: "java",
  step: "01/09",
  prerequisite: null,
  next: "refactor-backend-02-module-rename",
  behaviorPreserving: true,
  editScope: ["pom.xml/build.gradle", "*.yml|*.yaml|*.properties path refs", "java package/import lines"],
  steps: [
    { id: "survey", title: "Inventory all module build files and per-module dependency baselines", done_when: "inventory table complete; external-parent status known" },
    { id: "classify", title: "Assign every leaf to a layer container by name pattern (deps as tiebreak)", done_when: "each module has a target and a recorded signal; ambiguities flagged NEEDS-DECISION" },
    { id: "absorb", title: "Fold tiny domains (<=2 leaves, single coupling, no standalone app) into their host domain", done_when: "absorptions listed with justification" },
    { id: "confirm", title: "Present the full move plan and wait for explicit approval (backup/clean-git reminded)", done_when: "user approved; zero filesystem changes before this" },
    { id: "skeleton-move", title: "Create aggregator POMs top-down, move leaves, fix parents, delete emptied dirs", done_when: "every leaf present exactly once; old directories gone" },
    { id: "root-pom", title: "Generate self-contained root build: classify deps (internal/in-house/third-party), BOM imports, dependencyManagement, strip redundant leaf versions", done_when: "project resolves with no out-of-repo parent" },
    { id: "compile-loop", title: "Import pre-scan, full compile, per-category diagnosis (incl. renamed artifacts), root-first fixes, per-module recompile vs baseline", done_when: "0 compile errors; package -DskipTests succeeds; baselines show nothing lost" },
    { id: "start-check", title: "Optionally boot a composition module and triage start failures", done_when: "started, or recorded as skipped (no infrastructure)" },
    { id: "report-advance", title: "Fill templates/output.md Part B and advance the harness verify gate", done_when: "report emitted; orchestrate.mjs advance passed (blocks on legal/drift deltas)" },
  ],
};

if (process.argv.includes("--ids")) {
  process.stdout.write(CHECKLIST.steps.map((s) => s.id).join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(CHECKLIST, null, 2) + "\n");
}
