#!/usr/bin/env node
/**
 * refactor-backend-02-module-rename — prints this skill's step checklist as JSON.
 * Zero-dependency. Lane: backend (step 02/09). Prereq: refactor-backend-01-architecture. Next: refactor-backend-03-dao-model.
 * Verify gate: ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs advance
 *
 * Usage:
 *   node scripts/checklist.mjs            # pretty JSON checklist
 *   node scripts/checklist.mjs --ids      # just the step ids, one per line
 */
const CHECKLIST = {
  skill: "refactor-backend-02-module-rename",
  lane: "backend",
  step: "02/09",
  prerequisite: "refactor-backend-01-architecture",
  next: "refactor-backend-03-dao-model",
  behaviorPreserving: true,
  idempotent: true,
  exampleMapping: [
    { old: "{module}-server", new: "{module}-controller" },
    { old: "{module}-server-com", new: "{module}-service" },
  ],
  orderingRules: ["depended-upon-first", "longest-match-first", "exact-artifactId-match", "adapter-exclusions"],
  steps: [
    { id: "mapping", title: "Confirm or propose the old->new rename pairs (project-chosen)", done_when: "mapping agreed; {module} expansion enumerated" },
    { id: "scan-skip", title: "Scan capability containers; mark already-renamed/absent modules as skips", done_when: "idempotence table complete; old+new both present raises a question, not a rename" },
    { id: "plan-confirm", title: "Emit the rename plan with order, skips, and adapter exclusions; wait for approval", done_when: "explicit user approval; never runs silently" },
    { id: "rename-dirs", title: "Rename directories depended-upon-first (service before controller)", done_when: "no intermediate state references a name missing on disk" },
    { id: "pom-propagation", title: "Update own artifactId, container <modules>, root dependencyManagement, all <dependency> refs (exact match, longest first)", done_when: "adapters' own identity untouched; their refs updated" },
    { id: "package-rewrite", title: "Rewrite package/import lines (longest-first, exclusions honored) and move source dirs to match", done_when: "package == path in renamed modules; project-wide imports consistent" },
    { id: "config-check", title: "Check path-bearing config keys; leave registered service name unchanged", done_when: "mapper-location-style paths verified; service discovery unaffected" },
    { id: "verify", title: "Run V1-V8: residue greps empty, compile passes", done_when: "zero old-name residue; BUILD SUCCESS" },
    { id: "report-advance", title: "Fill templates/output.md Part B and advance the harness verify gate", done_when: "report emitted; orchestrate.mjs advance passed (blocks on legal/drift deltas)" },
  ],
};

if (process.argv.includes("--ids")) {
  process.stdout.write(CHECKLIST.steps.map((s) => s.id).join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(CHECKLIST, null, 2) + "\n");
}
