#!/usr/bin/env node
// Blanket-preservation regression checklist (plan non-negotiable): every v2
// capability must still exist — commands, skills, harness subcommands, hooks.
// v3.0.0 cannot ship red here.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- the 61 v2 commands (frozen inventory — do not edit to make green) ----
// DELIBERATE RE-BASELINE (user decision, v3): the jvm lane was renamed to jvm
// (refactor-java-0X → refactor-backend-0X) and refactor-code-solid → refactor-code-principles
// (the principle-driven engine; SOLID is one catalog entry) — same skills, same order,
// These are the ONLY sanctioned deviations from the v2 name set.
const V2_COMMANDS = [
  "check", "fix", "refactor",
  "refactor-artifacts-sync", "refactor-assessment-map", "refactor-audit-trail",
  "refactor-auth-hardening", "refactor-autopilot", "refactor-careful", "refactor-chain",
  "refactor-code-memory", "refactor-code-principles", "refactor-data-guard", "refactor-diagnose",
  "refactor-improve",
  "refactor-backend-01-architecture", "refactor-backend-02-module-rename", "refactor-backend-03-dao-model",
  "refactor-backend-04-service", "refactor-backend-05-controller", "refactor-backend-06-dependency-guard",
  "refactor-backend-07-api-naming", "refactor-backend-08-common-extract", "refactor-backend-09-code-optimize",
  "refactor-legacy-assess", "refactor-performance", "refactor-publish-checklist",
  "refactor-red-team", "refactor-reimagine", "refactor-resume", "refactor-review-gate",
  "refactor-rules", "refactor-safety-net", "refactor-security", "refactor-ship-readiness",
  "refactor-ship", "refactor-simplify", "refactor-status", "refactor-stop",
  "refactor-telemetry-plan", "refactor-transform",
  "refactor-ui-a11y", "refactor-ui-color", "refactor-ui-components", "refactor-ui-hierarchy",
  "refactor-ui-layout", "refactor-ui-mobile", "refactor-ui-tokens", "refactor-ui-typography",
  "refactor-ui-visual", "refactor-understand", "refactor-undo", "refactor-verify",
  "refactor-web-01-structure", "refactor-web-02-modules", "refactor-web-03-components",
  "refactor-web-04-layout", "refactor-web-05-naming", "refactor-web-performance",
  "refactor-whats-wrong", "refactor-write-up",
];
const V3_NEW_COMMANDS = [
  "refactor-plan-gate", "refactor-adversarial-verify", "refactor-live-truth", "refactor-scope-fence",
  "refactor-ruthless-editor", "refactor-memory", "refactor-guidelines-contract", "refactor-ci-agent",
];

const cmds = new Set(readdirSync(join(ROOT, "commands")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)));
for (const c of V2_COMMANDS) t(`v2 command preserved: /${c}`, cmds.has(c), [...cmds].filter((x) => x.startsWith(c.slice(0, 8))));
for (const c of V3_NEW_COMMANDS) t(`v3 command present: /${c}`, cmds.has(c), null);
t("command count = 70", cmds.size === 70, cmds.size); // +refactor-board (v4.6.0)

// ---- skills: 57, each with a SKILL.md whose frontmatter name matches its dir ----
const skills = readdirSync(join(ROOT, "skills")).filter((d) => existsSync(join(ROOT, "skills", d, "SKILL.md")));
t("skill count = 57", skills.length === 57, skills.length); // +refactor-board (v4.6.0)
for (const c of V2_COMMANDS) {
  if (["check", "fix", "refactor", "refactor-autopilot", "refactor-careful", "refactor-resume",
       "refactor-status", "refactor-stop", "refactor-undo", "refactor-ui-color",
       "refactor-ui-hierarchy", "refactor-ui-layout", "refactor-ui-typography"].includes(c)) continue; // command-only doors/scoped aliases
  t(`skill preserved: ${c}`, skills.includes(c), null);
}

// ---- harness subcommands (frozen v2 set + v3 additions) ----
const orch = readFileSync(join(ROOT, "scripts", "orchestrate.mjs"), "utf8");
for (const sub of ["detect", "init", "status", "checkpoint", "advance", "fail", "heal", "record-edit", "reset", "baseline", "doctor", "gate-check", "decision"])
  t(`orchestrate subcommand: ${sub}`, orch.includes(`case "${sub}"`), sub);
const diag = readFileSync(join(ROOT, "scripts", "diagnose.mjs"), "utf8");
for (const sub of ["classify", "signals", "scope", "matrix", "learn"])
  t(`diagnose subcommand: ${sub}`, diag.includes(`case "${sub}"`), sub);

// ---- hooks: 6 events in hooks.json AND installer manifest ----
const hooksJson = readFileSync(join(ROOT, "hooks", "hooks.json"), "utf8");
const manifest = JSON.parse(readFileSync(join(ROOT, "installer", "manifest.json"), "utf8"));
const EVENTS = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "SessionEnd"];
for (const e of EVENTS) t(`hooks.json event: ${e}`, hooksJson.includes(`"${e}"`), null);
t("manifest hooks = 6", (manifest.hooks || []).length === 6, (manifest.hooks || []).length);

console.log(`\n${fail === 0 ? "✅" : "❌"} preservation: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
