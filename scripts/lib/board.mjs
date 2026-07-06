#!/usr/bin/env node
/**
 * refactor-chain — the Review Board conductor (deterministic, never calls a model).
 *
 * A Node script cannot dispatch subagents — only the host LLM can. So the conductor
 * does the deterministic half: select lenses, assign personas, and EMIT the exact
 * subagent prompts (persona + mandatory rubric + output contract baked in as data).
 * The skill (refactor-board) reads these prompts and dispatches them with whatever
 * primitive the runtime has (parallel Agent calls on Claude Code, sequential on Codex).
 * Because the prompts are data, the identical grumpy reviewer appears on every runtime.
 *
 * Subcommands:
 *   plan         --target <dir> [--lenses a,b] [--seed N]   -> panel + finder prompts
 *   verify-prompt --lens X --lenses a,b,c [--seed N]  (stdin: findings[])  -> verifier prompts
 *   aggregate                                        (stdin: lensResults[]) -> ranked ledger + decision
 *
 * Zero deps. Deterministic: seeded assignment, never Math.random.
 */
import { readFileSync } from "node:fs";
import { assignPanel, rubricText, LENSES } from "./personas.mjs";
import { aggregate, mergeVerdicts } from "./panel-aggregate.mjs";

const FINDER_CONTRACT =
  '\nOUTPUT CONTRACT (strict): Return ONLY a JSON array, nothing else. Each element:\n' +
  '{ "where": "path/file.ext:LINE", "cause": "<one-sentence concrete defect>", ' +
  '"severity": "blocker|worth-fixing|optional", "confidence": 0.0-1.0, ' +
  '"fix": "<concrete, specific fix>", "behaviorChanged": <true if it changes runtime behavior, else false> }\n' +
  'If the slice is genuinely clean, return []. Do not invent findings to look busy.';

const VERIFIER_CONTRACT =
  '\nOUTPUT CONTRACT (strict): Return ONLY a JSON object, nothing else:\n' +
  '{ "verdict": "CONFIRMED|SUSPECTED|REFUTED", "note": "<one sentence; cite the file:line evidence that made you confirm or refute>" }';

/** The finder prompt for a lens assignment — the named Lead, the rubric, the contract. */
export function finderPrompt(a, target) {
  return [
    `You are ${a.lead.name} (${a.lead.edge}), reviewing under the authority of ${a.authority.name}.`,
    "",
    rubricText("finder"),
    "",
    `LENS: ${a.lens} — focus strictly on: ${a.focus}.`,
    `TARGET: ${target}. Read the actual files; never review from memory.`,
    "Find real defects inside your lens only. Anchor every one to an exact file:line.",
    FINDER_CONTRACT,
  ].join("\n");
}

/** The verifier prompt for one finding — the named Coordinator, told to REFUTE. */
export function verifierPrompt(a, finding) {
  return [
    `You are ${a.coordinator.name} (${a.coordinator.edge}), the adversarial verifier for the ${a.lens} lens, under ${a.authority.name}.`,
    "",
    rubricText("verifier"),
    "",
    `The finding from ${a.lead.name} that you must try to REFUTE:`,
    JSON.stringify(finding, null, 2),
    "Go read the actual code at that file:line. Try to break the claim before you accept it.",
    VERIFIER_CONTRACT,
  ].join("\n");
}

/** Which lenses to run for a repo. Default: all — every lens earns its place on any codebase. */
export function selectLenses(_diagnosis) {
  return LENSES.map((l) => l.id); // heuristic hook for future stack-specific trimming (diagnosis unused for now)
}

/** Build the full panel plan (deterministic for a given lensIds + seed). */
export function buildPlan(target, lensIds, seed = 0) {
  const panel = assignPanel(lensIds && lensIds.length ? lensIds : null, seed);
  return {
    target, seed,
    lensIds: panel.map((a) => a.lens),
    lenses: panel.map((a) => ({
      lens: a.lens, focus: a.focus,
      lead: a.lead.name, coordinator: a.coordinator.name, authority: a.authority.name,
      finderPrompt: finderPrompt(a, target),
    })),
  };
}

/**
 * Verifier prompts for a lens's findings. Rebuilds the SAME full panel (lensIds+seed)
 * and picks this lens, so the coordinator identity matches the plan exactly.
 */
export function verifierPromptsFor(lensId, allLensIds, seed, findings) {
  const panel = assignPanel(allLensIds && allLensIds.length ? allLensIds : null, seed || 0);
  const a = panel.find((p) => p.lens === lensId) || panel[0];
  return (findings || []).map((f) => ({ finding: f, prompt: verifierPrompt(a, f) }));
}

/**
 * Aggregate the board's per-lens results into one ranked ledger + decision.
 * lensResults: [{ lens, findings:[...], verdicts:[{i, verdict, note}] }].
 * Drops REFUTED (the adversary won), tags survivors with their lens, then runs the
 * shared review-gate synthesis (dedupe / rank / decide).
 */
export function aggregateLensResults(lensResults) {
  const survivors = [];
  for (const lr of lensResults || []) {
    if (!lr || typeof lr !== "object") continue; // tolerate a null/primitive element instead of crashing
    const pairs = (lr.findings || []).map((f, i) => {
      // Coerce the verdict index — LLM/JSON may emit i as the string "0"; strict === would miss it and leak a REFUTED finding.
      const v = (lr.verdicts || []).find((x) => Number(x.i) === i) || { verdict: "SUSPECTED" };
      return { finding: { ...f, sources: [lr.lens] }, verdict: v };
    });
    survivors.push(...mergeVerdicts(pairs));
  }
  return aggregate([{ source: "board", findings: survivors }]);
}

// ---- CLI ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const list = (n) => { const v = opt(n); return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : null; };
  const seed = parseInt(opt("seed", "0"), 10) || 0;
  const write = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
  const stdin = () => { try { return JSON.parse(readFileSync(0, "utf8") || "[]"); } catch { return null; } };

  if (cmd === "plan") {
    write(buildPlan(opt("target", process.cwd()), list("lenses") || selectLenses({}), seed));
  } else if (cmd === "verify-prompt") {
    const findings = stdin();
    if (!Array.isArray(findings)) { write({ error: "stdin must be a JSON array of findings" }); process.exit(2); }
    write(verifierPromptsFor(opt("lens"), list("lenses"), seed, findings));
  } else if (cmd === "aggregate") {
    const lensResults = stdin();
    if (!Array.isArray(lensResults)) { write({ error: "stdin must be a JSON array of lensResults" }); process.exit(2); }
    write(aggregateLensResults(lensResults));
  } else {
    write({ usage: "plan --target <dir> [--lenses a,b] [--seed N] | verify-prompt --lens X --lenses a,b,c [--seed N] | aggregate (internal — prefer `orchestrate.mjs board-aggregate`, which persists the round)", lenses: LENSES.map((l) => l.id) });
    process.exit(cmd ? 2 : 0);
  }
}
