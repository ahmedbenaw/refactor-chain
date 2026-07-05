#!/usr/bin/env node
/**
 * refactor-chain — Stop hook. Dormant unless a chain is active. If a chain is
 * mid-flight (not yet through the review gate / not done), it blocks the "done"
 * narrative so the run can't be declared finished before it's verified and
 * reviewed. Never throws; defaults to approve.
 *
 * Output: {"decision":"approve|block","reason":"..."}
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const approve = () => { process.stdout.write(JSON.stringify({ decision: "approve" }) + "\n"); process.exit(0); };

try {
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const stateFile = join(cwd, ".refactor-chain", "state.json");
  if (!existsSync(stateFile)) approve(); // dormant

  const s = JSON.parse(readFileSync(stateFile, "utf8"));
  // Blocked runs are a legitimate stop (surfaced to the user); done/docs are fine.
  if (s.health === "blocked" || s.phase === "done" || s.phase === "docs") approve();

  const cur = s.steps?.[s.cursor];
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: `refactor-chain is still running here (phase ${s.phase}, step ${s.cursor + 1}/${s.steps.length}${cur ? `, ${cur.skill}` : ""}). Finish the chain through its review gate — or run \`/refactor-stop\` to park it safely — before wrapping up.`,
  }) + "\n");
  process.exit(0);
} catch { approve(); } // never trap the user in a stop loop on error
