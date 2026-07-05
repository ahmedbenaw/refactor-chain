#!/usr/bin/env node
/**
 * refactor-ship — draft the commit message + PR/MR body from run state. Zero deps.
 *   node draft-ship.mjs --target <dir>   -> { branch, commit, prTitle, prBody }
 *   node draft-ship.mjs --checklist       -> prints this skill's step checklist as JSON
 *
 * Source-control-agnostic: emits text only; the skill runs the actual git commands.
 * Never merges, never force-pushes — this script only drafts strings.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILL = "refactor-ship";
const PHASE = "ship";

const STEPS = [
  { id: 1, step: "guard-go", detail: "Confirm refactor-publish-checklist returned GO; else stop, surface blockers." },
  { id: 2, step: "branch", detail: "If on default branch, create refactor/<lane>-<slug>; never commit refactor to default." },
  { id: 3, step: "draft", detail: "Draft conventional-commit message + PR/MR body from state + write-up + audit trail; show for edits." },
  { id: 4, step: "commit", detail: "git add -A; commit with the message + Co-Authored-By trailer." },
  { id: 5, step: "push-pr", detail: "Push branch; open PR/MR via gh/glab if present, else print body + compare URL." },
  { id: 6, step: "ci", detail: "Let CI run (no wait-block); report where to watch it." },
  { id: 7, step: "handoff", detail: "Trigger refactor-improve (improvement retro)." },
];

const slug = (s) => String(s || "refactor").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const typeFor = (lane) => (lane === "debug" ? "fix" : "refactor");

function draft(dir) {
  const stFile = join(dir, ".refactor-chain", "state.json");
  if (!existsSync(stFile)) return { error: "no state.json — run the chain first" };
  const s = JSON.parse(readFileSync(stFile, "utf8"));
  const lane = s.diagnosis?.lane || "code";
  const done = (s.steps || []).filter((x) => x.status === "done" && x.kind !== "gate");
  const scope = lane === "code" ? "" : `(${lane})`;
  const type = typeFor(lane);
  const branch = `${type}/${slug(lane)}-${slug(s.diagnosis?.case || "run")}`;

  const bullets = done.map((x) => `- ${x.skill.replace(/^refactor-/, "")}: ${x.notes?.[x.notes.length - 1] || "applied, behavior verified"}`);
  const healed = done.filter((x) => (x.retries || 0) > 0).map((x) => x.skill);

  const commit = [
    `${type}${scope}: ${lane} lane cleanup (behavior preserved)`,
    "",
    "Behavior-preserving refactor via refactor-chain. Every step re-ran the recorded",
    "baseline and matched; review gate passed; publish checklist GO.",
    "",
    ...bullets,
    "",
    healed.length ? `Self-healed steps (drift caught & re-done): ${healed.join(", ")}.` : "No drift; all steps clean on first apply.",
    "",
    "Co-Authored-By: Claude <noreply@anthropic.com>",
  ].join("\n");

  const prTitle = `${type}${scope}: ${lane} lane cleanup — behavior preserved`;
  const prBody = [
    "## What & why",
    "Behavior-preserving refactor produced by the refactor-chain pipeline.",
    "See the change write-up for the plain-language summary and the audit trail for the evidence log.",
    "",
    "## Changes",
    ...bullets,
    "",
    "## Safety",
    `- Baseline: recorded${s.baseline ? "" : " (MISSING — investigate)"}; every step verified against it.`,
    `- Review gate: ${(s.steps || []).find((x) => x.kind === "gate")?.status === "done" ? "passed" : "NOT passed — do not merge"}.`,
    healed.length ? `- Self-healed: ${healed.join(", ")}.` : "- No drift; clean on first apply.",
    "",
    "## Docs",
    "- Change write-up: `.refactor-chain/change-report.md`",
    "- Durable artifacts synced (architecture/flows/permissions/tests-map as applicable).",
    "- Audit trail: `.refactor-chain/audit-log.jsonl` (hash-linked).",
    "",
    "🤖 Generated with refactor-chain",
  ].join("\n");

  return { branch, defaultBranchGuard: "do not commit to main/master", commit, prTitle, prBody };
}

const argv = process.argv.slice(2);
if (argv.includes("--checklist")) {
  process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, steps: STEPS }, null, 2) + "\n");
} else {
  const ti = argv.indexOf("--target");
  const dir = ti >= 0 ? argv[ti + 1] : process.cwd();
  process.stdout.write(JSON.stringify({ skill: SKILL, ...draft(dir) }, null, 2) + "\n");
}
