#!/usr/bin/env node
/**
 * refactor-ruthless-editor — checklist + reduction meter. Zero deps.
 *   node checklist.mjs                              -> prints the step checklist as JSON
 *   node checklist.mjs --measure <before> <after>   -> word counts + reduction % for two text files
 */
import { readFileSync } from "node:fs";

const SKILL = "refactor-ruthless-editor";
const PHASE = "docs";

const STEPS = [
  { id: 1, step: "scope", detail: "Collect this run's prose deliverables; exclude code blocks, identifiers, quotes, keep-verbatim spans." },
  { id: 2, step: "inventory", detail: "List every fact: claims, numbers, paths, decisions, caveats, instructions. This is the loss detector." },
  { id: 3, step: "cut-passes", detail: "Throat-clearing -> hedges -> duplicates -> dead adjectives -> passive detours -> heading echoes -> list compression." },
  { id: 4, step: "measure", detail: "Run --measure before/after; ~30% is the target, never a quota." },
  { id: 5, step: "verify-zero-loss", detail: "Re-walk the inventory; any missing fact reverts its cut (never re-paraphrase from memory)." },
  { id: 6, step: "log", detail: "Fill templates/output.md: stats + edit log + inventory confirmation." },
];

const words = (t) => (t.match(/\S+/g) || []).length;

const argv = process.argv.slice(2);
const mi = argv.indexOf("--measure");
if (mi >= 0) {
  const [bf, af] = [argv[mi + 1], argv[mi + 2]];
  let outObj;
  try {
    const b = words(readFileSync(bf, "utf8"));
    const a = words(readFileSync(af, "utf8"));
    outObj = { skill: SKILL, wordsBefore: b, wordsAfter: a, reductionPct: b ? +(((b - a) / b) * 100).toFixed(1) : 0, target: "≈30%, zero information loss" };
  } catch (e) {
    outObj = { skill: SKILL, error: `could not read files: ${e.message}`, usage: "--measure <beforeFile> <afterFile>" };
  }
  process.stdout.write(JSON.stringify(outObj, null, 2) + "\n");
} else {
  process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, steps: STEPS }, null, 2) + "\n");
}
