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

// ---- fail ×3 → blocked ----
r = orch(["fail", "--reason", "tests red 1"]);
t("fail 1 → healing", r.json?.status === "healing" && r.json.retries === 1 && r.json.selfHeal === true, r.json);
r = orch(["fail", "--reason", "tests red 2"]);
t("fail 2 → healing", r.json?.status === "healing" && r.json.retries === 2, r.json);
r = orch(["fail", "--reason", "tests red 3"]);
t("fail 3 → blocked", r.json?.status === "blocked" && r.json.selfHeal === false, r.json);
r = orch(["status"]);
t("status health blocked after 3 fails", r.json?.health === "blocked", r.json?.health);

// ---- heal → active ----
r = orch(["heal"]);
t("heal retries current step", r.json?.ok === true && r.json.attempt === 4, r.json);
r = orch(["status"]);
t("status active/ok after heal", r.json?.health === "ok" && r.json.steps[0].status === "active", { health: r.json?.health, s0: r.json?.steps?.[0]?.status });

// ---- a clean advance still works ----
r = orch(["advance", "--delta", "legal", "--adversarial", "--note", "step 1 verified"]);
t("clean advance moves cursor", r.json?.ok === true && r.json.done === false && r.json.progress === `1/${total}`, r.json);

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
r = run(D, ["learn", "--target", REPO, "--retro", '{"nope":1}']);
t("learn rejects malformed retro (ok:false)", r.json?.ok === false && r.json.appended === false && r.code !== 0, r.json);
const before = readFileSync(histFile, "utf8");
t("malformed retro not appended", readFileSync(histFile, "utf8") === before && before.trim().split("\n").length === 1, before.trim().split("\n").length);
r = run(D, ["learn", "--target", REPO, "--retro", '{"lane":"web","outcome":"done"}']);
t("learn accepts valid retro", r.json?.ok === true && r.json.appended === true, r.json);

// ---- doctor ----
r = orch(["doctor"]);
t("doctor ok:true", r.json?.ok === true, r.json?.checks);

rmSync(ST, { recursive: true, force: true });
console.log(`\n${fail === 0 ? "✅" : "❌"} orchestrate: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
