#!/usr/bin/env node
/**
 * refactor-chain — PreToolUse hook (Edit|Write|MultiEdit|Bash). Dormant unless a
 * chain is active in the project. While active it asks before RISKY actions:
 * destructive shell commands, and edits to ship-sensitive files. Respects mode
 * (careful → ask; autopilot → allow but log). Never throws; defaults to allow.
 *
 * IMPORTANT: this hook NEVER emits "allow" — that would auto-approve tool calls
 * and bypass the normal permission system. It stays silent (exit 0, no output)
 * for dormant/safe cases so Claude Code's normal permission flow runs, and only
 * ever emits "ask" for a risky action inside an active careful-mode chain.
 *
 * Output (only when asking): {"hookSpecificOutput":{"permissionDecision":"ask"},"systemMessage":"..."}
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// pass-through: emit nothing so the normal permission flow proceeds unchanged
const passthrough = () => process.exit(0);

try {
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const stateFile = join(cwd, ".refactor-chain", "state.json");
  if (!existsSync(stateFile)) passthrough(); // dormant — normal permissions run

  let payload = {};
  try { const raw = readFileSync(0, "utf8"); if (raw) payload = JSON.parse(raw); } catch { /* empty */ }
  const tool = payload.tool_name || "";
  const input = payload.tool_input || {};
  const s = JSON.parse(readFileSync(stateFile, "utf8"));
  const mode = s.mode || "ask";

  let risky = null;
  if (tool === "Bash") {
    const c = String(input.command || "");
    if (/\brm\s+-rf\b|\bgit\s+reset\s+--hard\b|\bgit\s+push\b.*--force|\bgit\s+clean\s+-[a-z]*f|\bnpm\s+publish\b|\bdrop\s+(table|database)\b/i.test(c))
      risky = `a destructive command (\`${c.slice(0, 60)}\`)`;
  } else {
    const f = String(input.file_path || input.filePath || "");
    if (/(^|\/)\.env|Info\.plist|\.entitlements|\.xcprivacy|AndroidManifest\.xml|(^|\/)migrations\/|secrets?\.|credentials/i.test(f))
      risky = `a ship-sensitive file (\`${f}\`)`;
  }

  if (risky && mode !== "autopilot") {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask" },
      systemMessage: `refactor-chain: this step is about to touch ${risky}. That's outside a normal safe refactor step — confirm before proceeding, or switch to autopilot to allow it.`,
    }) + "\n");
    process.exit(0);
  }
  passthrough();
} catch { passthrough(); } // a guard must never block normal work on error // a guard must never block normal work on error
