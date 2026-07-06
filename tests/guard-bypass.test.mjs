#!/usr/bin/env node
// Guard-bypass matrix (C4): every attempt to slip past a Conductor guard must fail.
//   1. `conduct` must NOT mutate state.steps (single-writer invariant preserved).
//   2. `review-loop-aggregate --final` must refuse a final verdict below the >=3 floor (--force-final overrides).
//   3. `spec-kit` must not emit AUTO-run markers without the .specify signal (even in autopilot).
import { execFile, spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ORCH = join(HERE, "..", "scripts", "orchestrate.mjs");
let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

const run = (args) => new Promise((res) => {
  execFile(process.execPath, [ORCH, ...args], { cwd: HERE }, (err, stdout) => {
    let json = null; try { json = JSON.parse(stdout); } catch { /* */ }
    res({ code: err ? err.code || 1 : 0, json, stdout });
  });
});
const record = (target, payload) => new Promise((res) => {
  const p = spawn(process.execPath, [ORCH, "review-loop-record", "--target", target]);
  let out = ""; p.stdout.on("data", (d) => (out += d));
  p.on("close", () => { let json = null; try { json = JSON.parse(out); } catch { /* */ } res(json); });
  p.stdin.write(JSON.stringify(payload)); p.stdin.end();
});

const target = mkdtempSync(join(tmpdir(), "rc-guard-"));
writeFileSync(join(target, "package.json"), JSON.stringify({ name: "t", version: "1.0.0" }));
writeFileSync(join(target, "index.js"), "function a(){return 1} function b(){return 1}\n");
const stateFile = join(target, ".refactor-chain", "state.json");

await (async () => {
  // ---- GUARD 1: conduct is read-only w.r.t. state.steps ----
  const init = await run(["init", "--target", target, "--utterance", "refactor and tidy this module, reduce duplication", "--lane", "code", "--mode", "autopilot"]);
  t("init created a run", init.json?.ok === true && Array.isArray(init.json.steps), init.json);
  const before = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : "";
  const cond = await run(["conduct", "--target", target]);
  t("conduct emits a plan", cond.json?.ok === true && cond.json.spine && cond.json.dispatch, cond.json && Object.keys(cond.json));
  const after = existsSync(stateFile) ? readFileSync(stateFile, "utf8") : "";
  t("BYPASS BLOCKED: conduct did not mutate state.json", before === after, { changed: before !== after });

  // ---- GUARD 2: review-loop-aggregate --final refuses below the >=3 floor ----
  const plan = await run(["review-loop-plan", "--target", target, "--lenses", "harness", "--seed", "1"]);
  t("review-loop-plan started round 1", plan.json?.ok === true && plan.json.round >= 1, plan.json);
  await record(target, { lens: "harness", findings: [{ where: "index.js:1", cause: "dupe", severity: "worth-fixing", confidence: 0.8 }], verdicts: [] });
  const early = await run(["review-loop-aggregate", "--target", target, "--final"]);
  t("BYPASS BLOCKED: --final refused at rounds=1 (< floor 3)", early.code === 2 && /incomplete/.test(early.json?.blocked || ""), { code: early.code, blocked: early.json?.blocked });
  const forced = await run(["review-loop-aggregate", "--target", target, "--final", "--force-final"]);
  t("override works: --force-final aggregates deliberately", forced.json?.ok === true && forced.json.loopComplete === true, forced.json);
  t("history + artifacts written on completion", forced.json?.artifactsWritten === true && existsSync(join(target, ".refactor-chain", "SPEC.md")) && existsSync(join(target, ".refactor-chain", "history.jsonl")), null);

  // ---- GUARD 3: spec-kit does not auto-run without the .specify signal ----
  const sk = await run(["spec-kit", "--target", target, "--phases", "gate", "--mode", "autopilot"]);
  t("BYPASS BLOCKED: no .specify → autopilot downgraded to confirm", sk.json?.detected === false && sk.json.sequence[0].run === "confirm", sk.json);
})();

console.log(`\n${fail === 0 ? "✅" : "❌"} guard-bypass: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
