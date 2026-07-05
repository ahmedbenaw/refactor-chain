#!/usr/bin/env node
/**
 * refactor-web-01-structure — prints the structure-audit checklist as JSON.
 * Zero-dependency. Phase: do-the-work (web lane, step 01 of 05).
 * Framework-adaptive: vocabulary comes from the harness signals registry
 * (refactor-chain/scripts/lib/signals.mjs via diagnose.mjs), never guessed.
 *
 * Usage:
 *   node scripts/checklist.mjs          # pretty JSON checklist
 *   node scripts/checklist.mjs --ids    # just the step ids, one per line
 */
const CHECKLIST = {
  skill: "refactor-web-01-structure",
  phase: "do-the-work (web lane 01/05)",
  prerequisite: "green baseline (refactor-safety-net)",
  next: "refactor-web-02-modules",
  editsCode: true,
  behaviorPreserving: true,
  frameworkAdaptive: ["react", "next", "vue", "svelte", "angular", "react-native"],
  rules: {
    "STR-01": { rule: "layer completeness — no grab-bag dirs", severity: "blocker" },
    "STR-02": { rule: "assets split styles/icons/images + token variables file", severity: "warning" },
    "STR-03": { rule: "shared components tiered common/layout/business", severity: "blocker" },
    "STR-04": { rule: "composite components foldered with an entry file", severity: "warning" },
    "STR-05": { rule: "framework layer split by concern (router/store/plugins/directives/config)", severity: "warning" },
    "STR-06": { rule: "services split http/ (client) + api/ (shared endpoints)", severity: "warning" },
    "STR-07": { rule: "shared-logic files export useXxx; one filename convention per repo", severity: "blocker" },
    "STR-08": { rule: "allowed-imports matrix — dependencies only flow downward", severity: "blocker" },
  },
  importMatrix: {
    features: ["components", "hooks", "services", "utils", "types"],
    components: ["components", "hooks", "services", "utils", "types"],
    hooks: ["hooks", "services", "utils", "types"],
    services: ["services", "utils", "types"],
    utils: ["utils", "types"],
    framework: ["components", "hooks", "services", "utils", "types", "features:route-registration-only"],
    forbidden: ["components->features", "utils->features", "services->features", "featureA->featureB-internals"],
  },
  steps: [
    { id: "detect", title: "Detect framework via diagnose.mjs; adopt its vocabulary (hooks vs composables, router/store equivalents)", done_when: "framework signal read; vocabulary map chosen" },
    { id: "scan", title: "Inventory src/ against the reference layers", done_when: "every dir/file mapped to a layer or flagged" },
    { id: "audit", title: "Evaluate STR-01..STR-08 (imports resolved through alias config)", done_when: "each rule pass/fail with evidence paths" },
    { id: "report", title: "Fill templates/output.md with findings + fixes, blockers first", done_when: "report delivered" },
    { id: "plan-moves", title: "Draft confirmation-gated move plan with full import-rewrite list; checkpoint via orchestrate.mjs", done_when: "user explicitly confirmed; checkpoint recorded" },
    { id: "execute", title: "Move in small batches; rewrite every import; type-check per batch", done_when: "all batches applied; build resolves" },
    { id: "scaffold", title: "(On request) generate compliant skeleton incl. token variables file; self-check with the same rules", done_when: "fresh audit of generated tree is clean" },
    { id: "verify", title: "Re-run baseline; advance the harness gate", done_when: "identical pass-set; orchestrate.mjs advance succeeded" },
  ],
};

if (process.argv.includes("--ids")) {
  process.stdout.write(CHECKLIST.steps.map((s) => s.id).join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(CHECKLIST, null, 2) + "\n");
}
