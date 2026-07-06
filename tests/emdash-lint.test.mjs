#!/usr/bin/env node
// Em-dash discipline as a CHECK, not a vibe (C7). The v4.7.0 prose must not read as em-dash soup
// (the overuse tell humanizer/ruthless-editor exist to prevent). Scoped to the NEW v4.7.0 docs;
// threshold: <= 3.0 em-dashes per 100 words on any file with enough prose to judge.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

const MAX_PER_100 = 3.0;
const FILES = [
  "skills/refactor-orchestrate/SKILL.md",
  "skills/refactor-orchestrate/references/method.md",
  "skills/refactor-orchestrate/references/async-dispatch-contract.md",
  "skills/refactor-orchestrate/examples/before-after.md",
  "skills/refactor-orchestrate/templates/output.md",
  "commands/refactor-orchestrate.md",
  "docs/RELEASE-NOTES-v4.7.0.md", // added in S-C9; guarded so this test is green before then
];

for (const rel of FILES) {
  const fp = join(ROOT, rel);
  if (!existsSync(fp)) continue; // not written yet (e.g. release notes before S-C9)
  const text = readFileSync(fp, "utf8");
  const words = (text.match(/\S+/g) || []).length;
  if (words < 40) { t(`present: ${rel}`, true, null); continue; } // too short to judge density
  const emdashes = (text.match(/—/g) || []).length;
  const per100 = (emdashes * 100) / words;
  t(`em-dash density <= ${MAX_PER_100}/100 words: ${rel}`, per100 <= MAX_PER_100, `${per100.toFixed(2)}/100 (${emdashes} in ${words})`);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} emdash-lint: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
