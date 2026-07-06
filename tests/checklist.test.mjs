/**
 * refactor-chain — checklist-script execution harness (S7/#37). Every skill that ships a
 * scripts/checklist.mjs is SPAWNED with no args and must not CRASH (an uncaught exception →
 * exit 1 with a stack trace). Prior coverage only asserted these files EXIST — a runtime throw
 * in any of the 56 shipped green. This runs them for real.
 * Run: node tests/checklist.test.mjs
 */
import { readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS = join(HERE, "..", "skills");
let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

let ran = 0;
for (const e of readdirSync(SKILLS, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const cl = join(SKILLS, e.name, "scripts", "checklist.mjs");
  if (!existsSync(cl)) continue;
  ran++;
  const r = spawnSync(process.execPath, [cl], { encoding: "utf8", timeout: 20000 });
  // A crash = uncaught exception: exit 1, OR a node stack frame on stderr. A clean exit 0 or a
  // deliberate usage exit (2) is fine — we only guard against the script throwing on invocation.
  const crashed = r.status === 1 || /\n\s+at .+:\d+/.test(r.stderr || "") || r.error != null;
  t(`${e.name}/checklist.mjs runs without throwing`, !crashed, { code: r.status, err: (r.stderr || String(r.error || "")).slice(0, 140) });
}
t("found a healthy number of checklist scripts (≥ 50)", ran >= 50, ran);

console.log(`\n${fail === 0 ? "✅" : "❌"} checklist-scripts (${ran} skills): ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
