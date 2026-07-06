#!/usr/bin/env node
/**
 * refactor-orchestrate — prints the Conductor protocol checklist as JSON so the host has the
 * exact command sequence in front of it. Zero deps.
 *
 *   node checklist.mjs                 -> the ordered conduct + review-loop protocol
 *   node checklist.mjs --mode careful  -> annotate the run markers for a mode
 */
const argv = process.argv.slice(2);
const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
const mode = opt("mode", "ask");

const checklist = {
  capability: "refactor-orchestrate",
  mode,
  protocol: [
    { step: 1, name: "conduct", cmd: "orchestrate.mjs conduct --target <dir> [--task ID --phase P --caps a,b --lane L]", produces: "spine + chain + perTask + dispatch{parallel,sequential} + fastPath (read-only)" },
    { step: 2, name: "dispatch", how: "run dispatch.parallel[] concurrently (lenses + external skills), dispatch.sequential[] in order (parallel on Claude Code, sequential on Codex)", produces: "the emitted work, fanned out host-side" },
    { step: 3, name: "spec-kit", cmd: "orchestrate.mjs spec-kit --target <dir> [--phases a,b] [--mode M]", produces: "SDD command sequence with run markers (auto only when .specify present)" },
    { step: 4, name: "review-loop-plan", cmd: "orchestrate.mjs review-loop-plan --target <dir> [--review-class] [--lenses a,b]", produces: "a round + finder prompts; loop metadata in board.json.reviewLoop" },
    { step: 5, name: "record", cmd: "orchestrate.mjs review-loop-record --target <dir>  (stdin {lens,findings,verdicts})", produces: "per-lens round file (concurrency-safe)" },
    { step: 6, name: "aggregate", cmd: "orchestrate.mjs review-loop-aggregate --target <dir> [--final]", produces: "round ledger + dry count + shouldContinue; --final refused below the >=3 floor" },
    { step: 7, name: "shape+route", how: "on completion, SPEC.md + sprint-plan.md are written and history.jsonl appended; route survivors through the safe pipeline", produces: "SPEC + sprint plan + go/fix-these-first/no-go" },
  ],
  resume: "orchestrate.mjs review-loop-status --target <dir>  (rounds, dryRounds, shouldContinue)",
  invariants: [
    "composes, never bypasses the veterans",
    "conduct is read-only w.r.t. state.steps",
    "engines synchronous; all parallelism is host-side dispatch",
    "deterministic: same (task, diagnosis, installedSkills, seed) reproduces",
    ">=3 passes for review-class; fast path (single pass) for trivial work",
  ],
};

process.stdout.write(JSON.stringify(checklist, null, 2) + "\n");
