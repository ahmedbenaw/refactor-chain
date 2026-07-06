/**
 * refactor-chain — guidelines eval unit tests (S1/B3). Verifies the MANDATORY gate's real
 * logic with specific verdicts (not a PASS||BLOCK tautology): known-good PASSes with nothing
 * failing, known-bad BLOCKs with the right ids, and ONLY a recorded {id,reason,approvedAt}
 * exception bypasses — a self-written bare-id array does not. Red against pre-4.6.6.
 * Run: node tests/guidelines.test.mjs
 */
import { evalGuidelines } from "../scripts/lib/guidelines.mjs";

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

const good = { configs: { formatter: [".prettierrc"], linter: [".eslintrc"], editorconfig: true }, testsDir: true, ci: true, indent: "2 spaces", guidelinesDoc: ["CONTRIBUTING.md"], lineLengthP95: 80 };
const bad = { configs: { formatter: [], linter: [], editorconfig: false }, testsDir: false, ci: false, indent: "unknown", guidelinesDoc: [], lineLengthP95: 0 };
const ALL_IDS = ["formatter-config", "linter-config", "tests-exist", "ci-present", "consistent-indent", "guidelines-doc", "line-length-sane"];

// known-good → PASS, nothing failing
{
  const r = evalGuidelines(good, []);
  t("known-good observed → gate PASS", r.gate === "PASS", r.gate);
  t("known-good → failing is empty", r.failing.length === 0, r.failing);
  t("known-good → pass count is total", r.pass === r.total, { pass: r.pass, total: r.total });
}
// known-bad → BLOCK with the specific ids
{
  const r = evalGuidelines(bad, []);
  t("known-bad observed → gate BLOCK", r.gate === "BLOCK", r.gate);
  const ids = r.failing.map((f) => f.id);
  t("known-bad → formatter/linter/tests are among failing", ["formatter-config", "linter-config", "tests-exist"].every((id) => ids.includes(id)), ids);
}
// bare-id exception array does NOT bypass (the core G2 fix)
{
  const r = evalGuidelines(bad, ALL_IDS); // a self-written bare-string array
  t("bare-id exception array is rejected → still BLOCK", r.gate === "BLOCK" && r.excepted.length === 0, { gate: r.gate, excepted: r.excepted });
}
// a single RECORDED exception drops just that id
{
  const rec = [{ id: "formatter-config", reason: "monorepo formats per-package", approvedAt: "2026-07-06T00:00:00Z" }];
  const r = evalGuidelines(bad, rec);
  const ids = r.failing.map((f) => f.id);
  t("recorded exception drops that id from failing", !ids.includes("formatter-config") && r.excepted.length === 1, { failing: ids, excepted: r.excepted.length });
}
// a full recorded set flips BLOCK → PASS
{
  const recAll = ALL_IDS.map((id) => ({ id, reason: "legacy repo, approved once", approvedAt: "2026-07-06T00:00:00Z" }));
  const r = evalGuidelines(bad, recAll);
  t("full recorded exception set → gate PASS", r.gate === "PASS", r.gate);
}
// malformed exception entries (missing reason/approvedAt) are ignored
{
  const r = evalGuidelines(bad, [{ id: "tests-exist" }, { id: "ci-present", reason: "x" }]);
  t("exception missing reason/approvedAt is ignored", r.gate === "BLOCK" && r.excepted.length === 0, { gate: r.gate, excepted: r.excepted.length });
}

console.log(`${fail === 0 ? "✅" : "❌"} guidelines: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
