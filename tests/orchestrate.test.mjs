/**
 * refactor-chain — orchestrate.mjs lifecycle test suite. Builds a temp git
 * repo fixture, drives the full state machine: init → baseline gate →
 * advance/drift → fail×3 → heal → reset → learn validation → doctor.
 * Run: node tests/orchestrate.test.mjs
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const O = join(HERE, "..", "scripts", "orchestrate.mjs");
const D = join(HERE, "..", "scripts", "diagnose.mjs");
const ST = mkdtempSync(join(tmpdir(), "rc-orch-"));
const REPO = join(ST, "repo");

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// run a subcommand, tolerate non-zero exit, always parse stdout JSON
const run = (script, args) => {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* leave null */ }
  return { json, code: r.status, stdout: r.stdout };
};
const orch = (args) => run(O, [...args, "--target", REPO]);
// like run(), but pipes a JSON payload on stdin (for board-record)
const runStdin = (args, input) => {
  const r = spawnSync(process.execPath, [O, ...args, "--target", REPO], { encoding: "utf8", input });
  let json = null; try { json = JSON.parse(r.stdout); } catch { /* leave null */ }
  return { json, code: r.status, stdout: r.stdout };
};

// ---- fixture: temp git repo, web-shaped project ----
mkdirSync(REPO, { recursive: true });
writeFileSync(join(REPO, "package.json"), '{"name":"fix","version":"1.0.0","dependencies":{"react":"^18"},"devDependencies":{"vitest":"^1"}}');
mkdirSync(join(REPO, "src"), { recursive: true });
writeFileSync(join(REPO, "src", "app.jsx"), "export const App = () => null;\n");
const g = (a) => execFileSync("git", a, { cwd: REPO, stdio: "ignore" });
g(["init", "-q"]);
g(["-c", "user.email=t@t", "-c", "user.name=t", "add", "-A"]);
g(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init"]);

// ---- init → phase baseline ----
let r = orch(["init", "--plan-note", "goal: tidy; unknowns: none; success: green; order: lane"]);
t("init ok + web lane", r.json?.ok === true && r.json.lane === "web", r.json);
t("init → phase baseline", r.json?.phase === "baseline", r.json?.phase);
r = orch(["status"]);
t("status active, phase baseline, no baseline yet", r.json?.active === true && r.json.phase === "baseline" && r.json.baseline === false, r.json);
const total = r.json.total;

// ---- advance blocked pre-baseline ----
r = orch(["advance"]);
t("advance blocked pre-baseline", r.json?.ok === false && /baseline/i.test(r.json.blocked || ""), r.json);

// ---- plan-gate ENFORCED: baseline blocks without a plan note ----
{
  const SF = join(REPO, ".refactor-chain", "state.json");
  const st = JSON.parse(readFileSync(SF, "utf8")); const saved = st.planNote; delete st.planNote; writeFileSync(SF, JSON.stringify(st));
  const b = orch(["baseline", "--cmd", "x", "--framework", "vitest"]);
  t("plan-gate blocks baseline without a plan", b.json?.ok === false && /plan-gate/i.test(b.json.blocked || ""), b.json);
  const st2 = JSON.parse(readFileSync(SF, "utf8")); st2.planNote = saved; writeFileSync(SF, JSON.stringify(st2));
}

// ---- baseline unlocks + first step active ----
r = orch(["baseline", "--cmd", "npx vitest run", "--framework", "vitest"]);
t("baseline → phase lane", r.json?.ok === true && r.json.phase === "lane", r.json);
t("baseline names first step", typeof r.json?.firstStep === "string" && r.json.firstStep.length > 0, r.json?.firstStep);
r = orch(["status"]);
t("first step active after baseline", r.json?.steps?.[0]?.status === "active" && r.json.cursor === 0, r.json?.steps?.[0]);

// ---- adversarial-verify ENFORCED: advance without --adversarial is blocked ----
r = orch(["advance", "--delta", "legal", "--note", "no attack pass"]);
t("advance blocked without --adversarial", r.json?.ok === false && /adversarial/i.test(r.json.blocked || ""), r.json);

// ---- advance --delta drift refused ----
r = orch(["advance", "--delta", "drift"]);
t("advance --delta drift refused", r.json?.ok === false && /drift/i.test(r.json.blocked || ""), r.json);
r = orch(["status"]);
t("drift refusal did not move cursor", r.json?.cursor === 0, r.json?.cursor);

// ---- delta allowlist ENFORCED: advancing requires --delta legal explicitly ----
r = orch(["advance", "--adversarial"]); // no --delta at all
t("advance without --delta refused (allowlist, not just !drift)", r.json?.ok === false && /delta legal/i.test(r.json.blocked || ""), r.json);
r = orch(["advance", "--delta", "sideways", "--adversarial"]); // bogus delta
t("advance with bogus --delta refused", r.json?.ok === false && /delta legal/i.test(r.json.blocked || ""), r.json);
r = orch(["status"]);
t("bad-delta refusals did not move cursor", r.json?.cursor === 0, r.json?.cursor);

// ---- fail ×2 → healing (under budget), heal works ----
r = orch(["fail", "--reason", "tests red 1"]);
t("fail 1 → healing", r.json?.status === "healing" && r.json.retries === 1 && r.json.selfHeal === true, r.json);
r = orch(["fail", "--reason", "tests red 2"]);
t("fail 2 → healing", r.json?.status === "healing" && r.json.retries === 2, r.json);
r = orch(["heal"]);
t("heal under budget → attempt 3", r.json?.ok === true && r.json.attempt === 3, r.json);
r = orch(["status"]);
t("status active/ok after in-budget heal", r.json?.health === "ok" && r.json.steps[0].status === "active", { health: r.json?.health, s0: r.json?.steps?.[0]?.status });

// ---- retry ceiling ENFORCED (both ends): 3rd fail blocks; heal AND advance both refuse ----
r = orch(["fail", "--reason", "tests red 3"]);
t("fail 3 → blocked", r.json?.status === "blocked" && r.json.selfHeal === false, r.json);
r = orch(["status"]);
t("status health blocked after 3 fails", r.json?.health === "blocked", r.json?.health);
r = orch(["heal"]);
t("heal refused past retry budget (no attempt 4)", r.json?.ok === false && /budget/i.test(r.json.blocked || ""), r.json);
r = orch(["advance", "--delta", "legal", "--adversarial"]);
t("advance refused on a blocked step", r.json?.ok === false && /blocked/i.test(r.json.blocked || ""), r.json);
r = orch(["status"]);
t("blocked step did not advance", r.json?.cursor === 0 && r.json.steps[0].status === "blocked", r.json?.cursor);

// ---- recover (simulate a human clearing the blocker) to continue the happy path ----
{
  const SF = join(REPO, ".refactor-chain", "state.json");
  const st = JSON.parse(readFileSync(SF, "utf8"));
  st.steps[0].retries = 0; st.steps[0].status = "active"; st.health = "ok";
  writeFileSync(SF, JSON.stringify(st));
}

// ---- a clean advance still works ----
r = orch(["advance", "--delta", "legal", "--adversarial", "--note", "step 1 verified"]);
t("clean advance moves cursor", r.json?.ok === true && r.json.done === false && r.json.progress === `1/${total}`, r.json);

// ---- crash guards: fail/heal past end-of-chain return structured JSON, never crash ----
{
  const SF = join(REPO, ".refactor-chain", "state.json");
  const st = JSON.parse(readFileSync(SF, "utf8")); st.cursor = st.steps.length; st.phase = "docs"; writeFileSync(SF, JSON.stringify(st));
  const f = orch(["fail", "--reason", "end"]);
  t("fail at end-of-chain returns structured block (no crash)", f.json?.ok === false && /complete/i.test(f.json.blocked || ""), f.json);
  const h = orch(["heal"]);
  t("heal at end-of-chain returns structured block (no crash)", h.json?.ok === false && /complete/i.test(h.json.blocked || ""), h.json);
  const st2 = JSON.parse(readFileSync(SF, "utf8")); st2.cursor = 0; st2.phase = "lane"; st2.steps[0].status = "active"; writeFileSync(SF, JSON.stringify(st2));
}

// ---- guidelines gate ENFORCED: cannot leave the review gate without gate-check PASS ----
{
  // drive the (single-step web-ish) chain to its appended review gate
  let guard = 0;
  while (guard++ < 12) {
    const st = orch(["status"]);
    if (!st.json?.active) break;
    if (st.json.current === "refactor-review-gate" && st.json.phase === "gate") break;
    orch(["advance", "--delta", "legal", "--adversarial"]);
  }
  const atGate = orch(["status"]);
  if (atGate.json?.current === "refactor-review-gate") {
    const SF = join(REPO, ".refactor-chain", "state.json");
    // FORGE a cached PASS — the gate must re-run eval FRESH and refuse to trust it (finding B / TOCTOU).
    { const st = JSON.parse(readFileSync(SF, "utf8")); st.guidelines = { gate: "PASS", pass: 99, total: 99, failing: [], at: "forged" }; writeFileSync(SF, JSON.stringify(st)); }
    const blocked = orch(["advance", "--delta", "legal", "--adversarial"]);
    t("gate re-runs eval — a forged cached PASS cannot bypass", blocked.json?.ok === false && /guidelines/i.test(blocked.json.blocked || ""), blocked.json);
    const gc = orch(["gate-check"]);
    t("gate-check returns a gate verdict", gc.json?.gate === "PASS" || gc.json?.gate === "BLOCK", gc.json);
    // a NON-ARRAY guideline-exceptions.json must not crash eval (finding E) — structured verdict, never a parse-null.
    const EX = join(REPO, ".refactor-chain", "guideline-exceptions.json");
    writeFileSync(EX, '{"formatter-config":true}'); // object, not the expected array
    const gc2 = orch(["gate-check"]);
    t("gate-check survives a non-array exceptions file (no crash)", gc2.json?.gate === "PASS" || gc2.json?.gate === "BLOCK", gc2.json);
    rmSync(EX, { force: true });
  } else {
    t("reached the review gate to test enforcement", false, atGate.json?.current);
  }
}

// ---- reset → history.jsonl written, state.json gone ----
r = orch(["reset"]);
const histFile = join(REPO, ".refactor-chain", "history.jsonl");
const stateFile = join(REPO, ".refactor-chain", "state.json");
t("reset ok + historyKept", r.json?.ok === true && r.json.cleared === true && r.json.historyKept === true, r.json);
t("state.json gone after reset", !existsSync(stateFile), existsSync(stateFile));
t("history.jsonl written", existsSync(histFile), existsSync(histFile));
let retro = null;
try { retro = JSON.parse(readFileSync(histFile, "utf8").trim().split("\n").pop()); } catch { /* fail below */ }
t("retro records lane + aborted outcome", retro?.lane === "web" && retro.outcome === "aborted" && Array.isArray(retro.steps), retro);

// history persists across a second reset (no active state)
r = orch(["reset"]);
t("history.jsonl persists after second reset", existsSync(histFile) && r.json?.historyKept === true, r.json);

// ---- learn rejects malformed retro ----
// Capture the file BEFORE the malformed call so the readback comparison can actually fail if
// learn wrongly appended (the old code snapshotted AFTER → it compared two identical reads).
const before = readFileSync(histFile, "utf8");
r = run(D, ["learn", "--target", REPO, "--retro", '{"nope":1}']);
t("learn rejects malformed retro (ok:false)", r.json?.ok === false && r.json.appended === false && r.code !== 0, r.json);
t("malformed retro not appended", readFileSync(histFile, "utf8") === before && before.trim().split("\n").length === 1, before.trim().split("\n").length);
r = run(D, ["learn", "--target", REPO, "--retro", '{"lane":"web","outcome":"done"}']);
t("learn accepts valid retro", r.json?.ok === true && r.json.appended === true, r.json);

// ---- doctor ----
r = orch(["doctor"]);
t("doctor ok:true", r.json?.ok === true, r.json?.checks);

// ---- forced debug lane builds a REAL subtype skill, not the phantom refactor-refactor-debug ----
r = orch(["init", "--lane", "debug", "--plan-note", "goal: fix; unknowns: none; success: green; order: fix"]);
t("forced debug → real subtype skill (no double-prefix)",
  r.json?.ok === true && Array.isArray(r.json.steps) &&
  ["refactor-whats-wrong", "refactor-web-performance", "refactor-code-memory"].includes(r.json.steps[0]) &&
  !r.json.steps.some((s) => s.includes("refactor-refactor")), r.json);
orch(["reset"]);

// ---- review board: plan → record → status → aggregate; persists + drops REFUTED ----
{
  const bp = orch(["board-plan", "--seed", "0"]);
  t("board-plan starts round 1 with lenses", bp.json?.ok === true && bp.json.round === 1 && (bp.json.plan?.lenses?.length || 0) >= 3, bp.json?.round);
  t("board-plan finder prompt bakes in persona + rubric", /file:line/.test(bp.json.plan.lenses[0].finderPrompt) && /Chris Lattner/.test(bp.json.plan.lenses[0].finderPrompt), null);
  const rec = runStdin(["board-record"], JSON.stringify({ lens: "harness", findings: [
    { where: "a:1", cause: "real crash", severity: "blocker", confidence: 0.9, fix: "guard" },
    { where: "a:2", cause: "false alarm", severity: "blocker", confidence: 0.8, fix: "x" },
  ], verdicts: [{ i: 0, verdict: "CONFIRMED" }, { i: 1, verdict: "REFUTED" }] }));
  t("board-record stores a lens's findings", rec.json?.ok === true && rec.json.findings === 2, rec.json);
  const st = orch(["board-status"]);
  t("board-status reports recorded + pending lenses (resume aid)", st.json?.recordedLenses?.includes("harness") && st.json.pendingLenses.length >= 1 && st.json.aggregated === false, st.json);
  // B2: aggregating a PARTIAL round (only 1 of ≥3 lenses) is REFUSED without --partial —
  // a "go" from a mostly-unreviewed round is a lie. (Red against pre-4.6.6, which returned go.)
  const partial = orch(["board-aggregate"]);
  t("board-aggregate refuses a partial round (exit 2, blocked)", partial.code === 2 && /incomplete/.test(partial.json?.blocked || ""), { code: partial.code, blocked: partial.json?.blocked });
  // --partial explicitly aggregates the recorded lens; drops REFUTED, keeps the confirmed blocker.
  const agg = orch(["board-aggregate", "--partial"]);
  t("board-aggregate --partial drops REFUTED, keeps the confirmed blocker", agg.json?.total === 1 && agg.json.decision === "fix-these-first" && agg.json.list?.[0]?.where === "a:1", agg.json);
  t("board round persisted (survives compaction)", existsSync(join(REPO, ".refactor-chain", "board.json")), null);
  const st2 = orch(["board-status"]);
  t("board-status shows aggregated after aggregate", st2.json?.aggregated === true && st2.json.decision === "fix-these-first", st2.json);
  // H4: recording another lens after aggregation INVALIDATES the stale ledger, so board-status
  // no longer reports the old "go"/decision until a fresh aggregate. (Red against pre-4.6.6.)
  runStdin(["board-record"], JSON.stringify({ lens: "security", findings: [], verdicts: [] }));
  const st3 = orch(["board-status"]);
  t("board-record after aggregate clears the stale ledger", st3.json?.aggregated === false && !st3.json.decision, { aggregated: st3.json?.aggregated, decision: st3.json?.decision });
}
// board-record with no round refuses cleanly (fresh target)
{
  const FRESH = join(ST, "fresh-board");
  mkdirSync(FRESH, { recursive: true });
  const r2 = run(O, ["board-record", "--target", FRESH]);
  t("board-record without a round is refused (no crash)", r2.json?.ok === false && /board-plan/.test(r2.json.blocked || ""), r2.json);
}
// a corrupt board.json refuses cleanly instead of crashing with a raw stack (v4.6.0 dogfood fix)
{
  writeFileSync(join(REPO, ".refactor-chain", "board.json"), "{ this is not valid json");
  const cr = orch(["board-plan", "--seed", "0"]);
  t("board-plan on a corrupt board.json refuses cleanly (no raw crash)", cr.json?.ok === false && /corrupt/i.test(cr.json.blocked || ""), cr.json);
  rmSync(join(REPO, ".refactor-chain", "board.json"), { force: true });
}

// ---- S2/H5: a corrupt state.json must not crash status/doctor; doctor REPORTS it ----
{
  const CS = join(ST, "corrupt-state");
  mkdirSync(join(CS, ".refactor-chain"), { recursive: true });
  writeFileSync(join(CS, ".refactor-chain", "state.json"), "{ not valid json at all");
  const status = run(O, ["status", "--target", CS]);
  t("status on corrupt state.json exits 0 (no raw SyntaxError)", status.code === 0 && status.json !== null, { code: status.code });
  const doc = run(O, ["doctor", "--target", CS]);
  const integ = (doc.json?.checks || []).find((c) => c.check === "state integrity");
  t("doctor reports corrupt state.json (ok:false, CORRUPT)", doc.code === 0 && integ?.ok === false && /corrupt/i.test(integ?.detail || ""), integ);
}

rmSync(ST, { recursive: true, force: true });
console.log(`\n${fail === 0 ? "✅" : "❌"} orchestrate: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
