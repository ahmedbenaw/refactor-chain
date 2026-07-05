#!/usr/bin/env node
/**
 * refactor-data-guard — checklist + applicability gate. Zero deps.
 *
 *   node checklist.mjs                      -> prints the step checklist as JSON
 *   node checklist.mjs --applicable <dir>   -> {applicable:bool, reason, touched:[...]}
 *
 * Applicability: inspects <dir>/.refactor-chain/state.json.lastEdit and the git
 * diff for files matching data-layer patterns. If none, the guard is dormant.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const SKILL = "refactor-data-guard";
const PHASE = "verify (conditional)";

const STEPS = [
  { id: 1, step: "gate", detail: "Confirm a data-layer file was touched this step; else report not-applicable and yield." },
  { id: 2, step: "locate-snapshot", detail: "Find .refactor-chain/data-snapshot.json (before); capture it now if missing." },
  { id: 3, step: "capture-shape", detail: "Read-only: row counts per table, schema/DDL shape, referential-integrity probes." },
  { id: 4, step: "diff", detail: "Classify each delta as intended (planned) or unintended (silent drop/lost constraint/row change)." },
  { id: 5, step: "assert", detail: "All-intended -> pass (advance --delta legal). Any unintended -> block (advance --delta drift), roll back." },
  { id: 6, step: "report", detail: "Fill templates/output.md into a Data-Safety Report; attach to the step verify record." },
];

// Data-layer file signals (case-insensitive substring / suffix match).
const DATA_PATTERNS = [
  /(^|\/)migrations?\//i, /(^|\/)db\//i, /(^|\/)database\//i,
  /(^|\/)seeds?\//i, /(^|\/)fixtures?\//i,
  /schema\.(sql|prisma|rb|ts|js|py)$/i, /\.sql$/i,
  /(^|\/)(models?|entities|entity|dao|repositor(y|ies))\//i,
  /(^|\/)prisma\//i, /knexfile/i, /alembic/i, /flyway/i, /liquibase/i,
];

function touchedFiles(dir) {
  const files = new Set();
  // 1) harness signal: last edited file recorded on the active step
  const st = join(dir, ".refactor-chain", "state.json");
  if (existsSync(st)) {
    try { const s = JSON.parse(readFileSync(st, "utf8")); if (s?.lastEdit?.file) files.add(s.lastEdit.file); } catch { /* ignore */ }
  }
  // 2) git working-tree + staged changes
  for (const args of [["diff", "--name-only"], ["diff", "--name-only", "--cached"]]) {
    try { execFileSync("git", args, { cwd: dir }).toString().split("\n").filter(Boolean).forEach((f) => files.add(f)); }
    catch { /* not a git repo / no changes */ }
  }
  return [...files];
}

function applicable(dir) {
  const all = touchedFiles(dir);
  const touched = all.filter((f) => DATA_PATTERNS.some((re) => re.test(f)));
  return touched.length
    ? { applicable: true, reason: "data-layer file(s) touched this step", touched }
    : { applicable: false, reason: "no data-layer file touched — guard dormant", touched: [] };
}

const argv = process.argv.slice(2);
const ai = argv.indexOf("--applicable");
if (ai >= 0) {
  const dir = argv[ai + 1] || process.cwd();
  process.stdout.write(JSON.stringify({ skill: SKILL, ...applicable(dir) }, null, 2) + "\n");
} else {
  process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, conditional: true, steps: STEPS }, null, 2) + "\n");
}
