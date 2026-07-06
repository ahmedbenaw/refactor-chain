#!/usr/bin/env node
/**
 * refactor-chain harness — state v3. Deterministic, resumable, self-healing.
 * No deps. All git/diagnose calls use execFileSync arg-arrays (no shell).
 *
 * Pipeline phases (state.phase): baseline → lane → gate → docs. The plan-gate
 * runs before baseline (enforced via state.planNote, not a phase); completion is
 * signalled by advance's {done:true} and finalized by `reset` (which clears state).
 * Detection is single-sourced from diagnose.mjs. Lanes end with
 * refactor-code-principles + an appended review gate (kind:"gate"). Debug cases run
 * a separate fix→verify chain (no code-principles).
 *
 * State: <project>/.refactor-chain/state.json (survives turns/compaction/restart).
 *
 * Subcommands:
 *   detect     --target <dir> [--utterance] [--mode]   -> diagnose passthrough
 *   init       --target <dir> [--utterance] [--mode] [--lane] [--plan-note "<mini-plan>"] -> build plan
 *   status     [--target]                              -> current state
 *   baseline   --target [--cmd] [--framework] [--derived] -> record green baseline (unlocks lane)
 *   checkpoint --label <s> --target                    -> git stash snapshot for rollback
 *   advance    --target [--note] [--delta legal|drift] -> verified → next
 *   fail       --target --reason <s>                   -> self-heal or block
 *   heal       --target                                -> retry current step
 *   decision   --id <x> --choice <y> [--note]           -> record a mid-run checkpoint decision
 *   gate-check  --target <dir>                          -> run guidelines eval; gates review-gate completion
 *   board-plan  --target <dir> [--lenses a,b] [--seed N] -> start a review-board round; emit finder prompts
 *   board-record --target <dir>   (stdin {lens,findings,verdicts}) -> store a lens's findings into the round
 *   board-aggregate --target <dir>                      -> synthesize the round: drop REFUTED, dedupe/rank/decide
 *   board-status --target <dir>                         -> resume aid: recorded/pending lenses, decision
 *   flag-drift  --file <f> --target <dir>              -> scope-fence: persist a drift note
 *   record-edit --file <f> --target                    -> hook edit signal
 *   reset      --target                                -> finalize retro + clear
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { buildPlan, aggregateLensResults } from "./lib/board.mjs";

const MAX_RETRIES = 3;
const HERE = dirname(fileURLToPath(import.meta.url));
const PRINCIPLES_STEP = "refactor-code-principles";
const GATE = "refactor-review-gate";

const BACKEND = ["refactor-backend-01-architecture","refactor-backend-02-module-rename","refactor-backend-03-dao-model","refactor-backend-04-service","refactor-backend-05-controller","refactor-backend-06-dependency-guard","refactor-backend-07-api-naming","refactor-backend-08-common-extract","refactor-backend-09-code-optimize"];
const WEB = ["refactor-web-01-structure","refactor-web-02-modules","refactor-web-03-components","refactor-web-04-layout","refactor-web-05-naming"];
const UI = ["refactor-ui-tokens","refactor-ui-visual","refactor-ui-components","refactor-ui-a11y"];
const UI_MOBILE = ["refactor-ui-tokens","refactor-ui-mobile","refactor-ui-components","refactor-ui-a11y"];

const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
const flag = (n) => argv.includes(`--${n}`);
const target = resolve(opt("target", process.cwd()));
const stateDir = join(target, ".refactor-chain");
const stateFile = join(stateDir, "state.json");
const boardFile = join(stateDir, "board.json"); // review-board rounds — resumable, independent of a chain

const nowIso = () => new Date().toISOString();
const readState = () => (existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : null);
const writeState = (s) => { if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true }); s.updatedAt = nowIso(); writeFileSync(stateFile, JSON.stringify(s, null, 2)); };
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
const git = (a) => execFileSync("git", a, { cwd: target }).toString();
const gitOk = () => { try { execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: target, stdio: "ignore" }); return true; } catch { return false; } };
const diagnose = (extra) => JSON.parse(execFileSync(process.execPath, [join(HERE, "diagnose.mjs"), "classify", "--target", target, ...extra], { cwd: target }).toString());

// Review-board store — rounds persist in .refactor-chain/board.json so a board run
// survives compaction and works standalone (no active chain required).
const readBoard = () => {
  if (!existsSync(boardFile)) return { version: 1, rounds: [] };
  try { return JSON.parse(readFileSync(boardFile, "utf8")); }
  catch { return { version: 1, rounds: [], corrupt: true }; } // corrupt board.json must not crash every board-* command
};
const writeBoard = (b) => { if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true }); writeFileSync(boardFile, JSON.stringify(b, null, 2)); };
// Only read stdin when it is actually piped — on an interactive TTY readFileSync(0) blocks forever.
const readStdin = () => { if (process.stdin.isTTY) return undefined; try { return JSON.parse(readFileSync(0, "utf8") || "null"); } catch { return undefined; } };

// Run the guidelines conformance eval FRESH (never trust a cached verdict — code may
// have changed since the last gate-check). Returns {ok, record} or {ok:false, error}.
function runGuidelinesEval() {
  try {
    const res = JSON.parse(execFileSync(process.execPath, [join(HERE, "lib", "guidelines.mjs"), "eval", "--target", target], { cwd: target }).toString());
    return { ok: true, record: { gate: res.gate, pass: res.pass, total: res.total, failing: (res.failing || []).map((f) => f.id), excepted: res.excepted || [], at: nowIso() } };
  } catch (e) {
    return { ok: false, error: `guidelines eval failed — ${String((e && e.message) || e).slice(0, 160)}` };
  }
}

function buildSteps(d) {
  let laneSteps;
  if (d.lane === "debug") laneSteps = [`refactor-${d.case}`];
  else if (d.lane === "backend") laneSteps = BACKEND;
  else if (d.lane === "web") laneSteps = WEB;
  else if (d.lane === "ui") laneSteps = d.platform === "mobile" ? UI_MOBILE : UI;
  else laneSteps = [];
  const chain = d.lane === "debug" ? [...laneSteps] : [...laneSteps, PRINCIPLES_STEP];
  const mk = (skill, kind) => ({ skill, kind, status: "pending", retries: 0, edits: 0, notes: [], startedAt: null, doneAt: null, verify: { ran: false, delta: null } });
  return [...chain.map((s) => mk(s, "step")), mk(GATE, "gate")];
}

switch (cmd) {
  case "detect": out(diagnose([...(opt("utterance") ? ["--utterance", opt("utterance")] : []), "--mode", opt("mode", "ask")])); break;

  case "init": {
    const forced = opt("lane");
    const d = diagnose([...(opt("utterance") ? ["--utterance", opt("utterance")] : []), "--mode", opt("mode", "ask")]);
    if (forced) {
      d.lane = forced;
      // debug is the only lane whose steps derive from d.case; it needs a real subtype
      // skill (refactor-<subtype>). Keep diagnose's subtype if valid, else default.
      if (forced === "debug") { if (!["whats-wrong", "web-performance", "code-memory"].includes(d.case)) d.case = "whats-wrong"; }
      else d.case = forced; // other lanes route by d.lane; d.case is display-only (unprefixed — buildSteps never re-prefixes it)
    }
    if (!d.inScope) { out({ ok: false, inScope: false, redirect: d.redirect }); break; }
    const state = {
      version: 3, target, mode: d.mode, createdAt: nowIso(), git: gitOk(),
      diagnosis: d, os: d.os, platform: d.platform, phase: "baseline",
      cursor: 0, health: "ok", baseline: null, steps: buildSteps(d), checkpoints: [], lastEdit: null,
    };
    const planNote = opt("plan-note");
    if (planNote) state.planNote = planNote; // refactor-plan-gate mini-plan (goal/unknowns/success/order)
    writeState(state);
    out({ ok: true, lane: d.lane, case: d.case, mode: d.mode, confidence: d.confidence,
          clarify: d.clarify, steps: state.steps.map((s) => s.skill), phase: state.phase,
          note: "Record a green baseline (refactor-safety-net) before the lane runs." });
    break;
  }

  case "status": {
    const s = readState();
    if (!s) { out({ active: false }); break; }
    const cur = s.steps[s.cursor] || null;
    out({ active: true, phase: s.phase, lane: s.diagnosis.lane, mode: s.mode, health: s.health,
          confidence: s.diagnosis.confidence, cursor: s.cursor, total: s.steps.length,
          current: cur ? cur.skill : null, baseline: !!s.baseline,
          progress: `${s.steps.filter((x) => x.status === "done").length}/${s.steps.length}`, steps: s.steps });
    break;
  }

  case "baseline": {
    const s = readState();
    if (!s) { out({ error: "no active chain" }); process.exit(2); }
    // plan-gate ENFORCED (discipline pack): a written mini-plan must exist before the safety net runs.
    const planNoteAtBaseline = opt("plan-note");
    if (planNoteAtBaseline) s.planNote = planNoteAtBaseline;
    if (!s.planNote) {
      out({ ok: false, blocked: "plan-gate: record a mini-plan first (goal / unknowns / success criteria / step order). Run `init --plan-note \"...\"` or `baseline --plan-note \"...\"`.", phase: s.phase });
      process.exit(2);
    }
    s.baseline = { cmd: opt("cmd", null), framework: opt("framework", null), derived: flag("derived"), passSet: opt("passset", "recorded"), at: nowIso() };
    s.phase = "lane";
    if (s.steps.length) { s.steps[0].status = "active"; s.steps[0].startedAt = nowIso(); }
    writeState(s);
    out({ ok: true, phase: s.phase, baseline: s.baseline, firstStep: s.steps[0]?.skill });
    break;
  }

  case "checkpoint": {
    const s = readState(); const label = opt("label", "chkpt");
    if (!s || !s.git) { out({ ok: false, reason: "no git repo / no active chain" }); break; }
    try { git(["add", "-A"]); const sha = git(["stash", "create", `refactor-chain:${label}`]).trim();
      (s.checkpoints ||= []).push({ label, sha, at: nowIso(), step: s.cursor }); writeState(s);
      out({ ok: true, sha, hint: sha ? `rollback: git stash apply ${sha}` : "no changes to snapshot" });
    } catch (e) { out({ ok: false, error: String(e.message || e) }); }
    break;
  }

  case "advance": {
    const s = readState();
    if (!s) { out({ error: "no active chain" }); process.exit(2); }
    if (s.cursor >= s.steps.length) { out({ ok: true, done: true, phase: s.phase, note: "chain already complete — no step to advance" }); break; }
    if (s.phase === "baseline") { out({ ok: false, blocked: "record a baseline first (safety-net)", phase: s.phase }); process.exit(2); }
    const cur = s.steps[s.cursor];
    // retry-ceiling ENFORCED: a step blocked by exhausted retries is terminal — it cannot be advanced past. Surface the blocker; only a real fix (heal, while under budget) or reset clears it.
    if (cur && cur.status === "blocked") { out({ ok: false, blocked: "this step is blocked (retry budget exhausted) — it cannot be advanced. Surface the blocker to the user; do not force the chain forward.", phase: s.phase }); process.exit(2); }
    const delta = opt("delta");
    // behavior-preservation ENFORCED: advancing is an ALLOWLIST — only an explicitly-legal (verified-identical-to-baseline) delta passes. drift and any unstated/other delta are refused.
    if (delta === "drift") { out({ ok: false, blocked: "behavior drifted — roll back this step, do not advance", hint: "git stash apply <checkpoint>" }); process.exit(2); }
    if (delta !== "legal") { out({ ok: false, blocked: `advance requires --delta legal (behavior verified identical to the baseline). Got: ${delta || "none"}. If behavior changed, roll back — do not advance.`, phase: s.phase }); process.exit(2); }
    // adversarial-verify ENFORCED (discipline pack): the step's "it worked" claim must survive the attack pass before advancing.
    if (!flag("adversarial")) { out({ ok: false, blocked: "adversarial-verify: attack this step's claim (refactor-adversarial-verify — wrong assumption / edge case / does it actually run) BEFORE advancing, then re-run `advance --delta legal --adversarial`.", phase: s.phase }); process.exit(2); }
    // guidelines gate ENFORCED (default mandatory): the review gate step cannot complete until a FRESH guidelines eval is PASS. Re-run it here — a cached verdict is never trusted (code may have changed since gate-check; a hand-written state.guidelines must not bypass).
    if (cur && cur.kind === "gate") {
      const g = runGuidelinesEval();
      if (!g.ok) { out({ ok: false, blocked: `guidelines gate: ${g.error}. Fix the malformed input, then retry.`, phase: s.phase }); process.exit(2); }
      s.guidelines = g.record;
      if (g.record.gate !== "PASS") {
        out({ ok: false, blocked: "guidelines gate not PASS — the review gate cannot complete until guidelines eval is PASS (100%), or each failing check is a recorded exception in .refactor-chain/guideline-exceptions.json. Fix the failing checks, then retry.", phase: s.phase, guidelines: s.guidelines });
        process.exit(2);
      }
    }
    cur.status = "done"; cur.doneAt = nowIso(); cur.verify = { ran: true, delta: "legal", adversarial: true }; const n = opt("note"); if (n) cur.notes.push(n);
    s.cursor += 1; s.health = "ok";
    if (s.cursor < s.steps.length) { const nx = s.steps[s.cursor]; nx.status = "active"; nx.startedAt = nowIso(); s.phase = nx.kind === "gate" ? "gate" : "lane"; }
    else { s.phase = "docs"; }
    writeState(s);
    const done = s.cursor >= s.steps.length;
    out({ ok: true, done, phase: s.phase, next: done ? null : s.steps[s.cursor].skill,
          progress: `${s.steps.filter((x) => x.status === "done").length}/${s.steps.length}` });
    break;
  }

  case "fail": {
    const s = readState();
    if (!s) { out({ error: "no active chain" }); process.exit(2); }
    const cur = s.steps[s.cursor];
    if (!cur) { out({ ok: false, blocked: "chain already complete — no active step to fail", phase: s.phase }); process.exit(2); }
    const reason = opt("reason", "unspecified");
    cur.retries += 1; cur.notes.push(`FAIL(${cur.retries}): ${reason}`);
    if (cur.retries >= MAX_RETRIES) { cur.status = "blocked"; s.health = "blocked"; }
    else { cur.status = "healing"; s.health = "healing"; }
    writeState(s);
    out({ ok: true, status: cur.status, retries: cur.retries, maxRetries: MAX_RETRIES, selfHeal: cur.status === "healing",
          guidance: cur.status === "blocked" ? "Retry budget exhausted — stop, surface the blocker to the user." : "Re-read the step skill, adjust, re-run, verify again." });
    break;
  }

  case "heal": {
    const s = readState(); if (!s) { out({ error: "no active chain" }); process.exit(2); }
    const cur = s.steps[s.cursor];
    if (!cur) { out({ ok: false, blocked: "chain already complete — no active step to heal", phase: s.phase }); process.exit(2); }
    // retry-ceiling ENFORCED (both ends): heal must honor the same bound as fail — once the budget is spent the step stays blocked. Only reset or an explicit human decision clears it.
    if (cur.retries >= MAX_RETRIES) { out({ ok: false, blocked: `retry budget exhausted (${cur.retries}/${MAX_RETRIES}) — stop healing and surface the blocker to the user. Reset the chain or make a human decision; do not loop.`, phase: s.phase }); process.exit(2); }
    cur.status = "active"; s.health = "ok"; writeState(s);
    out({ ok: true, retrying: cur.skill, attempt: cur.retries + 1 });
    break;
  }

  case "decision": {
    // decision-checkpoint recorder: log a mid-run user choice into state so it is auditable in the write-up.
    const s = readState(); if (!s) { out({ error: "no active chain" }); process.exit(2); }
    s.decisions = s.decisions || [];
    s.decisions.push({ id: opt("id", "unnamed"), choice: opt("choice", "?"), note: opt("note", ""), at: nowIso(), step: s.cursor });
    writeState(s);
    out({ ok: true, recorded: s.decisions[s.decisions.length - 1], total: s.decisions.length });
    break;
  }

  case "board-plan": {
    // Start a new review-board round: pick lenses, assign personas, emit finder prompts.
    const lenses = opt("lenses") ? opt("lenses").split(",").map((x) => x.trim()).filter(Boolean) : null;
    const seed = parseInt(opt("seed", "0"), 10) || 0;
    const plan = buildPlan(target, lenses, seed);
    const b = readBoard();
    if (b.corrupt) { out({ ok: false, blocked: "board.json is corrupt — remove .refactor-chain/board.json to start a fresh round" }); process.exit(2); }
    const last = b.rounds.length ? Number(b.rounds[b.rounds.length - 1].round) : 0;
    const round = (Number.isFinite(last) ? last : b.rounds.length) + 1;
    b.rounds.push({ round, seed, lensIds: plan.lensIds, at: nowIso(), lensResults: [], ledger: null });
    writeBoard(b);
    // Additive reference into an active chain's state, if one exists (never required).
    const s = readState(); if (s) { s.panels = s.panels || []; s.panels.push({ round, at: nowIso(), lensIds: plan.lensIds, decision: null }); writeState(s); }
    out({ ok: true, round, plan });
    break;
  }

  case "board-record": {
    // Store one lens's findings (+ optional adversarial verdicts) into the current round.
    // Payload on stdin: { "lens": "...", "findings": [...], "verdicts": [{i,verdict,note}] }.
    const b = readBoard();
    const cur = b.rounds[b.rounds.length - 1];
    if (!cur) { out({ ok: false, blocked: "no board round — run `board-plan` first" }); process.exit(2); }
    const payload = readStdin();
    if (!payload || typeof payload !== "object" || !payload.lens) { out({ ok: false, error: "board-record expects a JSON object on stdin: {lens, findings, verdicts}" }); process.exit(2); }
    const rec = { lens: payload.lens, findings: Array.isArray(payload.findings) ? payload.findings : [], verdicts: Array.isArray(payload.verdicts) ? payload.verdicts : [] };
    const i = cur.lensResults.findIndex((r) => r.lens === rec.lens);
    if (i >= 0) cur.lensResults[i] = rec; else cur.lensResults.push(rec);
    writeBoard(b);
    out({ ok: true, round: cur.round, lens: rec.lens, findings: rec.findings.length, verdicts: rec.verdicts.length, recordedLenses: cur.lensResults.map((r) => r.lens) });
    break;
  }

  case "board-aggregate": {
    // Synthesize the current round: drop REFUTED, dedupe/rank/decide (shared with the gate).
    const b = readBoard();
    const cur = b.rounds[b.rounds.length - 1];
    if (!cur) { out({ ok: false, blocked: "no board round — run `board-plan` first" }); process.exit(2); }
    const ledger = aggregateLensResults(cur.lensResults);
    cur.ledger = ledger; writeBoard(b);
    const s = readState(); if (s && Array.isArray(s.panels) && s.panels.length) { s.panels[s.panels.length - 1].decision = ledger.decision; writeState(s); }
    out({ ok: true, round: cur.round, ...ledger });
    break;
  }

  case "board-status": {
    // Resume aid: where is the current board round? (survives compaction).
    const b = readBoard();
    const cur = b.rounds[b.rounds.length - 1];
    if (!cur) { out({ active: false, note: "no board round yet" }); break; }
    out({ active: true, round: cur.round, seed: cur.seed, lensIds: cur.lensIds,
          recordedLenses: cur.lensResults.map((r) => r.lens),
          pendingLenses: cur.lensIds.filter((l) => !cur.lensResults.some((r) => r.lens === l)),
          aggregated: !!cur.ledger, decision: cur.ledger?.decision || null });
    break;
  }

  case "gate-check": {
    // guidelines gate — DEFAULT MANDATORY: run the conformance eval and record it in state.
    const s = readState(); if (!s) { out({ error: "no active chain" }); process.exit(2); }
    const g = runGuidelinesEval();
    if (!g.ok) { out({ ok: false, error: g.error }); process.exit(2); }
    s.guidelines = g.record;
    writeState(s);
    out({ ok: g.record.gate === "PASS", gate: g.record.gate, pass: g.record.pass, total: g.record.total, failing: g.record.failing,
          guidance: g.record.gate === "PASS"
            ? "Guidelines gate PASS — the review gate may complete."
            : "Fix the failing checks, or record explicit exceptions in .refactor-chain/guideline-exceptions.json, then re-run gate-check. The chain cannot leave the review gate until this is PASS." });
    break;
  }

  case "flag-drift": {
    const s = readState(); if (!s) process.exit(0);
    const cur = s.steps[s.cursor];
    if (cur) { cur.notes = cur.notes || []; const note = `\u26d1 scope-drift: ${opt("file", "?")} (edited outside this step's declared scope)`; if (!cur.notes.includes(note)) cur.notes.push(note); s.scopeDrift = (s.scopeDrift || 0) + 1; writeState(s); }
    process.exit(0);
    break;
  }

  case "record-edit": {
    const s = readState(); if (!s) process.exit(0);
    const cur = s.steps[s.cursor]; if (cur) cur.edits += 1;
    s.lastEdit = { file: opt("file", "?"), at: nowIso(), step: s.cursor }; writeState(s); process.exit(0);
    break;
  }

  case "reset": {
    const s = readState();
    if (s) {
      const retro = { lane: s.diagnosis.lane, case: s.diagnosis.case, mode: s.mode,
        confidence: s.diagnosis.confidence, clarified: !!s.diagnosis.clarify,
        steps: s.steps.map((x) => ({ skill: x.skill, attempts: x.retries + 1, healed: x.retries > 0, status: x.status })),
        outcome: s.steps.every((x) => x.status === "done") ? "done" : "aborted", at: nowIso() };
      try { execFileSync(process.execPath, [join(HERE, "diagnose.mjs"), "learn", "--target", target, "--retro", JSON.stringify(retro)], { stdio: "ignore" }); } catch { /* non-fatal */ }
    }
    // Remove only the run state; history.jsonl persists for the history prior.
    if (existsSync(stateFile)) rmSync(stateFile, { force: true });
    out({ ok: true, cleared: true, historyKept: existsSync(join(stateDir, "history.jsonl")) });
    break;
  }

  case "doctor": {
    const checks = [];
    const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
    checks.push({ check: "Node version ≥ 18", ok: nodeMajor >= 18, detail: `v${process.versions.node}` });
    let gitPresent = true; try { execFileSync("git", ["--version"], { stdio: "ignore" }); } catch { gitPresent = false; }
    checks.push({ check: "git available", ok: gitPresent });
    checks.push({ check: "harness path space-free", ok: !/\s/.test(HERE), detail: HERE });
    let stateOk = true, stateDetail = "no active run (fine)";
    const st = readState();
    if (st) { stateOk = st.version >= 3 && Array.isArray(st.steps); stateDetail = stateOk ? `active run, schema v${st.version}, step ${st.cursor + 1}/${st.steps.length}` : "state.json unreadable/wrong shape"; }
    checks.push({ check: "state integrity", ok: stateOk, detail: stateDetail });
    let hooksOk = false;
    try {
      const settings = JSON.parse(readFileSync(join(process.env.HOME || "", ".claude", "settings.json"), "utf8"));
      hooksOk = Object.values(settings.hooks || {}).some((arr) => arr.some((b) => (b.hooks || []).some((h) => (h.command || "").includes("refactor-chain/scripts/"))));
    } catch { /* fine — other harnesses register differently */ }
    checks.push({ check: "hooks registered (Claude settings)", ok: hooksOk, detail: hooksOk ? "found" : "not found here (normal on Codex/editor installs)" });
    const allOk = checks.every((c) => c.ok || c.check.includes("hooks"));
    out({ ok: allOk, plain: allOk ? "Everything looks healthy." : "Something needs attention — see the failing check below.", checks });
    break;
  }

  default:
    out({ usage: "detect|init|status|baseline|checkpoint|advance|fail|heal|decision|gate-check|flag-drift|record-edit|board-plan|board-record|board-aggregate|board-status|reset|doctor",
          lanes: { backend: BACKEND.length, web: WEB.length, ui: UI.length, code: 0, debug: "1 (by case)" } });
    process.exit(cmd ? 2 : 0);
}
