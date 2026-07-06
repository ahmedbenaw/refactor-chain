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
  // A chain may only be declared "done" once its review-gate step has VERIFIABLY passed
  // (status "done"). Don't key on phase strings: `phase:"done"` is never set by the harness
  // (dead), and `phase:"docs"` is only reached AFTER the gate step is done — so gate the
  // stop on the gate step itself. A `blocked` run is a legitimate, user-surfaced stop.
  const steps = Array.isArray(s.steps) ? s.steps : [];
  const gateStep = steps.find((st) => st && st.kind === "gate");
  const gatePassed = !!gateStep && gateStep.status === "done";
  // Approve when: the run is a legitimate blocked stop, OR there is no real gated chain
  // to protect (no gate step), OR the gate step has verifiably passed. Only a real,
  // gate-pending chain blocks — the phase string can no longer wave a run through.
  if (s.health === "blocked" || !gateStep || gatePassed) approve();

  const cur = steps[s.cursor];
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: `refactor-chain is still running here (phase ${s.phase}, step ${(s.cursor ?? 0) + 1}/${steps.length}${cur ? `, ${cur.skill}` : ""}). Finish the chain through its review gate — or run \`/refactor-stop\` to park it safely — before wrapping up.`,
  }) + "\n");
  process.exit(0);
} catch { approve(); } // never trap the user in a stop loop on error
