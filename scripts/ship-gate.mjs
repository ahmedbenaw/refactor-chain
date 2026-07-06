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

const block = (reason) => { process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n"); process.exit(0); };
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };

try {
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const stateFile = join(cwd, ".refactor-chain", "state.json");
  const boardFile = join(cwd, ".refactor-chain", "board.json");

  // (v4.7.0) A mid-flight review LOOP also blocks "done" — declaring a run finished while a
  // background review-loop round is still pending is the same "done before it's reviewed" lie the
  // chain gate prevents. The loop is done only when review-loop-aggregate --final (or --force-final)
  // or review-loop-abort marked it so.
  const board = existsSync(boardFile) ? readJson(boardFile) : null;
  const loopPending = !!(board && board.reviewLoop && !board.reviewLoop.done);

  const s = existsSync(stateFile) ? readJson(stateFile) : null;
  if (!s && !loopPending) approve(); // dormant: neither a gated chain nor a live loop to protect

  // A `blocked` chain is a legitimate, user-surfaced stop — never trap the user in a stop loop.
  if (s && s.health === "blocked") approve();

  // Chain gate: a chain may only be "done" once its review-gate step has VERIFIABLY passed
  // (status "done"). Don't key on phase strings (`phase:"done"` is dead; `phase:"docs"` is only
  // reached AFTER the gate step is done) — gate the stop on the gate step itself.
  if (s) {
    const steps = Array.isArray(s.steps) ? s.steps : [];
    const gateStep = steps.find((st) => st && st.kind === "gate");
    const gatePassed = !!gateStep && gateStep.status === "done";
    if (gateStep && !gatePassed) {
      const cur = steps[s.cursor];
      block(`refactor-chain is still running here (phase ${s.phase}, step ${(s.cursor ?? 0) + 1}/${steps.length}${cur ? `, ${cur.skill}` : ""}). Finish the chain through its review gate — or run \`/refactor-stop\` to park it safely — before wrapping up.`);
    }
  }
  if (loopPending) {
    block(`a refactor-chain review loop is mid-flight here (round ${board.reviewLoop.rounds ?? "?"}, ${board.reviewLoop.dryRounds ?? 0} dry). Finish it (\`review-loop-aggregate --final\`) or park it (\`review-loop-abort\`) before wrapping up.`);
  }
  approve();
} catch { approve(); } // never trap the user in a stop loop on error
