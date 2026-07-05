#!/usr/bin/env node
/**
 * refactor-artifacts-sync — checklist + artifact finder. Zero deps.
 *   node checklist.mjs             -> prints the step checklist as JSON
 *   node checklist.mjs --find <dir> -> which of the 4 durable artifacts exist / are missing
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const SKILL = "refactor-artifacts-sync";
const PHASE = "docs";

const STEPS = [
  { id: 1, step: "locate", detail: "Find architecture.md / flows.md / permissions.md / tests-map.md (docs/, root, or project convention)." },
  { id: 2, step: "gather-reality", detail: "Read the write-up Change Report + git diff + state.json to know exactly what moved/renamed/re-layered." },
  { id: 3, step: "diff-per-artifact", detail: "For each artifact, diff doc vs current code; update ONLY the drifted parts." },
  { id: 4, step: "preserve-prose", detail: "Keep human-written context, rationale, and diagrams intact." },
  { id: 5, step: "create-if-missing", detail: "Offer to scaffold any absent artifact from templates/<artifact>.md (ask first)." },
  { id: 6, step: "record", detail: "Record which artifacts changed for the publish checklist." },
];

const ARTIFACTS = ["architecture.md", "flows.md", "permissions.md", "tests-map.md"];
const DIRS = [".", "docs", "doc", ".refactor-chain", "documentation"];

function find(dir) {
  return ARTIFACTS.map((a) => {
    const hit = DIRS.map((d) => join(dir, d, a)).find((p) => existsSync(p));
    return { artifact: a, present: !!hit, path: hit || null };
  });
}

const argv = process.argv.slice(2);
const fi = argv.indexOf("--find");
if (fi >= 0) {
  const dir = argv[fi + 1] || process.cwd();
  const found = find(dir);
  process.stdout.write(JSON.stringify({
    skill: SKILL, artifacts: found,
    missing: found.filter((f) => !f.present).map((f) => f.artifact),
  }, null, 2) + "\n");
} else {
  process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, artifacts: ARTIFACTS, steps: STEPS }, null, 2) + "\n");
}
