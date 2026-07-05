#!/usr/bin/env node
/**
 * refactor-ship — step checklist as JSON. Zero deps.
 * The commit/PR-body drafting helper lives in draft-ship.mjs (this skill's main script).
 *   node checklist.mjs   -> prints the step checklist as JSON
 */
const SKILL = "refactor-ship";
const PHASE = "ship";

const STEPS = [
  { id: 1, step: "guard-go", detail: "Confirm refactor-publish-checklist returned GO; else stop and surface blockers. Never ship a NO-GO." },
  { id: 2, step: "branch", detail: "If on default branch, create refactor/<lane>-<slug>; never commit the refactor to main/master." },
  { id: 3, step: "draft", detail: "node draft-ship.mjs --target <dir> -> conventional-commit message + PR/MR body; show for edits." },
  { id: 4, step: "commit", detail: "git add -A; commit with the drafted message + Co-Authored-By trailer." },
  { id: 5, step: "push-pr", detail: "Push the branch; open PR/MR via gh/glab if present, else print body + compare URL." },
  { id: 6, step: "ci", detail: "Let CI run (no wait-block); report where to watch it. Never merge, never force-push." },
  { id: 7, step: "handoff", detail: "Trigger refactor-improve (improvement retro) to close the run." },
];

process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, sourceControl: "agnostic (native git; gh/glab optional)", steps: STEPS }, null, 2) + "\n");
