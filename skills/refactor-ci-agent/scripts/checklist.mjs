#!/usr/bin/env node
/**
 * refactor-ci-agent — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-ci-agent",
  phase: "ship/verify — conditional on CI",
  prerequisite: "a workflow step consumes the composite action (plugin-root action.yml)",
  next: "humans read the report; interactive chain sessions do any actual refactoring",
  hardLine: "report-only in every mode — the action never edits, pushes, merges, or approves",
  modes: {
    deterministic: "default; zero keys — diagnose.mjs classify + lib/guidelines.mjs audit + orchestrate.mjs doctor → report.md → job summary (+ optional PR comment)",
    agent: "opt-in; requires agent-cmd (the USER's own agent CLI + credentials); bounded read-only prompt; output capped at 20000 bytes; failure leaves the deterministic report standing",
  },
  steps: [
    { id: 1, title: "Choose the mode", do: "Default to deterministic (no secrets, two-minute setup). Agent mode only when explicitly wanted and the user has their own CLI + key.", gate: "Mode decision recorded; agent mode has a non-empty agent-cmd." },
    { id: 2, title: "Wire the workflow", do: "checkout → the pinned action with target/mode/comment inputs; permissions: contents: read (+ pull-requests: write only if commenting).", gate: "Action pinned to a SHA; least-privilege permissions block present." },
    { id: 3, title: "Secrets hygiene", do: "Keys in GitHub Secrets → env on the one step that needs them; never in inputs, agent-cmd, logs, report, or comment.", gate: "No credential material in the workflow file or any readable surface." },
    { id: 4, title: "Comment etiquette", do: "comment: 'true' only with a GITHUB_TOKEN on pull_request events; rely on the built-in marker <!-- refactor-chain-readiness-report --> for one edited-in-place comment.", gate: "Exactly one report comment per PR across re-runs." },
    { id: 5, title: "Verify a run", do: "Job summary shows the signal table + ranked gaps; workspace git status clean; agent section (if any) present and byte-capped.", gate: "Report published, repo untouched, no secrets leaked." },
  ],
  guardrails: [
    "No bundled agent, no bundled key — agent mode fails fast without agent-cmd.",
    "A failed agent step must not erase the deterministic signal.",
    "Job summary and PR comment are public surfaces — nothing secret flows into them.",
    "Comment spam is a bug: one marker, one comment, PATCH in place.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
