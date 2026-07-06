#!/usr/bin/env node
/**
 * refactor-chain — the skill registry: the STANDARD SPINE + a capability→skill catalog
 * (internal refactor-* AND external installed skills), with deterministic resolution and
 * OPEN-SET exploration. The Conductor composes with this; it never re-derives it.
 *
 * Zero deps. Deterministic: every consumer canonicalizes its inputs (stable id sort) and
 * ranks with a TOTAL tie-break (score desc, then id asc), so the same (task, installedSkills)
 * always yields byte-identical output regardless of input order — determinism as f(inputs).
 *
 * Exports:
 *   SPINE            — ordered skill IDs every conductor chain inherits (the discipline pack +
 *                      pipeline phase order), fully-qualified (internal dir names; external /-names).
 *   CATALOG          — [{ id, kind:"internal"|"external", capabilities:[...] }]
 *   capabilitiesOf(id)               -> capabilities for a catalogued id ([] if unknown)
 *   canonicalSkills(installed)       -> normalized+id-sorted [{id, description}]
 *   resolve(task, installedSkills)   -> { spine, internal[], external[], ranked[] } for a task
 *   explore(installedSkills)         -> OPEN-SET: match each installed skill by catalog OR by its
 *                                       own description (discovers skills the catalog never listed)
 */

// ── The STANDARD SPINE — the actual chain (discipline pack + the review-chain members) ──────────
export const SPINE = [
  "refactor-chain",
  "refactor-understand", "refactor-live-truth",
  "refactor-diagnose", "/root-cause-tracing", "/architecture",
  "refactor-guidelines-contract", "refactor-scope-fence", "refactor-rules", "refactor-memory",
  "refactor-plan-gate",
  "refactor-safety-net",
  "refactor-verify", "refactor-adversarial-verify",
  "refactor-review-gate",
  "refactor-red-team", "refactor-whats-wrong", "refactor-audit-trail",
  "refactor-write-up", "refactor-artifacts-sync", "refactor-ruthless-editor", "/humanizer",
  "refactor-publish-checklist",
  "refactor-improve",
];

// ── Internal catalog — EVERY refactor-* skill on disk (superset-guarded by the test) ────────────
const BACKEND_STEPS = ["01-architecture", "02-module-rename", "03-dao-model", "04-service",
  "05-controller", "06-dependency-guard", "07-api-naming", "08-common-extract", "09-code-optimize"];
const WEB_STEPS = ["01-structure", "02-modules", "03-components", "04-layout", "05-naming"];

const INTERNAL = {
  "refactor-chain": ["orchestrate", "door"],
  "refactor-understand": ["understand", "assess"],
  "refactor-diagnose": ["diagnose", "classify", "spec-kit"],
  "refactor-assessment-map": ["assess", "debt"],
  "refactor-legacy-assess": ["assess", "legacy"],
  "refactor-plan-gate": ["plan", "gate", "spec-kit"],
  "refactor-safety-net": ["baseline", "test", "safety"],
  "refactor-verify": ["verify", "test"],
  "refactor-adversarial-verify": ["adversarial", "verify", "review"],
  "refactor-review-gate": ["review", "gate", "security", "performance", "red-team", "correctness"],
  "refactor-security": ["security", "review"],
  "refactor-auth-hardening": ["auth", "security", "guard"],
  "refactor-performance": ["performance", "review"],
  "refactor-red-team": ["red-team", "adversarial", "review"],
  "refactor-data-guard": ["data-guard", "guard", "persistence"],
  "refactor-telemetry-plan": ["telemetry", "guard"],
  "refactor-scope-fence": ["scope", "guard", "contract"],
  "refactor-guidelines-contract": ["contract", "guidelines", "conduct"],
  "refactor-live-truth": ["live-truth", "contract", "verify"],
  "refactor-rules": ["rules", "contract", "conventions"],
  "refactor-memory": ["memory", "recall"],
  "refactor-code-principles": ["principles", "structure", "code"],
  "refactor-write-up": ["docs", "write-up"],
  "refactor-artifacts-sync": ["docs", "artifacts"],
  "refactor-audit-trail": ["docs", "audit", "forensic"],
  "refactor-ruthless-editor": ["docs", "edit-prose"],
  "refactor-publish-checklist": ["publish", "checklist", "ship"],
  "refactor-ship": ["ship", "release"],
  "refactor-ship-readiness": ["ship", "readiness", "store"],
  "refactor-improve": ["improve", "retro"],
  "refactor-reimagine": ["reimagine", "advisory", "design"],
  "refactor-transform": ["transform", "modernize", "apply"],
  "refactor-simplify": ["simplify", "tidy", "apply"],
  "refactor-ci-agent": ["ci", "action"],
  "refactor-board": ["board", "review", "panel"],
  "refactor-orchestrate": ["orchestrate", "conduct", "review", "spec-kit", "chain"],
  "refactor-whats-wrong": ["debug", "whats-wrong"],
  "refactor-web-performance": ["debug", "performance", "web"],
  "refactor-code-memory": ["debug", "memory-leak"],
  "refactor-ui-tokens": ["ui", "tokens"],
  "refactor-ui-visual": ["ui", "visual"],
  "refactor-ui-mobile": ["ui", "mobile"],
  "refactor-ui-components": ["ui", "components"],
  "refactor-ui-a11y": ["ui", "a11y"],
};
for (const s of BACKEND_STEPS) INTERNAL[`refactor-backend-${s}`] = ["backend", "layered", s.replace(/^\d+-/, "")];
for (const s of WEB_STEPS) INTERNAL[`refactor-web-${s}`] = ["web", s.replace(/^\d+-/, "")];

// ── External catalog — installed skills from OTHER plugins the Conductor may assign ─────────────
const EXTERNAL = {
  "/test-driven-development": ["test", "red-first", "verify"],
  "/write-spec": ["spec", "sdd", "docs"],
  "/sprint-plan": ["plan", "sprint", "sdd"],
  "/opportunity-solution-tree": ["taxonomy", "discovery", "plan"],
  "/write-query": ["query", "data", "sql"],
  "/tech-debt": ["debt", "assess", "review"],
  "/root-cause-tracing": ["root-cause", "diagnose", "debug"],
  "/architecture": ["architecture", "design"],
  "/code-review": ["review", "correctness"],
  "/review": ["review", "audit"],
  "/review-implementing": ["review", "verify", "compare"],
  "/ruthless-editor": ["docs", "edit-prose"],
  "/humanizer": ["docs", "edit-prose", "plain-language"],
};

export const CATALOG = [
  ...Object.entries(INTERNAL).map(([id, capabilities]) => ({ id, kind: "internal", capabilities })),
  ...Object.entries(EXTERNAL).map(([id, capabilities]) => ({ id, kind: "external", capabilities })),
];
const CAP_BY_ID = new Map(CATALOG.map((e) => [e.id, e.capabilities]));

/** Capabilities for a catalogued id ([] if not catalogued). */
export function capabilitiesOf(id) { return CAP_BY_ID.get(id) ? [...CAP_BY_ID.get(id)] : []; }

// ── Open-set discovery: derive capabilities from a skill's own description ──────────────────────
const DISCOVERY = [
  [/architect/i, "architecture"], [/\btdd\b|test-driven|\btest/i, "test"], [/review/i, "review"],
  [/secur/i, "security"], [/performance|\bperf\b/i, "performance"], [/debt/i, "debt"],
  [/document|\bdocs?\b/i, "docs"], [/root.?cause/i, "root-cause"], [/\bspec/i, "spec"],
  [/\bplan/i, "plan"], [/verif/i, "verify"], [/query|sql/i, "query"], [/debug/i, "debug"],
  [/refactor|moderniz/i, "transform"], [/simplif/i, "simplify"], [/audit/i, "audit"],
];
function discoverCaps(description) {
  const out = [];
  for (const [re, cap] of DISCOVERY) if (re.test(description || "") && !out.includes(cap)) out.push(cap);
  return out;
}

function normSkill(s) {
  return typeof s === "string" ? { id: s, description: "" } : { id: s && s.id, description: (s && s.description) || "" };
}
/** Normalize + stable id-sort the installed-skills list (the determinism foundation). */
export function canonicalSkills(installed) {
  return (installed || []).map(normSkill).filter((s) => s.id)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function taskCaps(task) {
  if (!task) return [];
  if (typeof task === "string") return [task];
  return Array.isArray(task.capabilities) ? task.capabilities : [];
}

/**
 * Resolve a task to its ranked internal + external skills. Deterministic: input order is
 * canonicalized and ranking uses a total tie-break (overlap desc, then id asc). External skills
 * are filtered to those actually installed (open set on the installed side) when a list is given.
 */
export function resolve(task, installedSkills) {
  const caps = new Set(taskCaps(task));
  const installedIds = installedSkills == null ? null : new Set(canonicalSkills(installedSkills).map((s) => s.id));
  const scored = CATALOG
    .map((e) => ({ id: e.id, kind: e.kind, score: e.capabilities.filter((c) => caps.has(c)).length }))
    .filter((e) => e.score > 0)
    .filter((e) => e.kind === "internal" || installedIds == null || installedIds.has(e.id))
    .sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    spine: SPINE,
    internal: scored.filter((e) => e.kind === "internal").map((e) => e.id),
    external: scored.filter((e) => e.kind === "external").map((e) => e.id),
    ranked: scored,
  };
}

/**
 * OPEN-SET exploration: for each installed skill, take its capabilities from the catalog if known,
 * otherwise DISCOVER them from its own description — so a skill the catalog never enumerated can
 * still be matched. Deterministic: canonical order, then capability-count desc, then id asc.
 */
export function explore(installedSkills) {
  return canonicalSkills(installedSkills).map((s) => {
    const known = CAP_BY_ID.has(s.id);
    const capabilities = known ? [...CAP_BY_ID.get(s.id)] : discoverCaps(s.description);
    return { id: s.id, capabilities, known };
  }).sort((a, b) => (b.capabilities.length - a.capabilities.length) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// ---- CLI (space-safe main check via pathToFileURL) ----
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const list = (n) => { const v = opt(n); return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : null; };
  const write = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
  const cmd = argv[0];
  if (cmd === "resolve") {
    write(resolve({ capabilities: list("caps") || [] }, list("installed")));
  } else if (cmd === "explore") {
    write(explore((list("installed") || []).map((id) => ({ id, description: "" }))));
  } else if (cmd === "spine") {
    write(SPINE);
  } else {
    write({ usage: "resolve --caps a,b [--installed x,y] | explore --installed x,y | spine", catalog: CATALOG.length });
    process.exit(cmd ? 2 : 0);
  }
}
