#!/usr/bin/env node
/**
 * refactor-board — prints the board protocol checklist as JSON so the host has the
 * exact command sequence in front of it. Zero deps. Reads the live lens roster from
 * the harness personas registry when available, so the checklist never drifts from
 * the code.
 *
 *   node checklist.mjs            -> the ordered protocol + default lenses
 *   node checklist.mjs --lenses architecture,harness  -> scope to a subset
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };

// Try the installed harness registry first, then the repo-relative path.
const HERE = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(process.env.HOME || "", ".claude", "skills", "refactor-chain", "scripts", "lib", "personas.mjs"),
  join(HERE, "..", "..", "..", "scripts", "lib", "personas.mjs"),
];
let LENSES = ["architecture", "harness", "correctness", "security", "docs-truth"];
for (const p of candidates) {
  try { readFileSync(p); const mod = await import(`file://${p}`); if (mod.LENSES) { LENSES = mod.LENSES.map((l) => l.id); break; } } catch { /* try next */ }
}

const lenses = opt("lenses") ? opt("lenses").split(",").map((s) => s.trim()).filter(Boolean) : LENSES;

const checklist = {
  capability: "refactor-board",
  lenses,
  protocol: [
    { step: 1, name: "plan", cmd: "orchestrate.mjs board-plan --target <dir> [--lenses a,b] [--seed N]", produces: "finder prompts per lens (persona + rubric + contract baked in)" },
    { step: 2, name: "dispatch-finders", how: "spawn one subagent per lens with its finderPrompt (parallel on Claude Code, sequential on Codex)", produces: "findings[] per lens" },
    { step: 3, name: "verify-prompts", cmd: "board.mjs verify-prompt --lens <lens> --lenses <all> --seed <N>  (findings on stdin)", produces: "one refute prompt per finding" },
    { step: 4, name: "dispatch-verifiers", how: "spawn a subagent per finding to REFUTE it", produces: "{verdict: CONFIRMED|SUSPECTED|REFUTED} per finding" },
    { step: 5, name: "record", cmd: "orchestrate.mjs board-record --target <dir>  (stdin {lens,findings,verdicts})", produces: "persisted round in board.json" },
    { step: 6, name: "aggregate", cmd: "orchestrate.mjs board-aggregate --target <dir>", produces: "REFUTED dropped; deduped, ranked ledger + decision" },
    { step: 7, name: "present-and-route", how: "calm ranked list, one 'do this first'; offer to fix survivors through the safe pipeline", produces: "go / fix-these-first / no-go" },
  ],
  resume: "orchestrate.mjs board-status --target <dir>  (recorded vs pending lenses, decision)",
  invariants: ["read-only by default", "no finding without file:line", "every finding survives an adversary", "deterministic: same target+lenses+seed reproduces"],
};

process.stdout.write(JSON.stringify(checklist, null, 2) + "\n");
