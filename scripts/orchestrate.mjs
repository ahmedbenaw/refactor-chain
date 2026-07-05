#!/usr/bin/env node
/**
 * refactor-chain harness — state v3. Deterministic, resumable, self-healing.
 * No deps. All git/diagnose calls use execFileSync arg-arrays (no shell).
 *
 * Pipeline phases: plan → baseline → lane → gate → docs → done.
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
 *   flag-drift  --file <f> --target <dir>              -> scope-fence: persist a drift note
 *   record-edit --file <f> --target                    -> hook edit signal
 *   reset      --target                                -> finalize retro + clear
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

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
const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const flag = (n) => argv.includes(`--${n}`);
const target = resolve(opt("target", process.cwd()));
const stateDir = join(target, ".refactor-chain");
const stateFile = join(stateDir, "state.json");

const nowIso = () => new Date().toISOString();
const readState = () => (existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : null);
const writeState = (s) => { if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true }); s.updatedAt = nowIso(); writeFileSync(stateFile, JSON.stringify(s, null, 2)); };
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
const git = (a) => execFileSync("git", a, { cwd: target }).toString();
const gitOk = () => { try { execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: target, stdio: "ignore" }); return true; } catch { return false; } };
const diagnose = (extra) => JSON.parse(execFileSync(process.execPath, [join(HERE, "diagnose.mjs"), "classify", "--target", target, ...extra], { cwd: target }).toString());

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
    if (forced) { d.lane = forced; d.case = `refactor-${forced}`; }
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
    const delta = opt("delta");
    if (delta === "drift") { out({ ok: false, blocked: "behavior drifted — roll back this step, do not advance", hint: "git stash apply <checkpoint>" }); process.exit(2); }
    // adversarial-verify ENFORCED (discipline pack): the step's "it worked" claim must survive the attack pass before advancing.
    if (!flag("adversarial")) { out({ ok: false, blocked: "adversarial-verify: attack this step's claim (refactor-adversarial-verify — wrong assumption / edge case / does it actually run) BEFORE advancing, then re-run `advance --delta legal --adversarial`.", phase: s.phase }); process.exit(2); }
    const cur = s.steps[s.cursor];
    // guidelines gate ENFORCED (default mandatory): the review gate step cannot complete until guidelines eval is PASS (100%) or every failing check is a recorded exception.
    if (cur && cur.kind === "gate" && s.guidelines?.gate !== "PASS") {
      out({ ok: false, blocked: "guidelines gate not passed — run `orchestrate.mjs gate-check`. The review gate cannot complete until guidelines eval is PASS (100%), or each failing check is a recorded exception in .refactor-chain/guideline-exceptions.json.", phase: s.phase, guidelines: s.guidelines || null });
      process.exit(2);
    }
    if (cur) { cur.status = "done"; cur.doneAt = nowIso(); cur.verify = { ran: true, delta: delta || "clean", adversarial: true }; const n = opt("note"); if (n) cur.notes.push(n); }
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

  case "gate-check": {
    // guidelines gate — DEFAULT MANDATORY: run the conformance eval and record it in state.
    const s = readState(); if (!s) { out({ error: "no active chain" }); process.exit(2); }
    let res;
    try { res = JSON.parse(execFileSync(process.execPath, [join(HERE, "lib", "guidelines.mjs"), "eval", "--target", target], { cwd: target }).toString()); }
    catch (e) { out({ ok: false, error: "guidelines eval failed", detail: String(e && e.message || e).slice(0, 200) }); process.exit(2); }
    s.guidelines = { gate: res.gate, pass: res.pass, total: res.total, failing: (res.failing || []).map((f) => f.id), at: nowIso() };
    writeState(s);
    out({ ok: res.gate === "PASS", gate: res.gate, pass: res.pass, total: res.total, failing: s.guidelines.failing,
          guidance: res.gate === "PASS"
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
    out({ usage: "detect|init|status|baseline|checkpoint|advance|fail|heal|record-edit|reset|doctor",
          lanes: { backend: BACKEND.length, web: WEB.length, ui: UI.length, code: 0, debug: "1 (by case)" } });
    process.exit(cmd ? 2 : 0);
}
