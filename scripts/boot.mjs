#!/usr/bin/env node
/**
 * refactor-chain — SessionStart hook. Dormant unless useful.
 * (1) If a chain is active in the project, print a calm resume banner.
 * (2) Self-check: warn once if the plugin path contains a space (the known
 *     hook-space bug can veto tools). Never throws; always exits 0.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

try {
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const stateFile = join(cwd, ".refactor-chain", "state.json");
  const notes = [];

  const root = process.env.CLAUDE_PLUGIN_ROOT || dirname(dirname(fileURLToPath(import.meta.url)));
  if (/\s/.test(root)) notes.push(`⚠️ refactor-chain plugin path contains a space (${root}). Hooks may be vetoed — install under a space-free path.`);

  if (existsSync(stateFile)) {
    const s = JSON.parse(readFileSync(stateFile, "utf8"));
    const cur = s.steps?.[s.cursor];
    notes.push(`refactor-chain has a paused run here: phase ${s.phase}, step ${s.cursor + 1}/${s.steps.length}${cur ? ` (${cur.skill})` : ""}. Say "/refactor-resume" to pick it back up, or "/refactor-stop" to park it.`);
  }

  // project memory (written by memory-capture.mjs at SessionEnd): inject a one-line recall
  const memFile = join(cwd, ".refactor-chain", "memory", "sessions.jsonl");
  if (existsSync(memFile)) {
    try {
      const lines = readFileSync(memFile, "utf8").trim().split("\n");
      const last = JSON.parse(lines[lines.length - 1]);
      const bits = [];
      if (last.lastRun) bits.push(`last refactor-chain run: ${last.lastRun.lane} lane, ${last.lastRun.outcome}`);
      if (last.flagged?.length) bits.push(`${last.flagged.length} parked scope-drift item(s) awaiting attention`);
      if (bits.length) notes.push(`refactor-chain memory: ${bits.join("; ")} (verify against the live repo before relying on it).`);
    } catch { /* unreadable memory is silently ignored */ }
  }
  if (notes.length) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: notes.join("\n") } }) + "\n");
} catch { /* never break session start */ }
process.exit(0);
