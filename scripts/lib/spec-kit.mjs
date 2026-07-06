#!/usr/bin/env node
/**
 * refactor-chain — spec-kit (Spec-Driven Development) adapter. Detects a `.specify` project,
 * maps each pipeline phase/task to its SDD command(s), and emits the ordered command list with
 * mode-gated auto-run markers. Reconciles the harness's 4 real `state.phase` values
 * (baseline → lane → gate → docs) AND the prose phases against the 8 SDD commands via an explicit
 * map — never a 1:1 phase==command assumption.
 *
 * Zero deps, synchronous, deterministic. `detect()` reuses `signals.specKit` (the single source of
 * the `.specify` evidence); no separate filesystem probe here.
 */

// The 8 Spec-Driven-Development commands.
export const SDD = ["/constitution", "/specify", "/clarify", "/plan", "/tasks", "/analyze", "/implement", "/checklist"];

// Explicit phase/task → SDD command map. Keys cover the 4 REAL state.phase values plus the prose
// phases the SKILL.md pipeline runs. Every SDD command is reachable from at least one key.
const PHASE_MAP = {
  // real state.phase values (orchestrate.mjs: baseline → lane → gate → docs)
  baseline: ["/constitution"],   // record the acceptance criteria + guidelines contract
  lane: ["/implement"],          // do the work, step by step
  gate: ["/analyze"],            // the review gate / review-loop
  docs: ["/checklist"],          // publish checklist
  // prose phases / task tokens
  understand: ["/specify"],
  diagnose: ["/specify"],
  plan: ["/plan", "/tasks"],     // the mini-plan, then the ordered steps
  clarify: ["/clarify"],
  decision: ["/clarify"],
  verify: ["/analyze"],
  review: ["/analyze"],
  ship: ["/checklist"],
};

// The canonical pipeline order (used by emitFullFlow to cover the whole SDD arc).
const PIPELINE = ["understand", "clarify", "plan", "baseline", "lane", "gate", "docs", "ship"];

const RUN_BY_MODE = { autopilot: "auto", careful: "confirm", ask: "ask-once" };

/** True when the target is a spec-kit project. Accepts a signals object (uses `.specKit`) or a boolean. */
export function detect(signals) {
  if (signals == null) return false;
  if (typeof signals === "boolean") return signals;
  return Boolean(signals.specKit);
}

/** The SDD command(s) for one phase/task token ([] if the token maps to nothing). */
export function mapPhase(phaseOrTask) {
  const key = String(phaseOrTask || "").toLowerCase();
  return PHASE_MAP[key] ? [...PHASE_MAP[key]] : [];
}

/**
 * Emit the ordered SDD command sequence for a list of phases, each tagged with its run mode:
 * autopilot → "auto", careful → "confirm", ask → "ask-once". Unmapped phases are skipped.
 */
export function emit(phases, mode = "ask") {
  const run = RUN_BY_MODE[mode] || "confirm";
  const sequence = [];
  for (const p of phases || []) {
    const commands = mapPhase(p);
    if (commands.length) sequence.push({ phase: String(p), commands, run });
  }
  return { mode, run, sequence, sdd: SDD };
}

/** Emit the whole pipeline's SDD flow in canonical order (covers all 8 commands). */
export function emitFullFlow(mode = "ask") {
  return emit(PIPELINE, mode);
}

// ---- CLI (space-safe main check) ----
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const list = (n) => { const v = opt(n); return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : null; };
  const write = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
  const cmd = argv[0];
  const mode = opt("mode", "ask");
  if (cmd === "emit") {
    write(emit(list("phases") || PIPELINE, mode));
  } else if (cmd === "full") {
    write(emitFullFlow(mode));
  } else if (cmd === "map") {
    write(mapPhase(opt("phase", "")));
  } else {
    write({ usage: "emit --phases a,b [--mode careful|autopilot|ask] | full [--mode ...] | map --phase <phase>", sdd: SDD });
    process.exit(cmd ? 2 : 0);
  }
}
