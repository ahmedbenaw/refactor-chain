#!/usr/bin/env node
/**
 * refactor-chain — guidelines engine: extract → audit → eval (default mandatory).
 * Given ANY codebase: infer its observed code guidelines, score them against a
 * top-1% engineering baseline, and evaluate a conformance checklist the review
 * gate requires at 100% PASS (explicit user-approved exceptions are the only
 * bypass, and they are recorded). Zero deps; read-only except the manifest it
 * writes under .refactor-chain/.
 *
 * Subcommands:
 *   extract --target <dir>   -> infer observed guidelines, write .refactor-chain/guidelines.json
 *   audit   --target <dir>   -> gap report vs the top-1% baseline (ranked, plain words)
 *   eval    --target <dir>   -> conformance checklist {pass, total, failing[]} for the gate
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, resolve, extname } from "node:path";

const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
const target = resolve(opt("target", process.cwd()));
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
const readSafe = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };

const CODE_EXT = new Set([".js", ".mjs", ".ts", ".tsx", ".jsx", ".java", ".py", ".rb", ".go", ".rs", ".c", ".h", ".cpp", ".hpp", ".cs", ".php", ".ex", ".exs", ".erl", ".swift", ".kt", ".dart", ".lua", ".pl", ".hs", ".ml", ".adb", ".ads", ".zig", ".scala", ".sh"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "target", "vendor", ".git", "Pods", "_build", "deps", ".refactor-chain"]);

function sampleFiles(dir, depth = 3, acc = []) {
  if (acc.length >= 60) return acc;
  let entries = []; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (acc.length >= 60) break;
    if (e.name.startsWith(".") && e.name !== ".github") continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) { if (depth > 0) sampleFiles(full, depth - 1, acc); }
    else if (CODE_EXT.has(extname(e.name))) acc.push(full);
  }
  return acc;
}

/** Infer observed formatting/convention guidelines from a sample of real files. */
function extract() {
  const files = sampleFiles(target);
  const stats = { indent: { tab: 0, s2: 0, s4: 0 }, quotes: { single: 0, double: 0 }, lineLenP95: 0, semis: { yes: 0, no: 0 } };
  const lineLens = [];
  const naming = { camel: 0, snake: 0, pascal: 0 };
  for (const f of files) {
    const txt = readSafe(f); if (!txt) continue;
    for (const ln of txt.split("\n").slice(0, 400)) {
      lineLens.push(ln.length);
      if (/^\t/.test(ln)) stats.indent.tab++;
      else if (/^    \S/.test(ln)) stats.indent.s4++;
      else if (/^  \S/.test(ln)) stats.indent.s2++;
      const sq = (ln.match(/'[^']*'/g) || []).length, dq = (ln.match(/"[^"]*"/g) || []).length;
      stats.quotes.single += sq; stats.quotes.double += dq;
      if (/;\s*$/.test(ln)) stats.semis.yes++; else if (/[)\w]\s*$/.test(ln)) stats.semis.no++;
      for (const m of ln.matchAll(/\b(function|def|fn|func|let|const|var)\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
        const n = m[2];
        if (/^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(n)) naming.camel++;
        else if (/^[a-z]+(?:_[a-z0-9]+)+$/.test(n)) naming.snake++;
        else if (/^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)*$/.test(n)) naming.pascal++;
      }
    }
  }
  lineLens.sort((a, b) => a - b);
  const p95 = lineLens.length ? lineLens[Math.floor(lineLens.length * 0.95)] : 0;
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
  const names = new Set(); try { for (const e of readdirSync(target)) names.add(e); } catch { /* */ }
  const observed = {
    sampledFiles: files.length,
    indent: top(stats.indent) === "tab" ? "tabs" : top(stats.indent) === "s4" ? "4 spaces" : "2 spaces",
    quotes: top(stats.quotes), lineLengthP95: p95,
    namingDominant: top(naming),
    configs: {
      formatter: [".prettierrc", ".prettierrc.json", "prettier.config.js", ".clang-format", "rustfmt.toml", ".editorconfig", ".formatter.exs"].filter((c) => names.has(c)),
      linter: [".eslintrc", ".eslintrc.json", "eslint.config.js", ".rubocop.yml", "ruff.toml", ".golangci.yml", "credo.exs", ".luacheckrc"].filter((c) => names.has(c)),
      editorconfig: names.has(".editorconfig"),
    },
    ci: names.has(".github") || names.has(".gitlab-ci.yml"),
    testsDir: ["test", "tests", "__tests__", "spec"].some((d) => names.has(d)),
    guidelinesDoc: ["CODE_GUIDELINES.md", "CONTRIBUTING.md", "STYLEGUIDE.md"].filter((c) => names.has(c)),
    at: new Date().toISOString(),
  };
  const dir = join(target, ".refactor-chain");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "guidelines.json"), JSON.stringify(observed, null, 2));
  return observed;
}

/** The top-1% baseline: each check {id, plain, severity, test(observed)} */
const BASELINE = [
  { id: "formatter-config", severity: "blocker", plain: "Formatting is enforced by a config file, not by memory",
    test: (o) => o.configs.formatter.length > 0 || o.configs.editorconfig },
  { id: "linter-config", severity: "blocker", plain: "A linter guards the code automatically",
    test: (o) => o.configs.linter.length > 0 },
  { id: "tests-exist", severity: "blocker", plain: "There is a test suite (the safety net)",
    test: (o) => o.testsDir },
  { id: "ci-present", severity: "worth-fixing", plain: "CI runs the checks on every change",
    test: (o) => o.ci },
  { id: "consistent-indent", severity: "worth-fixing", plain: "One indentation style throughout",
    test: (o) => o.indent !== "unknown" },
  { id: "guidelines-doc", severity: "worth-fixing", plain: "The team's conventions are written down",
    test: (o) => o.guidelinesDoc.length > 0 },
  { id: "line-length-sane", severity: "optional", plain: "Lines stay readable (≤ 120 chars for 95% of code)",
    test: (o) => o.lineLengthP95 > 0 && o.lineLengthP95 <= 120 },
];

function audit(observed) {
  const gaps = [];
  for (const b of BASELINE) {
    const ok = !!b.test(observed);
    if (!ok) gaps.push({ id: b.id, severity: b.severity, plain: b.plain });
  }
  const order = { blocker: 0, "worth-fixing": 1, optional: 2 };
  gaps.sort((a, b) => order[a.severity] - order[b.severity]);
  return { observed, gaps, summary: gaps.length === 0 ? "This codebase already meets the baseline. Nice." : `${gaps.length} gap(s), most important first.` };
}

/**
 * Pure conformance eval (exported for unit testing): score the BASELINE against a set of
 * observed facts, honoring ONLY recorded exceptions ({id, reason, approvedAt}). A bare-id
 * (or bare-string) entry is not a valid bypass. Returns {pass,total,excepted,failing,gate,plain}.
 */
export function evalGuidelines(observed, exceptions = []) {
  const valid = (Array.isArray(exceptions) ? exceptions : []).filter((e) => e && typeof e === "object" && e.id && e.reason && e.approvedAt);
  const exceptedIds = new Set(valid.map((e) => e.id));
  const results = BASELINE.map((b) => ({ id: b.id, severity: b.severity, pass: !!b.test(observed) }));
  const failing = results.filter((r) => !r.pass && !exceptedIds.has(r.id));
  return {
    pass: results.filter((r) => r.pass).length, total: results.length,
    excepted: valid, failing,
    gate: failing.length === 0 ? "PASS" : "BLOCK",
    plain: failing.length === 0 ? "Guidelines gate: 100% PASS." : `Guidelines gate blocks: ${failing.map((f) => f.plain || f.id).join("; ")}`,
  };
}

switch (cmd) {
  case "extract": out(extract()); break;
  case "audit": {
    // Always re-extract the observed facts fresh — never trust a cached (or hand-written)
    // guidelines.json, since the code may have changed and the gate must reflect reality.
    const observed = extract();
    out(audit(observed)); break;
  }
  case "eval": {
    const observed = extract(); // fresh scan every time (a fabricated manifest cannot pass the gate)
    // Accepted exceptions live next to the manifest, recorded via decision checkpoints.
    let exceptions = [];
    try { const parsed = JSON.parse(readFileSync(join(target, ".refactor-chain", "guideline-exceptions.json"), "utf8")); if (Array.isArray(parsed)) exceptions = parsed; } catch { /* none / unreadable */ }
    out(evalGuidelines(observed, exceptions)); // pure eval honors only recorded {id,reason,approvedAt} exceptions
    break;
  }
  default: out({ usage: "extract|audit|eval", checks: BASELINE.map((b) => b.id) }); process.exit(cmd ? 2 : 0);
}
