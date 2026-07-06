#!/usr/bin/env node
/**
 * refactor-scope-fence — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-scope-fence",
  phase: "do-the-work (standing contract over every executing step)",
  prerequisite: "active chain with a current step (state.json, state.steps[cursor])",
  next: "the step's own verify, then advance",
  fence: "state.steps[cursor].scope = [path prefixes]; guard.mjs emits an advisory ⚑ scope-drift flag on edits matching none of them (substring test) — it never blocks",
  steps: [
    { id: 1, title: "State the fence at step start", do: "Read state.steps[cursor].scope and say it out loud; if a step has no scope, derive one from the plan and record it.", gate: "Scope known before the first edit." },
    { id: 2, title: "Classify every ⚑ flag", do: "Mistake → revert+redo inside fence; Required → checkpoint; Adjacent → revert+park. 'Ignore' is not a class.", gate: "No unclassified flags." },
    { id: 3, title: "Park adjacent problems", do: "Append 'parked: <path> — <what> — <why> [found during step N <skill>]' to the step's notes; never fix silently, even one-character fixes.", gate: "Every parked item is in state notes." },
    { id: 4, title: "Mid-chat checkpoint on real scope pressure", do: "One question with a recommendation: (a) pursue as a properly-scoped NEW step, or (b) park. Silently widening the current step is the forbidden third option.", gate: "User answered; decision recorded." },
    { id: 5, title: "Step-end sweep", do: "List all flags → each reverted/promoted/parked; diff touches only in-scope paths (plus checkpoint-approved widenings); fill the scope ledger.", gate: "Ledger complete before verify/advance." },
  ],
  guardrails: [
    "Diff-preserving: the step's diff matches its declared scope or a recorded checkpoint decision.",
    "The guard flag is advisory — treating it as noise is the failure mode this skill prevents.",
    "Parked items must survive into the write-up (and memory); silently dropped == silently fixed.",
    "The checkpoint is a real user question with a recommendation, never a silent default.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
