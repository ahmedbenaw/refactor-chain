#!/usr/bin/env node
/**
 * refactor-chain — SessionEnd hook. Dormant unless this project has
 * refactor-chain state or memory. Captures a compact, durable session note
 * into <project>/.refactor-chain/memory/sessions.jsonl (append-only) so the
 * next session starts with context (boot.mjs injects a summary). Hygiene:
 * only durable facts (active run position, recent retro outcome, flagged
 * scope-drift items) — never transcripts, never secrets. Never throws; exit 0.
 */
import { existsSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

try {
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const base = join(cwd, ".refactor-chain");
  const stateFile = join(base, "state.json");
  const historyFile = join(base, "history.jsonl");
  if (!existsSync(stateFile) && !existsSync(historyFile)) process.exit(0); // dormant

  const note = { at: new Date().toISOString() };
  if (existsSync(stateFile)) {
    try {
      const s = JSON.parse(readFileSync(stateFile, "utf8"));
      note.activeRun = { lane: s.diagnosis?.lane, phase: s.phase, step: `${(s.cursor ?? 0) + 1}/${s.steps?.length ?? "?"}`, health: s.health };
      const drift = (s.steps || []).flatMap((x) => x.notes || []).filter((n) => /scope/i.test(n)).slice(0, 3);
      if (drift.length) note.flagged = drift;
    } catch { /* unreadable state — skip */ }
  }
  if (!note.activeRun && existsSync(historyFile)) {
    try {
      const lines = readFileSync(historyFile, "utf8").trim().split("\n");
      const last = JSON.parse(lines[lines.length - 1]);
      note.lastRun = { lane: last.lane, outcome: last.outcome, at: last.at };
    } catch { /* skip */ }
  }
  if (!note.activeRun && !note.lastRun && !note.flagged) process.exit(0); // nothing durable to say

  const memDir = join(base, "memory");
  if (!existsSync(memDir)) mkdirSync(memDir, { recursive: true });
  appendFileSync(join(memDir, "sessions.jsonl"), JSON.stringify(note) + "\n");
} catch { /* a hook must never break session end */ }
process.exit(0);
