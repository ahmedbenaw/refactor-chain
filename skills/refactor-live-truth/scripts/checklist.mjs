#!/usr/bin/env node
/**
 * refactor-live-truth — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-live-truth",
  phase: "understand / diagnose / verify (standing contract)",
  prerequisite: "none — always on",
  next: "whatever phase the verified fact feeds",
  rule: "never assert a system fact from memory/docs/README/comments — verify against the live repo, config, or command output first",
  ladder: [
    "1 command output (run now)",
    "2 live config / lockfile",
    "3 live code",
    "4 generated artifacts",
    "5 code comments",
    "6 README / docs / wiki",
    "7 memory / recollection (chain memory included)",
  ],
  steps: [
    { id: 1, title: "Catch the claim", do: "Name any doc/comment/memory-sourced system fact as a CLAIM before it drives an edit, plan line, or verdict.", gate: "Claim + source level named." },
    { id: 2, title: "Pick the live witness", do: "Choose the highest-ladder witness: run the command, read the config, grep the code — now, in this session.", gate: "Witness is live and higher-ranked than the claim's source." },
    { id: 3, title: "Verify, then speak", do: "Check the witness; only then let the fact drive the action. Record file+line or command+output.", gate: "Every load-bearing fact has a named, current witness." },
    { id: 4, title: "On divergence, repo wins", do: "Act on the live source; flag the stale doc/comment/note as a PARKED item (scope-fence) — never silently fix it.", gate: "Divergences appear in step notes as parked items." },
    { id: 5, title: "Re-verify recalled memory", do: "Boot-banner / sessions.jsonl notes are pointers: check state.json, history.jsonl, or the code before acting on them.", gate: "No remembered fact acted on unverified." },
  ],
  guardrails: [
    "Edits nothing itself; blocks actions resting on unverified claims.",
    "Checks expire when edits could change their answer — re-check after relevant edits.",
    "Stale docs are parked, not fixed mid-step.",
    "'I didn't verify this' is always legal; a fabricated verification never is.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
