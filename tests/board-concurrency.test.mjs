#!/usr/bin/env node
// Durability proof (C3): two finder records into the SAME round, dispatched CONCURRENTLY, must
// both survive — the per-lens-file write path removes the board.json lost-update race. Also proves
// board-record spread-preserves unknown payload fields.
import { execFile } from "node:child_process";
import { spawn } from "node:child_process";
import { mkdtempSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ORCH = join(HERE, "..", "scripts", "orchestrate.mjs");
let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

const run = (args) => new Promise((res) => {
  execFile(process.execPath, [ORCH, ...args], (err, stdout) => {
    let json = null; try { json = JSON.parse(stdout); } catch { /* */ }
    res({ code: err ? err.code || 1 : 0, json, stdout });
  });
});
const record = (target, payload) => new Promise((res) => {
  const p = spawn(process.execPath, [ORCH, "board-record", "--target", target]);
  let out = ""; p.stdout.on("data", (d) => (out += d));
  p.on("close", () => { let json = null; try { json = JSON.parse(out); } catch { /* */ } res(json); });
  p.stdin.write(JSON.stringify(payload)); p.stdin.end();
});

const target = mkdtempSync(join(tmpdir(), "rc-conc-"));

await (async () => {
  const plan = await run(["board-plan", "--target", target, "--seed", "1"]);
  t("board-plan starts a round", plan.json?.ok === true && plan.json.round === 1, plan.json);

  // Fire TWO records CONCURRENTLY (different lenses) — the race the fix must survive.
  const [a, b] = await Promise.all([
    record(target, { lens: "harness", findings: [{ where: "h:1", cause: "one", severity: "blocker", confidence: 0.9 }], verdicts: [], extra: "keep-me" }),
    record(target, { lens: "correctness", findings: [{ where: "c:2", cause: "two", severity: "worth-fixing", confidence: 0.8 }], verdicts: [] }),
  ]);
  t("both concurrent records returned ok", a?.ok === true && b?.ok === true, { a, b });

  const st = await run(["board-status", "--target", target]);
  const rec = st.json?.recordedLenses || [];
  t("NO LOST LENS: both lenses present after concurrent record", rec.includes("harness") && rec.includes("correctness"), rec);

  // per-lens files exist (the concurrency-safe path), not a single mutated array
  const dir = join(target, ".refactor-chain", "board", "round-1");
  t("per-lens round dir exists", existsSync(dir), dir);
  const files = existsSync(dir) ? readdirSync(dir) : [];
  t("one file per recorded lens", files.length === 2, files);

  // spread-preserve: the unknown `extra` field survived the record
  const harnessFile = join(dir, "harness.json");
  const stored = existsSync(harnessFile) ? JSON.parse(readFileSync(harnessFile, "utf8")) : {};
  t("board-record spread-preserves unknown fields", stored.extra === "keep-me", stored);

  // aggregate (partial — not all planned lenses) still works off the union
  const agg = await run(["board-aggregate", "--target", target, "--partial"]);
  t("aggregate synthesizes from the per-lens union", agg.json?.ok === true && agg.json.total >= 1, agg.json);
  t("aggregated ledger pins its recorded set", Array.isArray(agg.json?.recordedLenses) && agg.json.recordedLenses.includes("harness"), agg.json?.recordedLenses);

  // recording a NEW lens after aggregate marks the ledger stale (union-based staleness)
  await record(target, { lens: "security", findings: [], verdicts: [] });
  const st2 = await run(["board-status", "--target", target]);
  t("a record after aggregate makes the ledger stale again", st2.json?.aggregated === false, st2.json);
})();

console.log(`\n${fail === 0 ? "✅" : "❌"} board-concurrency: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
