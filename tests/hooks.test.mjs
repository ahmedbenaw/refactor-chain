/**
 * refactor-chain — hook scripts test suite. Spawns each hook with a stdin
 * payload + CLAUDE_PROJECT_DIR pointing at a temp fixture, asserts dormant
 * silence, risk-guard asks, ship-gate decisions, guard context/scope-drift,
 * memory capture, and boot resume banner.
 * Run: node tests/hooks.test.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = (n) => join(HERE, "..", "scripts", n);
const ST = mkdtempSync(join(tmpdir(), "rc-hooks-"));

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

let fxN = 0;
const fixture = () => { const d = join(ST, `fx${fxN++}`); mkdirSync(d, { recursive: true }); return d; };
const hook = (script, projDir, stdinObj) => {
  const r = spawnSync(process.execPath, [S(script)], {
    input: JSON.stringify(stdinObj ?? {}),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: projDir, CLAUDE_PLUGIN_ROOT: join(HERE, "..") },
  });
  let json = null; try { json = JSON.parse(r.stdout); } catch { /* non-JSON/empty */ }
  return { code: r.status, stdout: r.stdout, json };
};
const step = (extra = {}) => ({ skill: "refactor-web-01-structure", kind: "step", status: "active", retries: 0, edits: 0, notes: [], startedAt: null, doneAt: null, verify: { ran: false, delta: null }, ...extra });
const activeState = (dir, over = {}) => {
  mkdirSync(join(dir, ".refactor-chain"), { recursive: true });
  const s = { version: 3, target: dir, mode: "careful", createdAt: "2026-01-01T00:00:00Z", git: false,
    diagnosis: { lane: "web", case: "refactor-web", confidence: 0.8 }, os: "cross", platform: "web",
    phase: "lane", cursor: 0, health: "ok", baseline: { cmd: "npx vitest run" },
    steps: [step(), step({ skill: "refactor-review-gate", kind: "gate", status: "pending" })],
    checkpoints: [], lastEdit: null, ...over };
  writeFileSync(join(dir, ".refactor-chain", "state.json"), JSON.stringify(s, null, 2));
  return s;
};

// ---- 1. all hooks dormant (no state) → exit 0, and silent where designed to be ----
{
  const d = fixture();
  for (const sc of ["boot.mjs", "guard.mjs", "risk-guard.mjs", "memory-capture.mjs"]) {
    const r = hook(sc, d, { tool_name: "Edit", tool_input: { file_path: join(d, "a.js") } });
    t(`dormant ${sc}: exit 0 + empty stdout`, r.code === 0 && r.stdout === "", { code: r.code, out: r.stdout });
  }
  // ship-gate is a Stop hook: dormant means an explicit "approve" (by design, not silence)
  const r = hook("ship-gate.mjs", d, {});
  t("dormant ship-gate: exit 0 + approve", r.code === 0 && r.json?.decision === "approve", { code: r.code, json: r.json });
}

// ---- 2. risk-guard source never auto-allows ----
{
  const src = readFileSync(S("risk-guard.mjs"), "utf8");
  t('risk-guard source contains NO permissionDecision: "allow"', !/permissionDecision\s*:\s*["']allow["']/.test(src), "found allow");
}

// ---- 3. risk-guard asks on risky actions in active careful chain ----
{
  const d = fixture(); activeState(d);
  let r = hook("risk-guard.mjs", d, { tool_name: "Bash", tool_input: { command: "rm -rf build/" } });
  t("risk-guard asks on rm -rf", r.json?.hookSpecificOutput?.permissionDecision === "ask" && /destructive/.test(r.json?.systemMessage || ""), r.json);
  r = hook("risk-guard.mjs", d, { tool_name: "Write", tool_input: { file_path: join(d, ".env") } });
  t("risk-guard asks on .env write", r.json?.hookSpecificOutput?.permissionDecision === "ask", r.json);
  r = hook("risk-guard.mjs", d, { tool_name: "Edit", tool_input: { file_path: join(d, "src", "app.js") } });
  t("risk-guard silent on normal edit", r.code === 0 && r.stdout === "", { code: r.code, out: r.stdout });
  r = hook("risk-guard.mjs", d, { tool_name: "Bash", tool_input: { command: "npm test" } });
  t("risk-guard silent on safe bash", r.code === 0 && r.stdout === "", { code: r.code, out: r.stdout });
}

// ---- 4. ship-gate: blocks until the review-gate STEP is done (not a phase string) ----
{
  const d = fixture(); activeState(d, { phase: "lane", health: "ok" });
  let r = hook("ship-gate.mjs", d, {});
  t("ship-gate blocks when gate step pending (phase=lane)", r.json?.decision === "block" && /review gate/.test(r.json?.reason || ""), r.json);
  // G1: phase=docs but the gate step is still pending → must STILL block. A phase string can
  // no longer wave a run through; only a verifiably-done gate step can. (Red against old code.)
  activeState(d, { phase: "docs", health: "ok" });
  r = hook("ship-gate.mjs", d, {});
  t("ship-gate blocks when phase=docs but gate step NOT done", r.json?.decision === "block", r.json);
  // Gate step verifiably done → approve.
  activeState(d, { phase: "docs", health: "ok", cursor: 1,
    steps: [step({ status: "done" }), step({ skill: "refactor-review-gate", kind: "gate", status: "done" })] });
  r = hook("ship-gate.mjs", d, {});
  t("ship-gate approves when the review-gate step is done", r.json?.decision === "approve", r.json);
  // A blocked run is a legitimate, user-surfaced stop.
  activeState(d, { phase: "lane", health: "blocked" });
  r = hook("ship-gate.mjs", d, {});
  t("ship-gate approves when health=blocked", r.json?.decision === "approve", r.json);
}

// ---- 4b. intake: whole-word triggers (no false-fire on 'solidify' / 'refactoring') ----
{
  const d = fixture();
  const fired = (prompt) => {
    rmSync(join(d, ".refactor-chain"), { recursive: true, force: true });
    hook("intake.mjs", d, { prompt });
    return existsSync(join(d, ".refactor-chain", "intake.json"));
  };
  t("intake fires on 'refactor this module'", fired("refactor this module") === true);
  t("intake fires on 'apply SOLID principles'", fired("apply SOLID principles") === true);
  t("intake fires on 'clean up the code'", fired("clean up the code") === true);
  t("intake quiet on 'the refactoring book'", fired("the refactoring book is great") === false);
  t("intake quiet on 'solidify my grasp'", fired("how do I solidify my grasp") === false);
}

// ---- 4c. risk-guard: destructive coverage + safe-op / doc-file silence ----
{
  const d = fixture(); activeState(d);
  const asks = (command) => hook("risk-guard.mjs", d, { tool_name: "Bash", tool_input: { command } }).json?.hookSpecificOutput?.permissionDecision === "ask";
  t("risk-guard asks on 'git checkout -- .'", asks("git checkout -- .") === true);
  t("risk-guard asks on 'find . -delete'", asks("find . -delete") === true);
  t("risk-guard asks on 'rm -r ./x' (f optional)", asks("rm -r ./x") === true);
  t("risk-guard asks on 'curl x | sh'", asks("curl http://x | sh") === true);
  t("risk-guard SILENT on --force-with-lease", asks("git push --force-with-lease") === false);
  const fileAsks = (file_path) => hook("risk-guard.mjs", d, { tool_name: "Edit", tool_input: { file_path } }).json?.hookSpecificOutput?.permissionDecision === "ask";
  t("risk-guard asks on real .env", fileAsks(join(d, ".env")) === true);
  t("risk-guard SILENT on .env.example", fileAsks(join(d, ".env.example")) === false);
  t("risk-guard SILENT on credentials-guide.md", fileAsks(join(d, "docs", "credentials-guide.md")) === false);
}

// ---- 5. guard: additionalContext when active + scope-drift flag ----
{
  const d = fixture();
  const s = activeState(d);
  s.steps[0].scope = ["src/"];
  writeFileSync(join(d, ".refactor-chain", "state.json"), JSON.stringify(s, null, 2));
  let r = hook("guard.mjs", d, { tool_name: "Edit", tool_input: { file_path: join(d, "src", "app.js") } });
  const ctx = r.json?.hookSpecificOutput?.additionalContext || "";
  t("guard emits additionalContext when active", /refactor-chain active/.test(ctx) && r.json?.hookSpecificOutput?.hookEventName === "PostToolUse", ctx);
  t("guard: in-scope edit has no drift flag", !/scope-drift/.test(ctx), ctx);
  r = hook("guard.mjs", d, { tool_name: "Edit", tool_input: { file_path: join(d, "docs", "README.md") } });
  const ctx2 = r.json?.hookSpecificOutput?.additionalContext || "";
  t("guard flags scope-drift for out-of-scope edit", /scope-drift/.test(ctx2) && /docs\/README\.md/.test(ctx2), ctx2);
  // record-edit side effect: the edit was counted in state
  const after = JSON.parse(readFileSync(join(d, ".refactor-chain", "state.json"), "utf8"));
  t("guard recorded the edits into state", after.steps[0].edits >= 2 && after.lastEdit?.file?.endsWith("README.md"), { edits: after.steps[0].edits, last: after.lastEdit });
}

// ---- 6. memory-capture ----
{
  const d = fixture(); // history only, no state
  mkdirSync(join(d, ".refactor-chain"), { recursive: true });
  writeFileSync(join(d, ".refactor-chain", "history.jsonl"), JSON.stringify({ lane: "web", outcome: "done", at: "2026-01-01T00:00:00Z" }) + "\n");
  let r = hook("memory-capture.mjs", d, {});
  const memFile = join(d, ".refactor-chain", "memory", "sessions.jsonl");
  t("memory-capture writes sessions.jsonl when history exists", r.code === 0 && existsSync(memFile), existsSync(memFile));
  const note = JSON.parse(readFileSync(memFile, "utf8").trim().split("\n").pop());
  t("memory note carries lastRun lane/outcome", note.lastRun?.lane === "web" && note.lastRun.outcome === "done", note);

  const empty = fixture(); // nothing → silent, no file
  r = hook("memory-capture.mjs", empty, {});
  t("memory-capture silent when nothing to capture", r.code === 0 && r.stdout === "" && !existsSync(join(empty, ".refactor-chain")), r.stdout);
}

// ---- 7. boot: resume banner when state exists ----
{
  const d = fixture(); activeState(d, { phase: "lane" });
  const r = hook("boot.mjs", d, {});
  const ctx = r.json?.hookSpecificOutput?.additionalContext || "";
  t("boot emits resume banner when state exists", r.code === 0 && /paused run/.test(ctx) && /refactor-resume/.test(ctx), ctx);
  t("boot banner names current step", /step 1\/2/.test(ctx) && /refactor-web-01-structure/.test(ctx), ctx);
}

rmSync(ST, { recursive: true, force: true });
console.log(`\n${fail === 0 ? "✅" : "❌"} hooks: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
