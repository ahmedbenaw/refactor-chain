#!/usr/bin/env node
/**
 * refactor-chain — diagnostic engine. Reads-and-classifies only; never edits.
 * Single source of detection (orchestrate.mjs init calls this). No deps.
 *
 * Subcommands:
 *   classify --target <dir> [--utterance "..."] [--mode careful|autopilot|ask]
 *   signals  --target <dir>          -> raw evidence dump (JSON)
 *   scope    --target <dir> [--utterance] -> {inScope} only
 *   matrix                            -> OS/platform detection matrix (docs)
 *   learn    --target <dir> --retro <json>  -> append a retro to history.jsonl
 */
import { readFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { collectSignals, detectOS, detectPlatform } from "./lib/signals.mjs";
import { recommendPrinciples } from "./lib/principles.mjs";

const CONF_MIN = 0.70;
const FLOOR = 0.35;

// plain-language labels used for careful-mode "did you mean A or B?"
const LANE_PLAIN = {
  backend: "apply layered back-end governance (architecture, layers, naming, dependencies)",
  web: "restructure your front-end project",
  ui: "improve how the screens look",
  code: "clean up the code's structure",
  debug: "find and fix what's broken",
};

const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const target = resolve(opt("target", process.cwd()));
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");

// ---- intent parsing from the user's utterance -----------------------------
function intent(utterance) {
  const u = (utterance || "").toLowerCase();
  const hit = (arr) => arr.some((w) => u.includes(w));
  return {
    ui: hit(["look", "looks", "ugly", "pretty", "prettier", "nicer", "spacing", "color", "colour", "font", "typography", "layout", "styling", "design", "theme", "cluttered"]),
    perf: hit(["slow", "lcp", "lag", "laggy", "performance", "perf", "load time", "ttfb", "bundle size", "jank"]),
    leak: hit(["memory", "leak", "oom", "heap", "grows over time", "climbing"]),
    debug: hit(["broken", "error", "crash", "crashes", "throws", "fails", "failing", "bug", "not working", "doesn't work", "why is", "regression"]),
    refactor: hit(["refactor", "clean up", "cleanup", "restructure", "solid", "rename", "tidy", "messy", "organize", "organise", "decouple", "modernize", "modernise", "split", "god class"]),
    oos: hit(["add ", "build me", "implement", "create a", "new feature", "deploy", "set up a", "write a new", "generate a"]),
    any: u.trim().length > 0,
  };
}

// ---- lane voting ----------------------------------------------------------
function voteLanes(s, it) {
  const v = { backend: 0, web: 0, ui: 0, code: 0, debug: 0 };
  // repo evidence
  // generic Java governance lane (v3: any Maven/Gradle BACKEND project; Android apps stay in the mobile UI lane)
  // registry-driven: any detected language whose registry entry says lane:"backend"
  // votes the layered-backend governance lane (Android mobile apps stay in the ui/mobile path).
  if ((s.languages || []).some((l) => l.lane === "backend") && !(s.mobile.android && !s.web)) v.backend += 3;
  if (s.web) { v.web += 2; v.ui += 1; }
  if (s.framework) v.web += 1;
  if (s.mobile.ios || s.mobile.android || s.mobile.flutter || s.mobile.rn) v.ui += 2;
  if ((s.manifests.go || s.manifests.python || s.manifests.csproj || s.manifests.cargo) && !s.web) v.code += 2;
  // registry-detected backend/data/cli languages (C, C++, Erlang, Elixir, Ada, COBOL, …) vote code
  if (!s.web && !s.manifests.mavenAny && !s.manifests.gradle &&
      (s.languages || []).some((l) => ["backend", "data", "cli"].includes(l.platform) && !["java", "javascript", "typescript"].includes(l.id)))
    v.code += 2;
  if (!s.web && !s.manifests.mavenAny && (s.makefile || s.shebangBin)) v.code += 1;
  // intent (weighted higher — the user's words are the strongest signal)
  if (it.ui) v.ui += 3;
  if (it.perf || it.leak || it.debug) v.debug += 4;
  if (it.refactor) { // route refactor intent to whichever code lane the repo indicates
    if ((s.languages || []).some((l) => l.lane === "backend")) v.backend += 2; else if (s.web) v.web += 2; else v.code += 2;
  }
  if (!it.any) { // no utterance → lean on repo only; only nudge to code if nothing else voted
    if (v.backend === 0 && v.web === 0 && v.ui === 0 && v.code === 0) v.code += 1;
  }
  return v;
}

function debugSubtype(it) {
  if (it.perf) return "web-performance";
  if (it.leak) return "code-memory";
  return "whats-wrong";
}

// ---- history prior from history.jsonl --------------------------------------
function historyPrior(v) {
  const hf = join(target, ".refactor-chain", "history.jsonl");
  if (!existsSync(hf)) return { applied: false };
  try {
    const lines = readFileSync(hf, "utf8").trim().split("\n").filter(Boolean);
    const confirmed = {};
    for (const ln of lines) {
      try { const r = JSON.parse(ln); if (r.lane && r.outcome === "done") confirmed[r.lane] = (confirmed[r.lane] || 0) + 1; } catch { /* skip */ }
    }
    let applied = false;
    for (const [lane, n] of Object.entries(confirmed)) {
      if (v[lane] !== undefined) { v[lane] += Math.min(2, n) * 0.5; applied = true; }
    }
    return { applied, confirmed };
  } catch { return { applied: false }; }
}

function classify(utterance, mode) {
  const s = collectSignals(target);
  const it = intent(utterance);
  const v = voteLanes(s, it);
  const prior = historyPrior(v);

  const ranked = Object.entries(v).sort((a, b) => b[1] - a[1]);
  const [topLane, topScore] = ranked[0];
  const secondScore = ranked[1] ? ranked[1][1] : 0;
  let confidence = topScore > 0 ? +(topScore / (topScore + secondScore)).toFixed(2) : 0;
  if (s.monorepo) confidence = Math.min(confidence, 0.55); // competing subtrees → lower confidence

  const os = detectOS(s);
  const platform = detectPlatform(s);
  const lane = topLane;
  const caseType =
    lane === "debug" ? debugSubtype(it) :
    lane === "ui" ? "refactor-ui" :
    lane === "backend" ? "refactor-backend" :
    lane === "web" ? "refactor-web" : "refactor-code";

  // scope: out-of-scope if a strong feature-add intent and no refactor/debug signal, or nothing clears the floor
  const strongOos = it.oos && !it.refactor && !it.debug && !it.ui;
  const inScope = !strongOos && topScore > 0 && (confidence >= FLOOR || !it.any);

  const alternatives = ranked.slice(1).filter(([, sc]) => sc > 0).map(([l, sc]) => ({ lane: l, score: sc }));

  // clarify (careful/ask mode: low confidence with two viable lanes, or a monorepo)
  let clarify = null;
  const ambiguous = (confidence < CONF_MIN && secondScore > 0) || s.monorepo;
  if ((mode === "careful" || mode === "ask") && inScope && ambiguous) {
    if (s.monorepo && secondScore === 0) {
      clarify = {
        question: `This looks like a monorepo (several projects in one folder). Want me to (A) start with the main project I found (${LANE_PLAIN[topLane]}), or (B) pick a specific package to work on first?`,
        optionA: { lane: topLane, label: LANE_PLAIN[topLane] },
        optionB: { lane: "pick", label: "let me choose which package" },
      };
    } else {
      const a = topLane, b = ranked[1][0];
      clarify = {
        question: `I want to get this right. Do you want me to (A) ${LANE_PLAIN[a]}, or (B) ${LANE_PLAIN[b]}?`,
        optionA: { lane: a, label: LANE_PLAIN[a] },
        optionB: { lane: b, label: LANE_PLAIN[b] },
      };
    }
  }

  // redirect (out of scope)
  let redirect = null;
  if (!inScope) {
    redirect = it.oos
      ? "This looks like adding something new, not tidying existing code. refactor-chain only restructures code that already works — a feature-building skill would fit better."
      : "I couldn't tell what needs restructuring here. Tell me what feels messy or broken, and I'll take another look.";
  }

  return {
    case: caseType, lane, os, platform, framework: s.framework || null,
    monorepo: s.monorepo, confidence, inScope,
    mode: mode || "ask",
    signals: [
      s.manifests.mavenAny ? `maven groupId=${s.groupId || "?"}` : null,
      s.manifests.gradle && !s.manifests.mavenAny ? "gradle" : null,
      s.manifests.pkg ? `package.json version=${s.manifests.pkgVersion || "?"}` : null,
      s.framework ? `framework=${s.framework}` : null,
      (s.languages || []).length ? `languages:${s.languages.map((l) => l.id).join(",")}` : null,
      s.mobile.ios ? "ios" : null, s.mobile.android ? "android" : null,
      s.embedded ? "embedded" : null,
      s.monorepo ? "monorepo" : null, s.hasTests ? "has-tests" : "no-tests",
      s.testCmd ? `testCmd:${s.testCmd}` : null,
      s.auth ? "auth-code" : null, s.data.length ? `data:${s.data.join(",")}` : null,
      s.airflow ? "airflow-dags" : null, s.specKit ? "spec-kit" : null,
      utterance ? `utterance:"${utterance.slice(0, 60)}"` : "no-utterance",
    ].filter(Boolean),
    alternatives, clarify, redirect,
    priorApplied: prior.applied,
    conditional: { auth: s.auth, telemetry: s.data.length > 0, dags: s.airflow, specKit: s.specKit },
    principles: (() => { const r = recommendPrinciples(s.languages); return { agnostic: r.agnostic.map((p) => p.id), stackMapped: r.mapped.map((p) => p.id) }; })(),
    note: s.embedded
      ? "Embedded target detected: the safety net needs tests that run on this computer (host-runnable); testing on the device itself is out of scope."
      : s.specKit
      ? "spec-kit project detected (.specify/): at the plan step you'll choose how the chain works with your specs — Integrate (spec is truth), Co-author (spec and code evolve together), or Adopt (the refactor is spec-driven end to end)."
      : undefined,
  };
}

// ---- OS/platform matrix (for docs/tests) ----------------------------------
const MATRIX = {
  platform: {
    web: "package.json + index.html/next/angular/vue/svelte/tailwind → web lane (ui-intent → ui)",
    mobile: "pubspec.yaml / android+ios+RN / *.xcodeproj / AndroidManifest.xml → ui-mobile + code",
    desktop: "electron / tauri / *.csproj+WPF → code (+ui for visual)",
    backend: "pom.xml/build.gradle(Java) / go.mod / requirements.txt / *.csproj → jvm lane if Java else code",
    cli: "shebang bin/, Makefile, no app manifest → code",
    embedded: "platformio.ini / west.yml (zephyr) / *.ino / Kconfig / *.dts / cross-toolchain CMake → code lane; safety-net note: tests must be host-runnable — target-hardware testing is out of scope",
    monorepo: "workspaces/nx/turbo/lerna/multiple manifests → per-subtree classify + sequential chain",
  },
  os: {
    windows: "*.sln/*.ps1/CRLF → PowerShell-safe verify commands",
    posix: "Makefile/*.sh → default (mac/linux)",
    ios: "Info.plist/*.xcodeproj → mobile UI lane",
    android: "AndroidManifest.xml/build.gradle(app) → mobile UI lane",
  },
};

// ---- dispatch -------------------------------------------------------------
switch (cmd) {
  case "classify": out(classify(opt("utterance"), opt("mode", "ask"))); break;
  case "signals": out(collectSignals(target)); break;
  case "scope": { const c = classify(opt("utterance"), opt("mode", "ask")); out({ inScope: c.inScope, redirect: c.redirect }); break; }
  case "matrix": out(MATRIX); break;
  case "learn": {
    const dir = join(target, ".refactor-chain");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    let retro; try { retro = JSON.parse(opt("retro", "{}")); } catch { retro = null; }
    // validate shape so history.jsonl can't be poisoned by malformed writes
    const valid = retro && typeof retro === "object" && !Array.isArray(retro) &&
      typeof retro.lane === "string" && typeof retro.outcome === "string" &&
      (retro.steps === undefined || Array.isArray(retro.steps));
    if (!valid) { out({ ok: false, appended: false, reason: "malformed retro (needs at least {lane, outcome}) — not written" }); process.exit(2); }
    appendFileSync(join(dir, "history.jsonl"), JSON.stringify(retro) + "\n");
    out({ ok: true, appended: true });
    break;
  }
  default:
    out({ usage: "classify|signals|scope|matrix|learn", CONF_MIN, FLOOR, lanes: Object.keys(LANE_PLAIN) });
    process.exit(cmd ? 2 : 0);
}
