#!/usr/bin/env node
/**
 * refactor-chain — UserPromptSubmit hook. Fires on every prompt globally, so it
 * must be cheap and quiet: it only acts when the prompt clearly concerns
 * refactor-chain (trigger words or a /refactor|/fix|/check command), stashing
 * the utterance + chosen mode into <cwd>/.refactor-chain/intake.json so the
 * diagnostic engine has deterministic input. Never throws; exits 0.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

try {
  let prompt = "";
  try { const raw = readFileSync(0, "utf8"); if (raw) prompt = (JSON.parse(raw).user_prompt) || (JSON.parse(raw).prompt) || ""; } catch { /* stdin may be empty */ }
  const p = prompt.toLowerCase();
  // Commands + multi-word phrases are safe as substrings; bare words must match WHOLE-word
  // so "solidify" / "the refactoring book" / "modernized furniture" don't arm the engine.
  const substr = ["/refactor", "/fix", "/check", "clean up", "restructure", "make it look", "it's broken", "it's slow", "memory leak"];
  const words = ["refactor", "solid", "modernize", "modernise"];
  const hit = substr.some((t) => p.includes(t)) || words.some((w) => new RegExp(`\\b${w}\\b`).test(p));
  if (!hit) process.exit(0); // not for us — stay quiet

  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const dir = join(cwd, ".refactor-chain");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const mode = p.includes("--autopilot") || p.includes(" autopilot") ? "autopilot"
    : p.includes("--careful") || p.includes(" careful") ? "careful" : "ask";
  writeFileSync(join(dir, "intake.json"), JSON.stringify({ utterance: prompt.slice(0, 500), mode, at: new Date().toISOString() }, null, 2));
} catch { /* never block a prompt */ }
process.exit(0);
