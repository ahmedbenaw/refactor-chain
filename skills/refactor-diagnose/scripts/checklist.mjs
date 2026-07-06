#!/usr/bin/env node
/**
 * refactor-diagnose — prints this skill's step checklist as JSON.
 * Zero-dependency. Phase: diagnose. Prereq: refactor-understand. Next: plan.
 * Drives ~/.claude/skills/refactor-chain/scripts/diagnose.mjs (classify/signals/scope/matrix/learn).
 *
 * Usage:
 *   node scripts/checklist.mjs            # pretty JSON checklist
 *   node scripts/checklist.mjs --ids      # just the step ids, one per line
 */
const CHECKLIST = {
  skill: "refactor-diagnose",
  phase: "diagnose",
  prerequisite: "refactor-understand",
  next: "plan",
  readOnly: true,
  harness: "~/.claude/skills/refactor-chain/scripts/diagnose.mjs classify --target <dir> --utterance \"...\" --mode <careful|autopilot|ask>",
  thresholds: { CONF_MIN: 0.70, FLOOR: 0.35, monorepoCap: 0.55 },
  modes: ["careful", "autopilot", "ask"],
  steps: [
    { id: "profile-ready", title: "Confirm the Project Profile exists (else run refactor-understand)", done_when: "profile available for the target" },
    { id: "classify", title: "Run diagnose.mjs classify with the utterance and mode", done_when: "valid {case,lane,os,platform,confidence,inScope,mode,clarify,redirect,conditional} JSON captured" },
    { id: "scope-gate", title: "If inScope is false, deliver redirect and stop", done_when: "out-of-scope requests are redirected, not shoehorned into a lane" },
    { id: "reason", title: "Run the structured-reasoning frame (evidence → candidates → winner → what could flip it → decision)", done_when: "the five reasoning steps are explicit and inspectable" },
    { id: "mode-logic", title: "Apply mode logic (autopilot ≥0.70 & no clarify → proceed; else present plan)", done_when: "mode decision made; autopilot never used through real ambiguity" },
    { id: "clarify", title: "If clarify present, ask exactly one A/B (or monorepo) question and wait", done_when: "single plain-language question asked; answer feeds the chosen lane" },
    { id: "arm-conditionals", title: "Record armed conditionals (auth / telemetry / dags) for the plan phase", done_when: "conditional add-ons noted" },
    { id: "diagnosis", title: "Fill templates/output.md and hand {case,lane,os,platform,mode,conditional} to plan", done_when: "Diagnosis complete; handoff made" },
  ],
};

if (process.argv.includes("--ids")) {
  process.stdout.write(CHECKLIST.steps.map((s) => s.id).join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(CHECKLIST, null, 2) + "\n");
}
