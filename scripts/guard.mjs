#!/usr/bin/env node
/**
 * refactor-chain guard — PostToolUse hook (Edit|Write|MultiEdit).
 *
 * Registered GLOBALLY, so it must be dormant and instant unless a refactor-chain
 * run is active in the current project. Fast path: if <cwd>/.refactor-chain/
 * state.json is absent, exit 0 immediately with no output. Only when a chain is
 * active does it record the edit (so the chain can detect drift and self-heal)
 * and surface a re-verify reminder. Never throws, never blocks a tool call.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

try {
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const stateFile = join(cwd, ".refactor-chain", "state.json");
  if (!existsSync(stateFile)) process.exit(0); // dormant: no active chain here

  let editedFile = "?";
  try {
    const raw = readFileSync(0, "utf8");
    if (raw) {
      const payload = JSON.parse(raw);
      editedFile = payload?.tool_input?.file_path || payload?.tool_input?.filePath || "?";
    }
  } catch { /* stdin may be empty in some harness modes */ }

  const here = dirname(fileURLToPath(import.meta.url));
  try {
    execFileSync(process.execPath,
      [join(here, "orchestrate.mjs"), "record-edit", "--file", editedFile, "--target", cwd],
      { stdio: "ignore" });
  } catch { /* harness unavailable — still don't block */ }

  const s = JSON.parse(readFileSync(stateFile, "utf8"));
  const cur = s.steps?.[s.cursor];
  let msg = cur
    ? `refactor-chain active · step ${s.cursor + 1}/${s.steps.length} (${cur.skill}) · health=${s.health} · re-run this step's verify before advancing.`
    : `refactor-chain active · verify before advancing.`;
  // scope-fence signal (advisory record+flag; PostToolUse cannot block): the current
  // step may declare a scope (state.steps[cursor].scope = [path prefixes]); edits
  // outside it are flagged so adjacent problems get PARKED, not silently fixed.
  // Matching is path-SEGMENT based on the repo-relative path (not a bare substring, so
  // `node_modules/pkg/src/` never counts as `src/`) and separator-normalized so a
  // Windows `\`-path is compared correctly against a posix `src/` prefix.
  const scope = cur?.scope;
  if (Array.isArray(scope) && scope.length && editedFile !== "?") {
    let rel = editedFile;
    try { rel = isAbsolute(editedFile) ? relative(cwd, editedFile) : editedFile; } catch { /* keep as-is */ }
    rel = rel.replace(/\\/g, "/");
    const inScope = scope.some((p) => {
      const pp = String(p).replace(/\\/g, "/").replace(/^\.?\/+/, "").replace(/\/+$/, "");
      return pp === "" || rel === pp || rel.startsWith(pp + "/");
    });
    if (!inScope) {
      msg += ` ⚑ scope-drift: ${editedFile} is outside this step's declared scope (${scope.join(", ")}) — flag it for the write-up instead of expanding the step.`;
      // Persist the drift onto the current STEP's notes (state.steps[cursor].notes) so the
      // write-up + improve retro always see it. (Advisory record; the edit already landed.)
      try { execFileSync(process.execPath, [join(here, "orchestrate.mjs"), "flag-drift", "--file", editedFile, "--target", cwd], { stdio: "ignore" }); } catch { /* never block the edit */ }
    }
  }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg },
  }) + "\n");
} catch { /* a guard must never break the user's edit */ }
process.exit(0);
