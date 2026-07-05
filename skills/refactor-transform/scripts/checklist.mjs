#!/usr/bin/env node
/**
 * refactor-transform — prints this skill's step checklist as JSON.
 * Zero dependencies. Part of the refactor-chain bundle.
 *
 * Usage:
 *   node checklist.mjs           # pretty JSON
 *   node checklist.mjs --compact # single-line JSON
 *
 * This skill is the behavior-preserving applier: checkpoint -> apply smallest
 * transform -> verify identical -> advance, or self-heal/roll back. It ties into
 * orchestrate.mjs (checkpoint / advance / fail / heal).
 */

const HARNESS = "~/.claude/skills/refactor-chain/scripts/orchestrate.mjs";

const checklist = {
  skill: "refactor-transform",
  phase: "do-the-work (executor)",
  prerequisite: "refactor-safety-net (GREEN baseline) + an approved behavior-preserving step",
  editsCode: true,
  behaviorPreserving: true,
  maxRetries: 3,
  harness: HARNESS,
  safeTransforms: [
    "rename", "extract", "inline", "move",
    "introduce-seam", "change-signature-behavior-preserving", "replace-with-equivalent",
  ],
  preconditions: [
    "GREEN baseline exists (NEVER transform on a red repo)",
    "step is approved and behavior-preserving (a kind in the catalog)",
  ],
  steps: [
    { n: 1, id: "precond", title: "Check hard preconditions",
      detail: "Green baseline + approved behavior-preserving step, else STOP." },
    { n: 2, id: "checkpoint", title: "Checkpoint (rollback point)",
      cmd: "orchestrate.mjs checkpoint --label <step> --target <dir>" },
    { n: 3, id: "apply", title: "Apply the SMALLEST transform",
      detail: "One transform, nothing else. No bundled or opportunistic edits." },
    { n: 4, id: "verify", title: "Verify behavior identical",
      detail: "Re-run baseline; pass-set must equal baseline. Only legal import/path churn allowed." },
    { n: 5, id: "decide", title: "Advance or heal",
      detail: "Identical => advance --delta legal. Drift => fail --reason => self-heal/rollback (<=3)." },
    { n: 6, id: "repeat", title: "Repeat per approved step",
      detail: "One transform per checkpoint; never batch two behavior-changing edits." },
  ],
  legalVsDrift: {
    legal: "import/path churn the transform itself forced",
    drift: "any assertion-level difference (a test flips / new failure / changed value)",
    forbidden: "editing a test to match changed behavior (hides drift) — roll back instead",
  },
  onExhaustedRetries: "block; leave repo GREEN at last checkpoint; surface to human",
  signal: { step: "<id>", result: "advanced|healed|blocked", delta: "legal|drift", attempts: "<n>", checkpoint: "<label>" },
};

const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
