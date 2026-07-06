#!/usr/bin/env node
// S-C9 — veteran non-regression + back-compat (in-flight runs across the v4.7.0 update).
//  (1) The lane chains are byte-identical to v4.6.6 (lanes.mjs extraction changed nothing).
//  (2) A LEGACY board.json (v4.6.6 shape: inline lensResults, no reviewLoop, no per-lens dir) still
//      aggregates through the new union path.
//  (3) A legacy state.json (v3, no reviewLoop) still drives status/conduct without error.
import { execFile } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { laneChain } from "../scripts/lib/lanes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ORCH = join(HERE, "..", "scripts", "orchestrate.mjs");
let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };
const run = (args) => new Promise((res) => { execFile(process.execPath, [ORCH, ...args], (e, o) => { let j = null; try { j = JSON.parse(o); } catch { /* */ } res({ code: e ? e.code || 1 : 0, json: j }); }); });

// ---- (1) frozen v4.6.6 lane chains ----
const FROZEN = {
  backend: ["refactor-backend-01-architecture", "refactor-backend-02-module-rename", "refactor-backend-03-dao-model", "refactor-backend-04-service", "refactor-backend-05-controller", "refactor-backend-06-dependency-guard", "refactor-backend-07-api-naming", "refactor-backend-08-common-extract", "refactor-backend-09-code-optimize", "refactor-code-principles"],
  web: ["refactor-web-01-structure", "refactor-web-02-modules", "refactor-web-03-components", "refactor-web-04-layout", "refactor-web-05-naming", "refactor-code-principles"],
  code: ["refactor-code-principles"],
};
for (const [lane, steps] of Object.entries(FROZEN))
  t(`lane chain byte-identical to v4.6.6: ${lane}`, JSON.stringify(laneChain({ lane }).steps) === JSON.stringify(steps), laneChain({ lane }).steps);
t("ui lane (desktop) frozen", JSON.stringify(laneChain({ lane: "ui" }).steps) === JSON.stringify(["refactor-ui-tokens", "refactor-ui-visual", "refactor-ui-components", "refactor-ui-a11y", "refactor-code-principles"]), laneChain({ lane: "ui" }).steps);
t("debug lane frozen (single fix, no principles)", JSON.stringify(laneChain({ lane: "debug", case: "code-memory" }).steps) === JSON.stringify(["refactor-code-memory"]), laneChain({ lane: "debug", case: "code-memory" }).steps);

await (async () => {
  // ---- (2) a LEGACY v4.6.6 board.json still aggregates (inline lensResults, no reviewLoop) ----
  const d = mkdtempSync(join(tmpdir(), "rc-legacy-"));
  mkdirSync(join(d, ".refactor-chain"), { recursive: true });
  const legacyBoard = {
    version: 1,
    rounds: [{
      round: 1, seed: 0, lensIds: ["harness"], at: "2026-01-01T00:00:00Z",
      lensResults: [{ lens: "harness", findings: [{ where: "x.mjs:1", cause: "legacy finding", severity: "blocker", confidence: 0.9, fix: "fix it" }], verdicts: [{ i: 0, verdict: "CONFIRMED" }] }],
      ledger: null,
    }],
  };
  writeFileSync(join(d, ".refactor-chain", "board.json"), JSON.stringify(legacyBoard));
  const agg = await run(["board-aggregate", "--target", d, "--partial"]);
  t("legacy board.json (inline lensResults) still aggregates", agg.json?.ok === true && agg.json.total === 1 && agg.json.list?.[0]?.where === "x.mjs:1", agg.json);
  const st = await run(["board-status", "--target", d]);
  t("legacy board-status reads the inline lens", (st.json?.recordedLenses || []).includes("harness"), st.json);

  // ---- (3) a legacy v3 state.json (no reviewLoop) still drives status + conduct ----
  const d2 = mkdtempSync(join(tmpdir(), "rc-legacy2-"));
  mkdirSync(join(d2, ".refactor-chain"), { recursive: true });
  writeFileSync(join(d2, ".refactor-chain", "state.json"), JSON.stringify({
    version: 3, target: d2, mode: "ask", phase: "lane", cursor: 0, health: "ok",
    diagnosis: { lane: "code", case: "code", confidence: 0.8, inScope: true },
    steps: [{ skill: "refactor-code-principles", kind: "step", status: "pending" }, { skill: "refactor-review-gate", kind: "gate", status: "pending" }],
  }));
  const sst = await run(["status", "--target", d2]);
  t("legacy v3 state.json still loads in status", sst.json?.active === true, sst.json);
  const cond = await run(["conduct", "--target", d2]);
  t("conduct works on a legacy state (no reviewLoop field)", cond.json?.ok === true && cond.json.spine?.length > 0, cond.json && Object.keys(cond.json));
})();

console.log(`\n${fail === 0 ? "✅" : "❌"} backcompat: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
