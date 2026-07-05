#!/usr/bin/env node
/**
 * refactor-understand — prints this skill's step checklist as JSON.
 * Zero-dependency. Phase: understand (entry). Next: refactor-diagnose.
 *
 * Usage:
 *   node scripts/checklist.mjs            # pretty JSON checklist
 *   node scripts/checklist.mjs --ids      # just the step ids, one per line
 */
const CHECKLIST = {
  skill: "refactor-understand",
  phase: "understand",
  prerequisite: null,
  next: "refactor-diagnose",
  readOnly: true,
  harness: "~/.claude/skills/refactor-chain/scripts/diagnose.mjs signals --target <dir>",
  steps: [
    { id: "signals", title: "Collect read-only signals via the harness", done_when: "signals JSON captured for the target dir" },
    { id: "manifests", title: "Read manifests to name language + stack", done_when: "language(s) and framework identified" },
    { id: "lockfiles", title: "Confirm package manager from the lockfile present", done_when: "manager confirmed by lockfile, not manifest alone" },
    { id: "build-cmds", title: "Read CI/Makefile/scripts for real build/test/lint commands", done_when: "exact command strings recorded" },
    { id: "structure", title: "Map top-level folders + entry points; detect monorepo", done_when: "source/test roots and monorepo flag known" },
    { id: "tests", title: "Determine test framework + whether tests exist at all", done_when: "hasTests + testFramework recorded; safety-net gate flagged if none" },
    { id: "profile", title: "Fill templates/output.md into a Project Profile", done_when: "no field left blank; profile handed to refactor-diagnose" },
  ],
};

if (process.argv.includes("--ids")) {
  process.stdout.write(CHECKLIST.steps.map((s) => s.id).join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(CHECKLIST, null, 2) + "\n");
}
