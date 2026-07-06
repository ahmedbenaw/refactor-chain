#!/usr/bin/env node
// spec-kit SDD adapter: detect .specify, map the 4 real phases + prose to the 8 SDD commands,
// emit mode-gated auto-run markers (C1). Reconciles a 4-phase state machine with 8 commands.
import { SDD, detect, mapPhase, emit, emitFullFlow } from "../scripts/lib/spec-kit.mjs";

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- the 8 SDD commands ----
t("SDD has 8 commands", Array.isArray(SDD) && SDD.length === 8, SDD);
for (const c of ["/constitution", "/specify", "/clarify", "/plan", "/tasks", "/analyze", "/implement", "/checklist"])
  t(`SDD includes ${c}`, SDD.includes(c), SDD);

// ---- detect: .specify signal on/off (reuses signals.specKit; accepts object or boolean) ----
t("detect true from signals.specKit", detect({ specKit: true }) === true, null);
t("detect false from signals.specKit", detect({ specKit: false }) === false, null);
t("detect false from null", detect(null) === false, null);
t("detect passthrough boolean", detect(true) === true && detect(false) === false, null);

// ---- mapPhase: the 4 REAL state.phase values map to concrete SDD commands (not a 1:1 guess) ----
t("baseline → /constitution", JSON.stringify(mapPhase("baseline")) === JSON.stringify(["/constitution"]), mapPhase("baseline"));
t("lane → /implement", mapPhase("lane").includes("/implement"), mapPhase("lane"));
t("gate → /analyze", mapPhase("gate").includes("/analyze"), mapPhase("gate"));
t("docs → /checklist", mapPhase("docs").includes("/checklist"), mapPhase("docs"));
// prose phases map too
t("understand → /specify", mapPhase("understand").includes("/specify"), mapPhase("understand"));
t("plan → /plan + /tasks", ["/plan", "/tasks"].every((c) => mapPhase("plan").includes(c)), mapPhase("plan"));
t("clarify → /clarify", mapPhase("clarify").includes("/clarify"), mapPhase("clarify"));
t("unknown phase → []", mapPhase("nope").length === 0, mapPhase("nope"));

// ---- coverage: every one of the 8 commands is reachable from some phase (no command orphaned) ----
const PHASES = ["baseline", "lane", "gate", "docs", "understand", "plan", "clarify", "verify", "review", "ship"];
const reachable = new Set();
for (const p of PHASES) for (const c of mapPhase(p)) reachable.add(c);
for (const c of SDD) t(`command reachable: ${c}`, reachable.has(c), [...reachable]);

// ---- emit: mode gates auto-run (autopilot auto, careful confirm, ask ask-once) ----
t("autopilot → run auto", emit(["gate"], "autopilot").sequence[0].run === "auto", emit(["gate"], "autopilot"));
t("careful → run confirm", emit(["gate"], "careful").sequence[0].run === "confirm", emit(["gate"], "careful"));
t("ask → run ask-once", emit(["gate"], "ask").sequence[0].run === "ask-once", emit(["gate"], "ask"));
t("emit skips unmapped phases", emit(["nope", "gate"], "careful").sequence.length === 1, emit(["nope", "gate"], "careful"));
t("emit is deterministic", JSON.stringify(emit(["plan", "gate"], "careful")) === JSON.stringify(emit(["plan", "gate"], "careful")), null);

// ---- full flow covers all 8 commands in a coherent order ----
const flow = emitFullFlow("autopilot");
const flowCmds = new Set(flow.sequence.flatMap((s) => s.commands));
t("full flow covers all 8 commands", SDD.every((c) => flowCmds.has(c)), [...flowCmds]);
t("full flow starts at /constitution or /specify", ["/constitution", "/specify"].includes(flow.sequence[0].commands[0]), flow.sequence[0]);

console.log(`\n${fail === 0 ? "✅" : "❌"} spec-kit: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
