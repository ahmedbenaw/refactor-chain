#!/usr/bin/env node
// refactor-chain wizard (rcx) — the nicer optional face of the installer.
// Zero deps: only node: builtins. Node >= 18. Cross-platform.
//
// Mirrors install.sh / INSTALL-SPEC.md exactly (same 8-step algorithm, same
// flags, same surfaces), with a calm interactive TUI: detected-surface
// checklist, a plan preview, per-surface progress, and one next-action line.
//
//   node bin/rcx.mjs [--yes] [--dry-run] [--only a,b] [--skip a,b]
//                    [--owner name] [--details] [--uninstall]

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import readline from "node:readline";
import https from "node:https";

const HOME = os.homedir();
const IS_WIN = process.platform === "win32";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const opts = {
  yes: false,
  dryRun: false,
  details: false,
  uninstall: false,
  only: "",
  skip: "",
  owner: "ahmedbenaw",
};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  switch (a) {
    case "--yes":
    case "-y": opts.yes = true; break;
    case "--dry-run": opts.dryRun = true; break;
    case "--details":
    case "-v": opts.details = true; break;
    case "--uninstall": opts.uninstall = true; break;
    case "--only": opts.only = argv[++i] || ""; break;
    case "--skip": opts.skip = argv[++i] || ""; break;
    case "--owner": opts.owner = argv[++i] || opts.owner; break;
    case "--help":
    case "-h": printHelp(); process.exit(0); break;
    default: break;
  }
}
const OWNER = opts.owner;

// ---------------------------------------------------------------- pretty
const TTY = !!process.stdout.isTTY;
const c = TTY
  ? { B: "\x1b[1m", D: "\x1b[2m", G: "\x1b[32m", Y: "\x1b[33m", R: "\x1b[31m", N: "\x1b[0m" }
  : { B: "", D: "", G: "", Y: "", R: "", N: "" };
const say = (s = "") => process.stdout.write(s + "\n");
const ok = (s) => say(`  ${c.G}✓${c.N} ${s}`);
const skip = (s) => say(`  ${c.Y}–${c.N} ${s}`);
const bad = (s) => say(`  ${c.R}✗${c.N} ${s}`);
const head = (s) => say(`\n${c.B}${s}${c.N}`);
const dim = (s) => say(`${c.D}${s}${c.N}`);

function printHelp() {
  say(`${c.B}refactor-chain wizard (rcx)${c.N}`);
  say("Installs refactor-chain into Claude Code / Cowork, Codex, and your editors.");
  say("");
  say("Usage: node bin/rcx.mjs [flags]");
  say("  --yes, -y        install all detected surfaces without asking");
  say("  --dry-run        detect + show the plan, install nothing");
  say("  --only a,b       only these surfaces");
  say("  --skip a,b       skip these surfaces");
  say("  --owner <name>   GitHub owner (default: ahmedbenaw)");
  say("  --details, -v    show technical detail");
  say("  --uninstall      remove refactor-chain from each surface");
}

function inList(csv, id) {
  if (!csv) return false;
  return csv.split(",").map((s) => s.trim()).filter(Boolean).includes(id);
}
function wants(id) {
  if (opts.only && !inList(opts.only, id)) return false;
  if (opts.skip && inList(opts.skip, id)) return false;
  return true;
}
function have(cmd) {
  try {
    execFileSync(IS_WIN ? "where" : "which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function hasApp(name) {
  return (
    fs.existsSync(`/Applications/${name}.app`) ||
    fs.existsSync(path.join(HOME, "Applications", `${name}.app`))
  );
}
function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

// ------------------------------------------------------- node locator
function nodeBin() {
  // Prefer the running interpreter (we ARE node), else known fallback paths.
  if (process.execPath && exists(process.execPath)) return process.execPath;
  const candidates = [
    "node",
    path.join(HOME, ".local", "node-current", "bin", "node"),
  ];
  for (const cand of candidates) {
    if (cand === "node" && have("node")) return "node";
    if (cand !== "node" && exists(cand)) return cand;
  }
  return null;
}
function npxBin() {
  const nb = nodeBin();
  if (!nb || nb === "node") return "npx";
  const dir = path.dirname(nb);
  const cand = path.join(dir, IS_WIN ? "npx.cmd" : "npx");
  return exists(cand) ? cand : "npx";
}

// ---------------------------------------------------------------- 1. source
let SRC = "";
let TMP = "";
function locateSource() {
  const localA = path.resolve(__dirname, "..");
  if (exists(path.join(localA, ".claude-plugin", "plugin.json"))) return localA;
  const cwd = process.cwd();
  if (exists(path.join(cwd, ".claude-plugin", "plugin.json"))) return cwd;
  return "";
}
function downloadTarball(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return downloadTarball(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });
    req.on("error", (e) => { file.close(); reject(e); });
  });
}
function findExtractedSource(root) {
  // find a dir containing .claude-plugin/plugin.json within 2 levels
  const stack = [{ dir: root, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop();
    if (exists(path.join(dir, ".claude-plugin", "plugin.json"))) return dir;
    if (depth >= 2) continue;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isDirectory()) stack.push({ dir: path.join(dir, e.name), depth: depth + 1 });
    }
  }
  return "";
}
async function ensureSource(manifest) {
  const local = locateSource();
  if (local) return local;
  head("Downloading refactor-chain…");
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "rcx-"));
  const tb = path.join(TMP, "rc.tgz");
  let url = manifest.tarball || `https://github.com/${OWNER}/refactor-chain/archive/refs/heads/main.tar.gz`;
  if (OWNER !== "ahmedbenaw") url = url.replace(/ahmedbenaw/g, OWNER);
  try {
    await downloadTarball(url, tb);
  } catch (e) {
    bad(`download failed (${url}): ${e.message}`);
    process.exit(1);
  }
  try {
    execFileSync("tar", ["-xzf", tb, "-C", TMP], { stdio: "ignore" });
  } catch {
    bad("extract failed (tar unavailable?)");
    process.exit(1);
  }
  const found = findExtractedSource(TMP);
  if (!found) { bad("could not find plugin in tarball"); process.exit(1); }
  ok("downloaded");
  return found;
}
function cleanup() {
  if (TMP) { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} }
}
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });

// ---------------------------------------------------- load manifest
function loadManifest() {
  const candidates = [
    path.resolve(__dirname, "..", "installer", "manifest.json"),
    path.resolve(process.cwd(), "installer", "manifest.json"),
  ];
  for (const p of candidates) {
    if (exists(p)) {
      try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
    }
  }
  // Baked fallback (must match installer/manifest.json).
  return {
    tarball: `https://github.com/${OWNER}/refactor-chain/archive/refs/heads/main.tar.gz`,
    runtime: { node_min_major: 18 },
    hooks: [
      { event: "SessionStart", matcher: "*", script: "scripts/boot.mjs" },
      { event: "UserPromptSubmit", matcher: "*", script: "scripts/intake.mjs" },
      { event: "PreToolUse", matcher: "Edit|Write|MultiEdit|Bash", script: "scripts/risk-guard.mjs" },
      { event: "PostToolUse", matcher: "Edit|Write|MultiEdit", script: "scripts/guard.mjs" },
      { event: "Stop", matcher: "*", script: "scripts/ship-gate.mjs" },
      { event: "SessionEnd", matcher: "*", script: "scripts/memory-capture.mjs" },
    ],
    package_managers: {
      macos: ["brew"],
      linux: ["apt-get", "dnf", "pacman", "zypper", "apk", "brew"],
      windows: ["winget", "choco", "scoop"],
    },
    npx_skills_broad:
      "npx -y skills@latest add ahmedbenaw/refactor-chain --global --agent <agent> --skill '*' -y --copy --full-depth",
  };
}

// ---------------------------------------------------- 3. surface detection
// editor id -> npx skills agent id (identical to install.sh agent_for)
function agentFor(id) {
  if (id === "vscode") return "github-copilot";
  if (id === "aider") return "aider-desk";
  return id;
}
// Same editor set + detect rules as install.sh (EDITORS + detect_editor).
const EDITORS = ["cursor", "vscode", "windsurf", "zed", "continue", "gemini-cli", "aider", "opencode", "amp"];
function detectEditor(id) {
  switch (id) {
    case "cursor": return hasApp("Cursor") || have("cursor");
    case "vscode": return hasApp("Visual Studio Code") || hasApp("VSCodium") || have("code") || have("codium");
    case "windsurf": return hasApp("Windsurf") || have("windsurf");
    case "zed": return hasApp("Zed") || have("zed");
    case "continue": return exists(path.join(HOME, ".continue"));
    case "gemini-cli": return have("gemini") || exists(path.join(HOME, ".gemini"));
    case "aider": return have("aider");
    case "opencode": return have("opencode");
    case "amp": return have("amp");
    default: return false;
  }
}
function editorLabel(id) {
  return { vscode: "VS Code + Copilot", "gemini-cli": "Gemini CLI", opencode: "opencode", amp: "Amp" }[id] || id;
}

// ---------------------------------------------------- hook registration
// Register/refresh the 6 manifest hooks in a settings/hooks JSON file.
// Space-free absolute `node <scriptsDir>/<file>` commands. Idempotent:
// removes any prior entry whose command contains 'refactor-chain/scripts/'.
function registerHooks(jsonPath, scriptsDir, hooks) {
  const nb = nodeBin();
  if (!nb) return false;
  let s = {};
  try { s = JSON.parse(fs.readFileSync(jsonPath, "utf8")); } catch { s = {}; }
  s.hooks = s.hooks || {};
  const nodeCmd = nb === "node" ? (process.execPath || "node") : nb;
  for (const h of hooks) {
    const file = path.basename(h.script);
    s.hooks[h.event] = (s.hooks[h.event] || []).filter(
      (b) => !(b.hooks || []).some((x) => (x.command || "").replace(/\\/g, "/").includes("refactor-chain/scripts/"))
    );
    s.hooks[h.event].push({
      matcher: h.matcher,
      hooks: [{ type: "command", command: `"${nodeCmd.replace(/\\/g, "/")}" "${scriptsDir.replace(/\\/g, "/")}/${file}"`, timeout: 10 }],
    });
  }
  fs.writeFileSync(jsonPath, JSON.stringify(s, null, 2));
  return true;
}
function removeHooks(jsonPath) {
  try {
    const s = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    for (const ev of Object.keys(s.hooks || {})) {
      s.hooks[ev] = s.hooks[ev].filter(
        (b) => !(b.hooks || []).some((x) => (x.command || "").replace(/\\/g, "/").includes("refactor-chain/scripts/"))
      );
    }
    fs.writeFileSync(jsonPath, JSON.stringify(s, null, 2));
  } catch {}
}

// ---------------------------------------------------- copy helpers
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, e.name);
    const d = path.join(to, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isSymbolicLink()) { try { fs.copyFileSync(s, d); } catch {} }
    else fs.copyFileSync(s, d);
  }
}
function copyGlob(fromDir, toDir, ext) {
  if (!exists(fromDir)) return;
  fs.mkdirSync(toDir, { recursive: true });
  for (const e of fs.readdirSync(fromDir, { withFileTypes: true })) {
    if (e.isFile() && (!ext || e.name.endsWith(ext))) {
      fs.copyFileSync(path.join(fromDir, e.name), path.join(toDir, e.name));
    }
  }
}

// ---------------------------------------------------- 5. install methods
function installClaude(root, hooks) {
  const D = root; // ~/.claude
  fs.mkdirSync(path.join(D, "skills"), { recursive: true });
  fs.mkdirSync(path.join(D, "commands"), { recursive: true });
  const scriptsDir = path.join(D, "skills", "refactor-chain", "scripts");

  // skills/* — MUST run before the scripts copy below: this loop rmSync's
  // skills/refactor-chain (the orchestrator skill), which would wipe a scripts/ dir
  // created earlier, leaving every hook pointing at a missing file.
  const skillsSrc = path.join(SRC, "skills");
  if (exists(skillsSrc)) {
    for (const e of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const dst = path.join(D, "skills", e.name);
      try { fs.rmSync(dst, { recursive: true, force: true }); } catch {}
      copyDir(path.join(skillsSrc, e.name), dst);
    }
  }
  // scripts (+ lib) into the orchestrator skill dir (space-free path) — AFTER the skills loop
  fs.mkdirSync(path.join(scriptsDir, "lib"), { recursive: true });
  copyGlob(path.join(SRC, "scripts"), scriptsDir, ".mjs");
  copyGlob(path.join(SRC, "scripts", "lib"), path.join(scriptsDir, "lib"), ".mjs");
  // commands/*
  copyGlob(path.join(SRC, "commands"), path.join(D, "commands"), ".md");

  // hooks — refuse space-containing paths (the known veto bug)
  if (scriptsDir.includes(" ")) {
    bad(`hook path has a space (${scriptsDir}) — skipping hook registration (would veto tools)`);
    return;
  }
  const settings = path.join(D, "settings.json");
  if (exists(settings)) { try { fs.copyFileSync(settings, settings + ".bak.rcx"); } catch {} }
  if (!exists(settings)) fs.writeFileSync(settings, "{}\n");
  if (registerHooks(settings, scriptsDir, hooks)) {
    ok("Claude Code / Cowork — skills, commands, 6 hooks registered");
  } else {
    skip("Claude files installed; hooks need Node (install node, then re-run)");
  }
}
function uninstallClaude(root) {
  const D = root;
  const sk = path.join(D, "skills");
  if (exists(sk)) {
    for (const e of fs.readdirSync(sk)) {
      if (e.startsWith("refactor-")) { try { fs.rmSync(path.join(sk, e), { recursive: true, force: true }); } catch {} }
    }
  }
  const cmd = path.join(D, "commands");
  if (exists(cmd)) {
    for (const e of fs.readdirSync(cmd)) {
      if (e.endsWith(".md") && (e.startsWith("refactor") || e === "fix.md" || e === "check.md")) {
        try { fs.rmSync(path.join(cmd, e), { force: true }); } catch {}
      }
    }
  }
  const settings = path.join(D, "settings.json");
  if (exists(settings)) removeHooks(settings);
  ok("Claude Code / Cowork — removed");
}

function installCodex(codexHome, hooks) {
  const pluginDir = path.join(codexHome, "plugins", "refactor-chain");
  fs.mkdirSync(pluginDir, { recursive: true });
  copyDir(SRC, pluginDir);
  const scriptsDir = path.join(pluginDir, "scripts");
  if (scriptsDir.includes(" ")) {
    bad("codex hook path has a space — skipping hooks");
    return;
  }
  const hooksJson = path.join(codexHome, "hooks.json");
  if (exists(hooksJson)) { try { fs.copyFileSync(hooksJson, hooksJson + ".bak.rcx"); } catch {} }
  if (!exists(hooksJson)) fs.writeFileSync(hooksJson, "{}\n");
  if (registerHooks(hooksJson, scriptsDir, hooks)) ok("Codex — plugin + hooks");
  else skip("Codex plugin copied; hooks need Node");
}
function uninstallCodex(codexHome) {
  const pluginDir = path.join(codexHome, "plugins", "refactor-chain");
  try { fs.rmSync(pluginDir, { recursive: true, force: true }); } catch {}
  ok("Codex — removed");
}

function installEditor(id, _manifest) {
  const ag = agentFor(id);
  const manual = `npx -y skills@latest add ${OWNER}/refactor-chain --global --agent ${ag} --copy --full-depth`;
  if (!nodeBin()) { skip(`${editorLabel(id)} — needs Node/npx. Manual: ${manual}`); return; }
  const npx = npxBin();
  try {
    execFileSync(
      npx,
      ["-y", "skills@latest", "add", `${OWNER}/refactor-chain`, "--global", "--agent", ag, "--skill", "*", "-y", "--copy", "--full-depth"],
      { stdio: "ignore" }
    );
    ok(`${editorLabel(id)} — installed (agent: ${ag})`);
  } catch {
    skip(`${editorLabel(id)} — skills CLI failed; manual: ${manual}`);
  }
}
function uninstallEditor(id) {
  const ag = agentFor(id);
  if (nodeBin()) {
    try {
      execFileSync(npxBin(), ["-y", "skills@latest", "remove", "refactor-chain", "--global", "--agent", ag], { stdio: "ignore" });
    } catch {}
  }
  ok(`${editorLabel(id)} — remove attempted`);
}

// ---------------------------------------------------- prompt
function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); resolve(a); });
  });
}

// ---------------------------------------------------- main
async function main() {
  const manifest = loadManifest();
  const hooks = manifest.hooks;

  // 1. source
  SRC = await ensureSource(manifest);
  if (opts.details) dim(`source: ${SRC}`);

  // 2. platform
  const OSN = process.platform === "darwin" ? "macOS" : process.platform === "win32" ? "Windows" : process.platform === "linux" ? "Linux" : process.platform;
  const pmKey = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : "linux";
  const pmList = (manifest.package_managers && manifest.package_managers[pmKey]) || [];
  let PM = "";
  for (const p of pmList) { if (have(p)) { PM = p; break; } }

  head(`refactor-chain installer  ·  ${OSN}  ·  package manager: ${PM || "none"}`);

  const CLAUDE_HOME = path.join(HOME, ".claude");
  const CODEX_HOME = path.join(HOME, ".codex");

  // 3 + 4. detect surfaces and show the plan
  const ACT = opts.uninstall ? "uninstall" : "install";
  head(`Here's what I found (and will ${ACT}):`);

  let planClaude = false, planCodex = false;
  const planEditors = [];

  if (wants("claude-code")) {
    if (exists(CLAUDE_HOME) || !opts.uninstall) { planClaude = true; ok("Claude Code / Cowork  (~/.claude)"); }
  }
  if (wants("codex") && exists(CODEX_HOME)) { planCodex = true; ok("Codex  (~/.codex)"); }
  for (const e of EDITORS) {
    if (!wants(e)) continue;
    if (detectEditor(e)) { planEditors.push(e); ok(`${editorLabel(e)}  (via skills CLI)`); }
    else if (opts.details) skip(`${editorLabel(e)} (not found)`);
  }
  if (!planClaude && !planCodex && planEditors.length === 0) {
    skip("no supported surfaces detected");
    if (!opts.details) {
      dim("Manual per-surface: npx -y skills@latest add " + OWNER + "/refactor-chain --global --agent <agent> --copy --full-depth");
    }
  }

  // plan preview line
  const count = (planClaude ? 1 : 0) + (planCodex ? 1 : 0) + planEditors.length;
  if (count > 0 && !opts.uninstall) {
    dim(`Plan: ${count} surface${count === 1 ? "" : "s"} → copy skills/commands/scripts, register hooks, add editor skills. Nothing outside your home dir is touched.`);
  }

  // dry-run stops here
  if (opts.dryRun) { head("Dry run — nothing installed."); return; }

  // confirm (interactive TTY only)
  if (!opts.yes && TTY && process.stdin.isTTY) {
    const ans = await ask(`\n${c.B}Proceed? [Y/n] ${c.N}`);
    if (/^n/i.test(ans.trim())) { say("Cancelled."); return; }
  }

  // 5 + 6 + 7. install / uninstall per surface
  head(opts.uninstall ? "Removing…" : "Installing…");
  if (opts.uninstall) {
    if (planClaude) uninstallClaude(CLAUDE_HOME);
    if (planCodex) uninstallCodex(CODEX_HOME);
    for (const e of planEditors) uninstallEditor(e);
    head("Uninstalled. Restart your editor to clear loaded skills.");
    return;
  }
  if (planClaude) installClaude(CLAUDE_HOME, hooks);
  if (planCodex) installCodex(CODEX_HOME, hooks);
  for (const e of planEditors) installEditor(e, manifest);

  // 8. verify + summary
  head("Done.");
  if (exists(path.join(CLAUDE_HOME, "skills", "refactor-chain", "SKILL.md"))) {
    ok("verified: Claude skills present");
  }
  say("");
  say(`${c.B}Next:${c.N} open Claude Code (or your editor) and type ${c.B}/refactor${c.N} — describe what you want fixed or tidied.`);
  dim("Tips: /fix (something broke) · /check (review before shipping) · re-run with --uninstall to remove.");
}

main().catch((e) => {
  bad(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
