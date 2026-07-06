#!/usr/bin/env node
// Async model + hook interaction (C6):
//  (a) ASYNC PROOF — the Conductor engines are synchronous: no Promise.all / await-import /
//      worker_threads fan-out. All concurrency is host-side dispatch of the emitted markers.
//  (b) ship-gate blocks "done" while a review LOOP is mid-flight (and approves once it's done).
//  (c) boot surfaces a paused review loop (resumes cleanly across compaction).
//  (d) a chain-gate-pending run still blocks (veteran behavior preserved).
import { execFile } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = (p) => join(HERE, "..", "scripts", p);
let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- (a) async proof: engines contain no fan-out primitives ----
const engines = ["lib/conductor.mjs", "lib/review-loop.mjs", "lib/skill-registry.mjs", "lib/spec-kit.mjs", "lib/lanes.mjs"];
for (const e of engines) {
  const src = readFileSync(S(e), "utf8");
  const hasFanout = /Promise\.all|Promise\.race|worker_threads|await\s+import\(|new\s+Worker/.test(src);
  t(`engine is synchronous (no fan-out): ${e}`, !hasFanout, e);
}

// ---- hook helpers ----
const hook = (script, projectDir) => new Promise((res) => {
  execFile(process.execPath, [S(script)], { env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir } }, (err, stdout) => {
    let json = null; try { json = JSON.parse(stdout); } catch { /* */ }
    res({ code: err ? err.code || 1 : 0, json, stdout });
  });
});
const setup = () => { const d = mkdtempSync(join(tmpdir(), "rc-hook-")); mkdirSync(join(d, ".refactor-chain"), { recursive: true }); return d; };
const writeBoard = (d, obj) => writeFileSync(join(d, ".refactor-chain", "board.json"), JSON.stringify(obj));
const writeState = (d, obj) => writeFileSync(join(d, ".refactor-chain", "state.json"), JSON.stringify(obj));

await (async () => {
  // ---- (b) ship-gate: pending review loop blocks "done" ----
  const d1 = setup();
  writeBoard(d1, { version: 1, rounds: [], reviewLoop: { rounds: 1, dryRounds: 0, floor: 3, done: false } });
  const sgPending = await hook("ship-gate.mjs", d1);
  t("ship-gate BLOCKS done while a review loop is pending", sgPending.json?.decision === "block" && /review loop/.test(sgPending.json.reason), sgPending.json);

  const d2 = setup();
  writeBoard(d2, { version: 1, rounds: [], reviewLoop: { rounds: 3, dryRounds: 2, floor: 3, done: true } });
  const sgDone = await hook("ship-gate.mjs", d2);
  t("ship-gate APPROVES once the loop is done", sgDone.json?.decision === "approve", sgDone.json);

  const d3 = setup(); // dormant: no state, no loop
  const sgDormant = await hook("ship-gate.mjs", d3);
  t("ship-gate dormant with nothing to protect", sgDormant.json?.decision === "approve", sgDormant.json);

  // ---- (d) veteran: a chain with an unpassed gate step still blocks ----
  const d4 = setup();
  writeState(d4, { target: d4, phase: "gate", cursor: 0, health: "ok", steps: [{ skill: "refactor-review-gate", kind: "gate", status: "pending" }] });
  const sgChain = await hook("ship-gate.mjs", d4);
  t("ship-gate still blocks a gate-pending chain (veteran preserved)", sgChain.json?.decision === "block" && /still running/.test(sgChain.json.reason), sgChain.json);

  // ---- (c) boot surfaces the paused loop ----
  const b1 = await hook("boot.mjs", d1);
  const ctx = b1.json?.hookSpecificOutput?.additionalContext || "";
  t("boot surfaces the paused review loop", /review loop in progress/.test(ctx), ctx.slice(0, 120));
  const b3 = await hook("boot.mjs", d3);
  t("boot stays quiet when nothing is paused", (b3.stdout || "").trim() === "", b3.stdout);
})();

console.log(`\n${fail === 0 ? "✅" : "❌"} async-hooks: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
