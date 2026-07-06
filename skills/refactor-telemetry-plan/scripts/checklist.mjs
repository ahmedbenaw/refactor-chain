#!/usr/bin/env node
/**
 * refactor-telemetry-plan — checklist + applicability gate. Zero deps.
 *   node checklist.mjs                     -> prints the step checklist as JSON
 *   node checklist.mjs --applicable <dir>   -> {applicable, reason, signals:[{file, hits}]}
 *
 * Applicability: scans the git diff for analytics SDK calls / event-name / route-screen churn.
 */
import { execFileSync } from "node:child_process";

const SKILL = "refactor-telemetry-plan";
const PHASE = "docs (conditional)";

const STEPS = [
  { id: 1, step: "gate", detail: "Confirm the diff touches tracking (analytics calls, event names, route/screen changes); else not-applicable." },
  { id: 2, step: "inventory", detail: "List every tracking call / event name touched: added, removed, moved, or props changed." },
  { id: 3, step: "assess-risk", detail: "Classify each event safe / at-risk / broken; note dependent dashboards, funnels, experiments." },
  { id: 4, step: "flag-experiments", detail: "Call out any A/B test whose exposure or goal event lives in the changed code." },
  { id: 5, step: "propose-plan", detail: "For each changed flow: events that should fire, properties, and the fix for anything broken." },
  { id: 6, step: "report", detail: "Fill templates/output.md into a Tracking Plan + risk table." },
];

// Analytics SDK / event patterns.
const TRACK_PATTERNS = [
  /\b(track|capture|logEvent|trackEvent|record)\s*\(/,
  /\b(gtag|dataLayer|posthog|mixpanel|amplitude|analytics|segment|rudderanalytics|Snowplow)\b/,
  /['"`][a-z0-9_]+_(started|completed|viewed|clicked|submitted|opened|closed|failed)['"`]/i,
  /useTrack|withTracking|EVENTS?\.[A-Z_]+/,
];

function applicable(dir) {
  let diff = "";
  try { diff = execFileSync("git", ["diff", "-U0"], { cwd: dir }).toString() + execFileSync("git", ["diff", "-U0", "--cached"], { cwd: dir }).toString(); }
  catch { return { applicable: false, reason: "not a git repo / no diff", signals: [] }; }
  const changed = diff.split("\n").filter((l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---"));
  const signals = changed.filter((l) => TRACK_PATTERNS.some((re) => re.test(l)));
  return signals.length
    ? { applicable: true, reason: "tracking touched in diff (analytics calls / event names / route churn)", sampleHits: signals.slice(0, 8) }
    : { applicable: false, reason: "no tracking touched in diff — skill dormant", sampleHits: [] };
}

const argv = process.argv.slice(2);
const ai = argv.indexOf("--applicable");
if (ai >= 0) {
  const dir = argv[ai + 1] || process.cwd();
  process.stdout.write(JSON.stringify({ skill: SKILL, ...applicable(dir) }, null, 2) + "\n");
} else {
  process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, conditional: true, steps: STEPS }, null, 2) + "\n");
}
