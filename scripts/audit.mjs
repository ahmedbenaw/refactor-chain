#!/usr/bin/env node
/**
 * refactor-chain — repo self-audit. Zero deps. Exit 0 when clean, 1 when
 * findings. Walks the repo (skipping .git/node_modules) and checks:
 *   (a) skills/<dir>/SKILL.md frontmatter `name:` matches the directory name
 *   (b) every skill dir (except skills/refactor-chain) has non-empty
 *       references/ examples/ scripts/ templates/
 *   (c) backticked references/|examples/|scripts/|templates/ paths in each
 *       SKILL.md resolve (relative to the skill dir, or the repo root)
 *   (d) no personal /Users/<name> paths anywhere
 *   (e) provenance scan (upstream author markers) — reported as a COUNT by
 *       default (they legitimately exist until Wave 5); --provenance-strict
 *       turns any hit into a finding
 *   (f) secret patterns (GitHub/Slack/AWS token shapes)
 *   (g) hooks/hooks.json is valid JSON and every referenced script exists
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STRICT_PROVENANCE = process.argv.includes("--provenance-strict");
const SKIP = new Set([".git", "node_modules", ".refactor-chain"]); // .refactor-chain = git-ignored runtime state
const TEXT_EXT = /\.(md|mjs|js|ts|json|yml|yaml|sh|ps1|txt|toml|html|css)$|^[^.]+$/;

const findings = [];
const finding = (check, file, msg) => findings.push({ check, file: relative(ROOT, file) || ".", msg });

// ---- repo walk ----
function walk(dir, acc = []) {
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}
const files = walk(ROOT);
const readSafe = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const isText = (p) => TEXT_EXT.test(p.split("/").pop()) && (statSync(p).size < 2_000_000);

// ---- (a)(b)(c) skills checks ----
const skillsDir = join(ROOT, "skills");
const REQUIRED_SUBDIRS = ["references", "examples", "scripts", "templates"];
let skillCount = 0;
if (existsSync(skillsDir)) {
  for (const name of readdirSync(skillsDir)) {
    const dir = join(skillsDir, name);
    try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
    skillCount++;
    const skillMd = join(dir, "SKILL.md");
    if (!existsSync(skillMd)) { finding("skill-md", dir, "missing SKILL.md"); continue; }
    const txt = readSafe(skillMd);

    // (a) frontmatter name == dirname
    const fm = txt.match(/^---\n([\s\S]*?)\n---/);
    const fmName = fm ? (fm[1].match(/^name:\s*(.+)$/m) || [])[1]?.trim() : null;
    if (!fm) finding("frontmatter", skillMd, "no frontmatter block");
    else if (!fmName) finding("frontmatter", skillMd, "frontmatter has no name:");
    else if (fmName !== name) finding("frontmatter", skillMd, `frontmatter name "${fmName}" != dirname "${name}"`);

    // (b) required non-empty subdirs (hub skill exempt)
    if (name !== "refactor-chain") {
      for (const sub of REQUIRED_SUBDIRS) {
        const p = join(dir, sub);
        let ok = false;
        try { ok = statSync(p).isDirectory() && readdirSync(p).length > 0; } catch { ok = false; }
        if (!ok) finding("skill-structure", dir, `missing or empty ${sub}/`);
      }
    }

    // (c) backticked resource paths resolve
    for (const m of txt.matchAll(/`((?:references|examples|scripts|templates)\/[^`\s]+)/g)) {
      const p = m[1].replace(/[.,;:)]+$/, "");
      if (/[*<>{]/.test(p)) continue; // wildcard/placeholder, not a literal path
      if (!existsSync(join(dir, p)) && !existsSync(join(ROOT, p)))
        finding("broken-path", skillMd, `backticked path does not resolve: ${p}`);
    }
  }
}

// ---- (d)(e)(f) content scans ----
// Patterns are built by concatenation so this file doesn't flag itself.
const personalPath = new RegExp("/Users" + "/[A-Za-z][A-Za-z0-9._-]*");
// Patterns are split so this checker never trips its own scan of the tracked tree.
const provenanceRe = new RegExp(
  ["guo" + "maolin", "Qoder" + "Skills", "fu" + "trx", "Kings-Of" + "-The-Web", "Podo" + "bnik", "refactoring-" + "ui-skill"].join("|"),
  "i"
);
const secretRes = [
  ["github-token", new RegExp("ghp" + "_[A-Za-z0-9]{20,}")],
  ["github-pat", new RegExp("github" + "_pat_" + "[A-Za-z0-9_]{20,}")], // bare prefix (docs/case patterns) is not a secret
  ["slack-token", new RegExp("xox" + "[bap]-")],
  ["aws-key", new RegExp("AKIA" + "[0-9A-Z]{16}")],
];
const SELF = fileURLToPath(import.meta.url);
let provenanceHits = 0;
const provenanceFiles = new Set();
for (const f of files) {
  if (f === SELF) continue; // the auditor's own pattern definitions
  if (!isText(f)) continue;
  const txt = readSafe(f);
  if (!txt) continue;
  const pm = txt.match(personalPath);
  if (pm) finding("personal-path", f, `personal path in content: ${pm[0]}`);
  const prov = txt.match(new RegExp(provenanceRe, "gi"));
  if (prov) { provenanceHits += prov.length; provenanceFiles.add(relative(ROOT, f)); if (STRICT_PROVENANCE) finding("provenance", f, `provenance marker(s): ${[...new Set(prov)].join(", ")}`); }
  for (const [label, re] of secretRes) {
    const sm = txt.match(re);
    if (sm) finding("secret", f, `${label} pattern: ${sm[0].slice(0, 12)}…`);
  }
}

// ---- (g) hooks.json ----
const hooksFile = join(ROOT, "hooks", "hooks.json");
if (!existsSync(hooksFile)) finding("hooks", hooksFile, "hooks/hooks.json missing");
else {
  let hooks = null;
  try { hooks = JSON.parse(readSafe(hooksFile)); } catch (e) { finding("hooks", hooksFile, `invalid JSON: ${e.message}`); }
  if (hooks) {
    const cmds = [];
    for (const bindings of Object.values(hooks.hooks || {}))
      for (const b of bindings) for (const h of b.hooks || []) if (h.command) cmds.push(h.command);
    for (const c of cmds) {
      const m = c.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"'\s]+)/);
      if (!m) { finding("hooks", hooksFile, `command not rooted at \${CLAUDE_PLUGIN_ROOT}: ${c}`); continue; }
      if (!existsSync(join(ROOT, m[1]))) finding("hooks", hooksFile, `referenced script missing: ${m[1]}`);
    }
  }
}

// ---- stale action version: uses: ...refactor-chain@vN must match the current major ----
{
  const major = "v" + (JSON.parse(readSafe(join(ROOT, ".claude-plugin", "plugin.json"))).version || "0").split(".")[0];
  const re = new RegExp("refactor-chain@(v\\d+)");
  for (const f of files) {
    const rel = relative(ROOT, f);
    if (rel.startsWith("docs/RELEASE-NOTES-v") || rel === "CHANGELOG.md") continue; // historical notes keep their version
    if (!isText(f)) continue;
    for (const m of readSafe(f).matchAll(new RegExp(re, "g")))
      if (m[1] !== major) finding("stale-action-version", f, `refactor-chain@${m[1]} but current major is ${major}`);
  }
}

// ---- frontmatter sanity: description must be YAML-safe (quoted if it contains ": ") ----
{
  for (const f of files) {
    const rel = relative(ROOT, f);
    if (!rel.match(/^skills\/[^/]+\/SKILL\.md$/)) continue;
    const m = readSafe(f).match(/^---\n([\s\S]*?)\n---\n/);
    if (!m) { finding("frontmatter", f, "missing frontmatter block"); continue; }
    const d = m[1].match(/^description:[ \t]*(.*)$/m);
    if (!d) { finding("frontmatter", f, "missing description"); continue; }
    const v = d[1].trim();
    const quoted = (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"));
    if (!quoted && v.includes(": ")) finding("frontmatter", f, "unquoted ': ' breaks YAML parsing");
  }
}

// ---- v1-relic check: CJK text or org tokens must never appear in shipped content ----
{
  const relicRe = new RegExp("[\\u4e00-\\u9fff]|gfmis|grp-[a-z]");
  for (const f of files) {
    const rel = relative(ROOT, f);
    if (!(rel.startsWith("skills/") || rel.startsWith("commands/"))) continue;
    if (!isText(f)) continue;
    const m = readSafe(f).match(relicRe);
    if (m) finding("v1-relic", f, `relic marker: ${JSON.stringify(m[0])}`);
  }
}

// ---- installer/manifest hook parity ----
// Every hook script in installer/manifest.json must appear in ALL FOUR installers
// (install.sh, install.ps1, bin/rcx.mjs, installer/go/main.go). Catches the
// "added a hook, forgot an installer" class of bug mechanically.
{
  const manifestFile = join(ROOT, "installer", "manifest.json");
  if (existsSync(manifestFile)) {
    try {
      const hooks = JSON.parse(readFileSync(manifestFile, "utf8")).hooks || [];
      const installers = ["install.sh", "install.ps1", "bin/rcx.mjs", "installer/go/main.go"];
      for (const inst of installers) {
        const fp = join(ROOT, inst);
        if (!existsSync(fp)) { finding("hook-parity", fp, "installer missing"); continue; }
        const body = readFileSync(fp, "utf8");
        for (const h of hooks) {
          const script = h.script.split("/").pop();
          if (!body.includes(script)) finding("hook-parity", fp, `does not register manifest hook: ${h.event} → ${script}`);
        }
      }
    } catch (e) { finding("hook-parity", manifestFile, `unreadable manifest: ${e.message}`); }
  }
}

// ---- report ----
const byCheck = {};
for (const f of findings) (byCheck[f.check] ||= []).push(f);
console.log(`refactor-chain audit — ${files.length} files scanned, ${skillCount} skills`);
console.log(`provenance markers: ${provenanceHits} hit(s) in ${provenanceFiles.size} file(s)${STRICT_PROVENANCE ? " (STRICT: counted as findings)" : " (report-only until Wave 5; use --provenance-strict to fail on them)"}`);
if (findings.length === 0) {
  console.log("\n✅ clean — no findings");
  process.exit(0);
}
console.log(`\n❌ ${findings.length} finding(s):`);
for (const [check, list] of Object.entries(byCheck)) {
  console.log(`\n[${check}] ${list.length}`);
  for (const f of list.slice(0, 40)) console.log(`  - ${f.file}: ${f.msg}`);
  if (list.length > 40) console.log(`  … and ${list.length - 40} more`);
}
process.exit(1);
