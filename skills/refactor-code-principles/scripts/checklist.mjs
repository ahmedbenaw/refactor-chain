#!/usr/bin/env node
// refactor-code-principles — step checklist (zero-dep).
// Usage:
//   node checklist.mjs                       -> prints the step checklist as JSON
//   node checklist.mjs --recommend <ids...>  -> also prints the principle registry's
//                                               recommendation for the detected language ids
//                                               (e.g. --recommend typescript react)
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const STEPS = [
  {
    id: 1,
    key: "detect-stack",
    title: "Detect the stack",
    detail:
      "Run diagnose.mjs classify --target <dir> (or reuse the active chain's diagnosis via orchestrate.mjs status). Note detected languages and families.",
    gate: false,
  },
  {
    id: 2,
    key: "get-recommendation",
    title: "Get the principle recommendation",
    detail:
      "Run checklist.mjs --recommend <lang-ids>: prints the agnostic baseline, the family-mapped principles for this stack, and the off-family options.",
    gate: false,
  },
  {
    id: 3,
    key: "decision-window",
    title: "THE DECISION WINDOW — user picks the principle set",
    detail:
      "One mid-chat checkpoint before any edit. Options: (a) accept the recommendation, (b) mix and match from the full menu, (c) deliberately unconventional with each risk stated plainly and confirmed once. Autopilot takes the recommendation and announces it out loud.",
    gate: true,
  },
  {
    id: 4,
    key: "record-choice",
    title: "Record the choice",
    detail:
      "Note the chosen set, who chose it (user or autopilot), and any accepted risks — in chain state (orchestrate.mjs advance --note) and in the principle-choice record of templates/output.md.",
    gate: false,
  },
  {
    id: 5,
    key: "diagnose-through-lens",
    title: "Diagnose through the chosen lens",
    detail:
      "Read the target code; for each chosen principle hunt its smells (per references/method.md) and tag each finding as smell @ file:line -> principle.",
    gate: false,
  },
  {
    id: 6,
    key: "checkpoint-apply-verify",
    title: "Apply through the checkpoint -> apply -> verify loop",
    detail:
      "Per finding: checkpoint/commit -> one reversible behavior-preserving move -> verify (type-check/build/existing tests vs. the baseline). Clean keeps; drift rolls back and retries smaller within the self-heal budget. One transformation per commit.",
    gate: false,
  },
  {
    id: 7,
    key: "report",
    title: "Report",
    detail:
      "Fill templates/output.md: the principle-choice record, each smell -> principle -> transform -> proof-of-identical-behavior, then the deliberately-not-done list.",
    gate: false,
  },
];

const CONTRACT =
  "Hard contract: behavior is preserved — outputs, side effects, error text, ordering, precision, timing. No edits before the decision window closes.";

// Registry lib dirs to try, in order: the plugin's OWN copy (single source of truth via
// CLAUDE_PLUGIN_ROOT) first, then the installed skills-dir copy for standalone installs.
function registryDirs() {
  const dirs = [];
  if (process.env.CLAUDE_PLUGIN_ROOT) dirs.push(join(process.env.CLAUDE_PLUGIN_ROOT, "scripts", "lib"));
  dirs.push(join(homedir(), ".claude", "skills", "refactor-chain", "scripts", "lib"));
  return dirs;
}

async function recommend(ids) {
  let lastErr;
  for (const dir of registryDirs()) {
    try {
      const principles = await import(pathToFileURL(join(dir, "principles.mjs")).href);
      const languages = await import(pathToFileURL(join(dir, "languages.mjs")).href);
      // Resolve each detected id to its family so the family-mapped principles actually
      // surface (recommendPrinciples keys on BOTH id and family — dropping family left
      // JS/Python/Go/Elixir with an empty or truncated set in the decision window).
      const famOf = new Map((languages.LANGUAGES || []).map((L) => [L.id, L.family]));
      const detected = ids.map((id) => ({ id, family: famOf.get(id) }));
      return { source: join(dir, "principles.mjs"), detected, recommendation: principles.recommendPrinciples(detected) };
    } catch (err) { lastErr = err; }
  }
  return {
    error: `registry unavailable (${lastErr?.code || lastErr?.message}) — present the agnostic baseline manually: SOLID, GRASP, DRY/KISS/YAGNI, separation of concerns, cohesion/coupling, Demeter, composition-over-inheritance, CQS, layering, CUPID, Unix, fail-fast, least astonishment.`,
  };
}

const args = process.argv.slice(2);
const out = { skill: "refactor-code-principles", contract: CONTRACT, steps: STEPS };

const ri = args.indexOf("--recommend");
if (ri !== -1) {
  const ids = args.slice(ri + 1).filter((a) => !a.startsWith("--"));
  out.recommend = await recommend(ids.length ? ids : ["unknown"]);
}

console.log(JSON.stringify(out, null, 2));
