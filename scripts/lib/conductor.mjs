#!/usr/bin/env node
/**
 * refactor-chain — the Conductor: the dispatch SCHEDULER. Given a task + diagnosis + mode, it
 * COMPOSES the standard spine (from skill-registry) + the task's resolved skills (skill-registry)
 * + its spec-kit commands (spec-kit), then partitions the work into what the host runs in PARALLEL
 * (independent review lenses + independent external skills) vs SEQUENTIALLY (the ordered pipeline).
 *
 * It never re-derives registry/spec-kit output — it composes them. It is READ-ONLY: it emits the
 * chain as data the host consumes; it never mutates state.steps (only orchestrate advance/baseline
 * write those). Zero deps, synchronous, deterministic: identical output for identical inputs, and
 * invariant to installedSkills order (skill-registry canonicalizes + total-tie-breaks).
 */
import { SPINE, resolve as resolveSkills } from "./skill-registry.mjs";
import { mapPhase } from "./spec-kit.mjs";
import { laneChain } from "./lanes.mjs";
import { LENSES } from "./personas.mjs";

// Independent review lenses run in PARALLEL (the board already assigns them seeded + adversarial).
const REVIEW_LENSES = LENSES.map((l) => l.id);

function normTask(task) {
  if (!task) return { id: "task", phase: "", capabilities: [] };
  if (typeof task === "string") return { id: task, phase: "", capabilities: [] };
  return {
    id: task.id || "task",
    phase: task.phase || "",
    capabilities: Array.isArray(task.capabilities) ? [...task.capabilities] : [],
  };
}

/** A single-step lane (debug fix, or the principles-only code lane) skips the >=3-pass loop. */
export function isFastPath(chain) {
  return !!chain && Array.isArray(chain.steps) && chain.steps.length <= 1;
}

function pickRootCause(caps, resolved) {
  if (resolved.external.includes("/root-cause-tracing")) return "/root-cause-tracing";
  if (caps.has("architecture") && resolved.external.includes("/architecture")) return "/architecture";
  return "refactor-diagnose";
}

function pickGuards(caps) {
  const guards = ["refactor-scope-fence"]; // always in force
  if (caps.has("data-guard") || caps.has("persistence") || caps.has("data")) guards.push("refactor-data-guard");
  if (caps.has("auth")) guards.push("refactor-auth-hardening");
  if (caps.has("security")) guards.push("refactor-security");
  if (caps.has("telemetry")) guards.push("refactor-telemetry-plan");
  return guards;
}

function pickReviewLens(caps) {
  if (caps.has("security")) return "security";
  if (caps.has("performance")) return "performance";
  if (caps.has("architecture")) return "architecture";
  return "correctness";
}

function pickBoardLens(caps) {
  if (caps.has("architecture")) return "architecture";
  if (caps.has("docs")) return "docs-truth";
  return "harness";
}

/**
 * Partition a task's work: PARALLEL = independent review lenses + resolved external skills;
 * SEQUENTIAL = the ordered lane chain ending at the gate (true dependencies). Pure + deterministic.
 */
export function partition(task, resolved, chain) {
  const parallel = [
    ...REVIEW_LENSES.map((l) => `lens:${l}`),
    ...(resolved.external || []),
  ];
  const sequential = [...(chain.steps || []), chain.gate].filter(Boolean);
  return { parallel, sequential };
}

/**
 * Compose the full conductor plan for a task. Returns data only — nothing is mutated, nothing runs.
 */
export function conduct(task, diagnosis, mode = "ask", installedSkills = null) {
  const t = normTask(task);
  const caps = new Set(t.capabilities);
  const chain = laneChain(diagnosis || {});
  const resolved = resolveSkills({ capabilities: t.capabilities }, installedSkills);
  const perTask = {
    rootCause: pickRootCause(caps, resolved),
    guards: pickGuards(caps),
    reviewLens: pickReviewLens(caps),
    boardLens: pickBoardLens(caps),
    specKit: mapPhase(t.phase),
    externalSkills: resolved.external,
  };
  return {
    task: t.id,
    mode,
    lane: chain.lane,
    spine: SPINE,
    chain: [...chain.steps, chain.gate],
    perTask,
    internalSkills: resolved.internal,
    dispatch: partition(t, resolved, chain),
    fastPath: isFastPath(chain),
  };
}

// ---- CLI (space-safe main check) ----
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const list = (n) => { const v = opt(n); return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : null; };
  const write = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
  const cmd = argv[0];
  if (cmd === "conduct") {
    const task = { id: opt("task", "task"), phase: opt("phase", ""), capabilities: list("caps") || [] };
    const diagnosis = { lane: opt("lane", "code"), case: opt("case", "code"), platform: opt("platform", "cli") };
    write(conduct(task, diagnosis, opt("mode", "ask"), list("installed")));
  } else {
    write({ usage: "conduct --task ID --phase P --caps a,b --lane L [--case C] [--platform P] [--mode M] [--installed x,y]" });
    process.exit(cmd ? 2 : 0);
  }
}
