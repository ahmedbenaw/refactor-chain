#!/usr/bin/env node
/**
 * refactor-memory — checklist + memory reader. Zero deps.
 *   node checklist.mjs                  -> prints the step checklist as JSON
 *   node checklist.mjs --recall <dir>   -> reads <dir>/.refactor-chain/memory/sessions.jsonl and
 *                                          prints note count + the latest note (what boot would use)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILL = "refactor-memory";
const PHASE = "improve/understand";

const STEPS = [
  { id: 1, step: "know-mechanics", detail: "Capture: memory-capture.mjs (SessionEnd) appends to .refactor-chain/memory/sessions.jsonl. Recall: boot.mjs (SessionStart) injects the last note's summary." },
  { id: 2, step: "persistence-filter", detail: "Persist durable decisions, parked items, run outcomes/position. Never transcripts, secrets, personal data, transient chatter." },
  { id: 3, step: "recall-safely", detail: "Every remembered fact is a hint: verify against state.json / history.jsonl / the code before acting (live-truth rule)." },
  { id: 4, step: "inspect", detail: "Use --recall <target> to show the human exactly what is remembered." },
  { id: 5, step: "prune", detail: "Append-only by hook; humans may truncate/delete sessions.jsonl. Offer when stale or on request." },
  { id: 6, step: "report", detail: "Fill templates/output.md (memory audit) when reporting on memory." },
];

function recall(dir) {
  const mf = join(dir, ".refactor-chain", "memory", "sessions.jsonl");
  if (!existsSync(mf)) return { notes: 0, note: "no memory file — the chain has nothing persisted here" };
  const lines = readFileSync(mf, "utf8").trim().split("\n").filter(Boolean);
  let latest = null;
  try { latest = JSON.parse(lines[lines.length - 1]); } catch { latest = { unreadable: true }; }
  return { notes: lines.length, latest, reminder: "verify every recalled fact against the live repo before acting on it" };
}

const argv = process.argv.slice(2);
const ri = argv.indexOf("--recall");
if (ri >= 0) {
  process.stdout.write(JSON.stringify({ skill: SKILL, ...recall(argv[ri + 1] || process.cwd()) }, null, 2) + "\n");
} else {
  process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, steps: STEPS }, null, 2) + "\n");
}
