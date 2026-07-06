#!/usr/bin/env node
/**
 * refactor-write-up — checklist. Zero deps.
 *   node checklist.mjs             -> prints the step checklist as JSON
 *   node checklist.mjs --state <dir> -> summarizes completed steps for the write-up
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILL = "refactor-write-up";
const PHASE = "docs";

const STEPS = [
  { id: 1, step: "load-before", detail: "Read the refactor-understand Project Profile snapshot (the 'before' baseline)." },
  { id: 2, step: "load-after", detail: "Read state.json completed steps + git diff --stat / git log since the first checkpoint." },
  { id: 3, step: "diff-human", detail: "Diff before->after at a human level: reorganized / renamed / extracted / hardened. Translate, don't dump." },
  { id: 4, step: "write-two-layers", detail: "Plain-language narrative first, then a technical appendix." },
  { id: 5, step: "behavior-promise", detail: "State behavior-preservation explicitly, backed by the verify deltas; be honest about any self-heal." },
  { id: 6, step: "fill-template", detail: "Fill templates/output.md into the Change Report." },
];

function summarize(dir) {
  const st = join(dir, ".refactor-chain", "state.json");
  if (!existsSync(st)) return { active: false };
  try {
    const s = JSON.parse(readFileSync(st, "utf8"));
    return {
      active: true, lane: s.diagnosis?.lane, phase: s.phase,
      steps: (s.steps || []).map((x) => ({ skill: x.skill, status: x.status, healed: (x.retries || 0) > 0, delta: x.verify?.delta || null })),
      checkpoints: (s.checkpoints || []).map((c) => c.label),
    };
  } catch { return { active: false, error: "unreadable state.json" }; }
}

const argv = process.argv.slice(2);
const si = argv.indexOf("--state");
if (si >= 0) {
  process.stdout.write(JSON.stringify({ skill: SKILL, ...summarize(argv[si + 1] || process.cwd()) }, null, 2) + "\n");
} else {
  process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, steps: STEPS }, null, 2) + "\n");
}
