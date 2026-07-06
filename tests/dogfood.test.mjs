#!/usr/bin/env node
// S-C8 — dogfood the Conductor on refactor-chain itself. NOT a green check: an adversarial
// reproduction. Asserts (1) the emitted chain is a SUPERSET of the 20 named skills the hand-run
// method used; (2) the review loop enforces the >=3 floor, goes dry, and shapes artifacts; (3) the
// checked-in dogfood artifacts reproduce byte-for-byte from the fixture via the real engines.
import { execFile, spawn } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { conduct } from "../scripts/lib/conductor.mjs";
import { aggregate } from "../scripts/lib/panel-aggregate.mjs";
import { shapeSpec, shapeSprintPlan } from "../scripts/lib/review-loop.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const ORCH = join(ROOT, "scripts", "orchestrate.mjs");
let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

const run = (args) => new Promise((res) => {
  execFile(process.execPath, [ORCH, ...args], (err, stdout) => { let j = null; try { j = JSON.parse(stdout); } catch { /* */ } res({ code: err ? err.code || 1 : 0, json: j }); });
});
const record = (target, payload) => new Promise((res) => {
  const p = spawn(process.execPath, [ORCH, "review-loop-record", "--target", target]);
  let o = ""; p.stdout.on("data", (d) => (o += d)); p.on("close", () => { let j = null; try { j = JSON.parse(o); } catch { /* */ } res(j); });
  p.stdin.write(JSON.stringify(payload)); p.stdin.end();
});

// ---- (1) the emitted chain ⊇ the 20 named skills of the hand-run method ----
const TWENTY = [
  "/tech-debt", "/root-cause-tracing", "/architecture", "/code-review", "/review-implementing", "/review",
  "refactor-red-team", "refactor-security", "refactor-audit-trail", "refactor-adversarial-verify",
  "refactor-artifacts-sync", "refactor-whats-wrong", "refactor-understand", "refactor-rules",
  "refactor-guidelines-contract", "refactor-code-principles", "refactor-write-up",
  "refactor-publish-checklist", "refactor-plan-gate", "refactor-scope-fence",
];
const reviewCaps = ["review", "security", "architecture", "correctness", "debt", "verify", "docs", "red-team", "principles", "audit"];
const c = conduct({ id: "final-version", phase: "gate", capabilities: reviewCaps }, { lane: "code", case: "code" }, "autopilot", null);
const chainUnion = new Set([...c.spine, ...c.internalSkills, ...c.perTask.externalSkills, ...c.chain]);
const missing = TWENTY.filter((s) => !chainUnion.has(s));
t("emitted chain is a SUPERSET of the 20 named skills", missing.length === 0, { missing });
t("chain suggests external skills (tech-debt, code-review, review-implementing)", ["/tech-debt", "/code-review", "/review-implementing"].every((s) => c.perTask.externalSkills.includes(s)), c.perTask.externalSkills);
t("spec-kit assigned for the gate phase", c.perTask.specKit.includes("/analyze"), c.perTask.specKit);

// ---- (2) the review loop, run for real, enforces >=3 and goes dry ----
await (async () => {
  const target = mkdtempSync(join(tmpdir(), "rc-dogfood-"));
  const sources = JSON.parse(readFileSync(join(HERE, "fixtures", "dogfood-findings.json"), "utf8"));
  // three rounds: round 1 = all findings (fresh), rounds 2 & 3 = re-report the same (dry)
  const rounds = [sources.flatMap((s) => s.findings), sources.flatMap((s) => s.findings), sources.flatMap((s) => s.findings)];
  let last;
  for (let i = 0; i < 3; i++) {
    await run(["review-loop-plan", "--target", target, "--review-class", "--lenses", "harness"]);
    await record(target, { lens: "harness", findings: rounds[i], verdicts: [] });
    last = await run(["review-loop-aggregate", "--target", target]);
  }
  t("review loop reached >=3 rounds", last.json?.rounds >= 3, last.json);
  t("rounds 2 and 3 were dry (seen-ledger dedup across rounds)", last.json?.dryRounds >= 2, last.json);
  t("loop completes only after floor + dry", last.json?.loopComplete === true, last.json);
  t("artifacts written on completion (SPEC + sprint-plan + history)",
    existsSync(join(target, ".refactor-chain", "SPEC.md")) && existsSync(join(target, ".refactor-chain", "sprint-plan.md")) && existsSync(join(target, ".refactor-chain", "history.jsonl")), null);
  // a --final before the floor would have been refused — prove the guard on a fresh loop
  const fresh = mkdtempSync(join(tmpdir(), "rc-dogfood2-"));
  await run(["review-loop-plan", "--target", fresh, "--review-class", "--lenses", "harness"]);
  await record(fresh, { lens: "harness", findings: rounds[0], verdicts: [] });
  const early = await run(["review-loop-aggregate", "--target", fresh, "--final"]);
  t("a final verdict below the floor is refused (adversarial guard)", early.code === 2 && /incomplete/.test(early.json?.blocked || ""), early.json);
})();

// ---- (3) the checked-in artifacts reproduce byte-for-byte from the fixture ----
const sources = JSON.parse(readFileSync(join(HERE, "fixtures", "dogfood-findings.json"), "utf8"));
const ledger = aggregate(sources);
const meta = { title: "refactor-chain — Conductor dogfood (reproduced v4.6.6 finding classes)" };
t("dogfood SPEC.md reproduces from the fixture", existsSync(join(ROOT, "docs/dogfood/SPEC.md")) && readFileSync(join(ROOT, "docs/dogfood/SPEC.md"), "utf8") === shapeSpec(ledger, meta), null);
t("dogfood sprint-plan.md reproduces from the fixture", existsSync(join(ROOT, "docs/dogfood/sprint-plan.md")) && readFileSync(join(ROOT, "docs/dogfood/sprint-plan.md"), "utf8") === shapeSprintPlan(ledger, meta), null);
t("reproduced the v4.6.6 class: 3 blockers, fix-these-first", ledger.blockers === 3 && ledger.decision === "fix-these-first", { blockers: ledger.blockers, decision: ledger.decision });

console.log(`\n${fail === 0 ? "✅" : "❌"} dogfood: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
