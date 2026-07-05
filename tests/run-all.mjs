#!/usr/bin/env node
/**
 * refactor-chain — test runner. Runs every tests/*.test.mjs via execFileSync,
 * aggregates results, exits 0 only if all suites are green. Zero deps.
 */
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const suites = readdirSync(HERE).filter((f) => f.endsWith(".test.mjs")).sort();

let failed = 0;
for (const f of suites) {
  process.stdout.write(`\n── ${f} ${"─".repeat(Math.max(2, 50 - f.length))}\n`);
  try {
    execFileSync(process.execPath, [join(HERE, f)], { stdio: "inherit" });
  } catch {
    failed++;
  }
}
process.stdout.write(`\n${"=".repeat(56)}\n${failed === 0 ? "✅" : "❌"} ${suites.length} suite(s), ${suites.length - failed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
