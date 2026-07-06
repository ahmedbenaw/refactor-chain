#!/usr/bin/env node
/**
 * refactor-chain — shared finding aggregator.
 *
 * The deterministic core of synthesis: take findings from many lenses/reviewers,
 * normalize their severities onto one scale, de-duplicate, rank by impact-then-
 * confidence, and emit a single go / fix-these-first / no-go decision. This is the
 * executable form of the review-gate's method (§4–6) so the gate AND the review
 * board share ONE definition that cannot drift.
 *
 * Zero deps, pure functions. Also runnable as a CLI:
 *   node panel-aggregate.mjs aggregate < findings.json
 *   (stdin = [{source, findings:[{where,cause,severity,confidence,fix,behaviorChanged?}]}])
 *
 * A finding is: { where:"file:line", cause, severity, confidence:0..1, fix,
 *                 sources:[], behaviorChanged?, verdict? }
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// The shared three-level scale (lower index = more severe).
export const SEVERITY_ORDER = ["blocker", "worth-fixing", "optional"];
export const SEVERITY = { blocker: 0, "worth-fixing": 1, optional: 2 };

// Map the many severity vocabularies (per source) onto the shared scale.
const SEV_ALIAS = {
  blocker: "blocker", critical: "blocker", crit: "blocker", high: "blocker",
  severe: "blocker", "behavior-changed": "blocker", "behaviour-changed": "blocker",
  "worth-fixing": "worth-fixing", medium: "worth-fixing", moderate: "worth-fixing",
  warning: "worth-fixing", warn: "worth-fixing", major: "worth-fixing",
  optional: "optional", low: "optional", minor: "optional", nit: "optional", info: "optional",
};

/** Normalize any source's severity word onto the shared scale (default: worth-fixing). */
export function normalizeSeverity(raw) {
  if (!raw) return "worth-fixing";
  return SEV_ALIAS[String(raw).toLowerCase().trim()] || "worth-fixing";
}

const sevRank = (s) => (s in SEVERITY ? SEVERITY[s] : SEVERITY["worth-fixing"]);

// LLM JSON is loosely typed: confidence often arrives as the STRING "0.9", behaviorChanged
// as "false", verdict padded/cased. Normalize so a string value aggregates identically to a
// native one (the string-typing class that flipped decisions and corrupted ranking).
const normConfidence = (v) => { const c = Number(v); return Number.isFinite(c) && c >= 0 && c <= 1 ? c : 0.5; };
const normBool = (v) => { if (typeof v === "string") { const s = v.trim().toLowerCase(); return !(s === "" || s === "false" || s === "0" || s === "no"); } return !!v; };
const verdictRank = (x) => (x === "CONFIRMED" ? 2 : x === "SUSPECTED" ? 1 : 0); // CONFIRMED beats SUSPECTED on merge
// Key on the trimmed where + the FULL normalized cause. (Truncating the cause let
// distinct findings sharing an 80-char prefix collide; severity is deliberately NOT
// in the key so the same cause at different severities still merges across lenses.)
const dedupeKey = (f) => `${String(f.where || "?").trim()}|${String(f.cause || f.summary || "").toLowerCase().replace(/\s+/g, " ").trim()}`;

/**
 * De-duplicate: two findings are one item when they share a file:line/construct AND
 * the same underlying cause. Merge — strongest severity, union of sources, clearest
 * (longest) fix, max confidence, behaviorChanged sticky.
 */
export function dedupeFindings(findings) {
  const byKey = new Map();
  for (const raw of findings || []) {
    const sev = normalizeSeverity(raw.severity);
    const f = {
      where: raw.where || "?",
      cause: raw.cause || raw.summary || "",
      severity: sev,
      confidence: normConfidence(raw.confidence),
      fix: raw.fix || "",
      sources: [...new Set(raw.sources || [])],
      behaviorChanged: normBool(raw.behaviorChanged),
      ...(raw.verdict ? { verdict: String(raw.verdict).trim().toUpperCase() } : {}),
    };
    const key = dedupeKey(f);
    const cur = byKey.get(key);
    if (!cur) { byKey.set(key, f); continue; }
    cur.severity = sevRank(f.severity) < sevRank(cur.severity) ? f.severity : cur.severity;
    cur.sources = [...new Set([...cur.sources, ...f.sources])];
    cur.confidence = Math.max(cur.confidence, f.confidence);
    if (f.fix.length > cur.fix.length) cur.fix = f.fix;
    cur.behaviorChanged = cur.behaviorChanged || f.behaviorChanged;
    // reconcile verdict on merge: a CONFIRMED duplicate must not be masked by a SUSPECTED
    // survivor that happened to be inserted first.
    if (verdictRank(f.verdict) > verdictRank(cur.verdict)) cur.verdict = f.verdict;
  }
  return [...byKey.values()];
}

/**
 * Rank by impact then confidence. Behavior-preservation is privileged: a
 * behavior-changed finding sorts above its severity peers (a refactor's whole
 * promise is "same behavior").
 */
export function rankFindings(findings) {
  return [...(findings || [])].sort((a, b) => {
    const as = sevRank(a.severity), bs = sevRank(b.severity);
    if (as !== bs) return as - bs;                                   // blockers first
    const ab = a.behaviorChanged ? 0 : 1, bb = b.behaviorChanged ? 0 : 1;
    if (ab !== bb) return ab - bb;                                   // behavior-changed first within a tier
    return (b.confidence || 0) - (a.confidence || 0);               // then higher confidence
  });
}

/** Decide go / fix-these-first / no-go from the ranked set. */
export function decide(findings) {
  const blockers = (findings || []).filter((f) => f.severity === "blocker");
  if (blockers.length === 0) return { decision: "go", blockers: 0 };
  // A blocker that is low-confidence OR has no clear fix needs a human/design call → no-go.
  const needsDesign = blockers.some((f) => (f.confidence || 0) < 0.6 || !f.fix);
  return { decision: needsDesign ? "no-go" : "fix-these-first", blockers: blockers.length };
}

/**
 * Full pipeline: flatten sources → dedupe → rank → decide. Returns the one calm list
 * (blocker + worth-fixing), the optional appendix, and the decision.
 */
export function aggregate(sources) {
  const flat = [];
  for (const s of sources || []) for (const f of s.findings || []) flat.push({ ...f, sources: f.sources || (s.source ? [s.source] : []) });
  const ranked = rankFindings(dedupeFindings(flat));
  const { decision, blockers } = decide(ranked);
  return {
    decision, blockers, total: ranked.length,
    list: ranked.filter((f) => f.severity !== "optional"),
    appendix: ranked.filter((f) => f.severity === "optional"),
  };
}

/**
 * Adversarial merge (the review board's Coordinator pass): pair each finder finding
 * with its verifier verdict. REFUTED is dropped; CONFIRMED/SUSPECTED survive, tagged.
 */
export function applyVerdict(finding, verdict) {
  const v = String(verdict?.verdict || "SUSPECTED").trim().toUpperCase(); // trim: LLM JSON often pads the verdict word
  if (v === "REFUTED") return null;
  return { ...finding, verdict: v, verifierNote: verdict?.note || "" };
}
export function mergeVerdicts(pairs) {
  return (pairs || []).map(({ finding, verdict }) => applyVerdict(finding, verdict)).filter(Boolean);
}

// ---- CLI (space-safe main check: pathToFileURL encodes spaces/specials; a raw file://${argv[1]}
// comparison silently no-ops on a path with a space, the exact class board.mjs already fixed) ----
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cmd = process.argv[2] || "aggregate";
  let input = "";
  try { input = readFileSync(0, "utf8"); } catch { /* no stdin */ }
  let data = [];
  try { data = input.trim() ? JSON.parse(input) : []; } catch { process.stdout.write(JSON.stringify({ error: "invalid JSON on stdin" }) + "\n"); process.exit(2); }
  const write = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
  if (cmd === "aggregate") write(aggregate(data));
  else if (cmd === "dedupe") write(dedupeFindings(data));
  else if (cmd === "rank") write(rankFindings(data));
  else { write({ usage: "aggregate|dedupe|rank" }); process.exit(2); }
}
