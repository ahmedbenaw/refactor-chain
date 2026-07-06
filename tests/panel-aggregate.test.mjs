/**
 * refactor-chain — panel-aggregate.mjs test suite. Proves the shared synthesis
 * core (normalize / dedupe / rank / decide / aggregate / adversarial merge) that
 * both the review gate and the review board depend on.
 * Run: node tests/panel-aggregate.test.mjs
 */
import { normalizeSeverity, dedupeFindings, rankFindings, decide, aggregate, applyVerdict, mergeVerdicts } from "../scripts/lib/panel-aggregate.mjs";

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- normalizeSeverity: many vocabularies → one scale ----
t("critical → blocker", normalizeSeverity("critical") === "blocker");
t("CRITICAL (case) → blocker", normalizeSeverity("CRITICAL") === "blocker");
t("medium → worth-fixing", normalizeSeverity("medium") === "worth-fixing");
t("nit → optional", normalizeSeverity("nit") === "optional");
t("unknown word → worth-fixing default", normalizeSeverity("wat") === "worth-fixing");
t("empty → worth-fixing default", normalizeSeverity("") === "worth-fixing");

// ---- dedupe: same where+cause merges, keeps strongest severity + union sources + longest fix ----
{
  const merged = dedupeFindings([
    { where: "a.js:10", cause: "sql injection", severity: "worth-fixing", confidence: 0.5, fix: "escape", sources: ["security"] },
    { where: "a.js:10", cause: "SQL injection", severity: "critical", confidence: 0.9, fix: "use a parameterized query instead", sources: ["red-team"] },
    { where: "b.js:20", cause: "unused var", severity: "optional", confidence: 0.4, fix: "remove", sources: ["correctness"] },
  ]);
  t("dedupe collapses same where+cause", merged.length === 2, merged.length);
  const a = merged.find((f) => f.where === "a.js:10");
  t("dedupe keeps strongest severity", a.severity === "blocker", a.severity);
  t("dedupe unions sources", a.sources.includes("security") && a.sources.includes("red-team"), a.sources);
  t("dedupe keeps longest (clearest) fix", a.fix === "use a parameterized query instead", a.fix);
  t("dedupe keeps max confidence", a.confidence === 0.9, a.confidence);
}

// ---- rank: blockers first; behavior-changed above severity peers; then confidence ----
{
  const ranked = rankFindings([
    { where: "x:1", cause: "nit", severity: "optional", confidence: 0.9 },
    { where: "x:2", cause: "bug", severity: "blocker", confidence: 0.6 },
    { where: "x:3", cause: "behavior changed", severity: "blocker", confidence: 0.6, behaviorChanged: true },
    { where: "x:4", cause: "weak", severity: "worth-fixing", confidence: 0.9 },
  ]);
  t("rank: behavior-changed blocker sorts to the very top", ranked[0].where === "x:3", ranked.map((f) => f.where));
  t("rank: other blocker next", ranked[1].where === "x:2", ranked[1]?.where);
  t("rank: worth-fixing before optional", ranked[2].where === "x:4" && ranked[3].where === "x:1", ranked.map((f) => f.where));
}
{
  const ranked = rankFindings([
    { where: "y:1", cause: "a", severity: "blocker", confidence: 0.5 },
    { where: "y:2", cause: "b", severity: "blocker", confidence: 0.95 },
  ]);
  t("rank: within tier, higher confidence first", ranked[0].where === "y:2", ranked.map((f) => f.where));
}

// ---- decide: go / fix-these-first / no-go ----
t("decide go when no blockers", decide([{ severity: "worth-fixing" }, { severity: "optional" }]).decision === "go");
t("decide fix-these-first when blockers are confident + fixable",
  decide([{ severity: "blocker", confidence: 0.9, fix: "do x" }]).decision === "fix-these-first");
t("decide no-go when a blocker is low-confidence",
  decide([{ severity: "blocker", confidence: 0.3, fix: "maybe" }]).decision === "no-go");
t("decide no-go when a blocker has no fix",
  decide([{ severity: "blocker", confidence: 0.9, fix: "" }]).decision === "no-go");

// ---- aggregate: full pipeline, list vs appendix split ----
{
  const out = aggregate([
    { source: "security", findings: [{ where: "s:1", cause: "secret", severity: "critical", confidence: 0.9, fix: "rotate" }] },
    { source: "perf", findings: [{ where: "p:1", cause: "n^2", severity: "medium", confidence: 0.7, fix: "index" }] },
    { source: "style", findings: [{ where: "c:1", cause: "naming", severity: "nit", confidence: 0.5, fix: "rename" }] },
  ]);
  t("aggregate decision reflects the blocker", out.decision === "fix-these-first", out.decision);
  t("aggregate list excludes optional", out.list.length === 2 && out.list.every((f) => f.severity !== "optional"), out.list.map((f) => f.severity));
  t("aggregate appendix holds the optional tail", out.appendix.length === 1 && out.appendix[0].where === "c:1", out.appendix);
  t("aggregate total counts all", out.total === 3, out.total);
  t("aggregate tags source from wrapper", out.list[0].sources.includes("security"), out.list[0].sources);
}

// ---- adversarial merge: REFUTED dropped, CONFIRMED/SUSPECTED survive ----
t("applyVerdict drops REFUTED", applyVerdict({ where: "a:1" }, { verdict: "REFUTED" }) === null);
t("applyVerdict keeps CONFIRMED", applyVerdict({ where: "a:1" }, { verdict: "CONFIRMED" })?.verdict === "CONFIRMED");
t("applyVerdict defaults to SUSPECTED", applyVerdict({ where: "a:1" }, {})?.verdict === "SUSPECTED");
{
  const survivors = mergeVerdicts([
    { finding: { where: "a:1", cause: "x" }, verdict: { verdict: "CONFIRMED" } },
    { finding: { where: "a:2", cause: "y" }, verdict: { verdict: "REFUTED", note: "not reachable" } },
    { finding: { where: "a:3", cause: "z" }, verdict: { verdict: "SUSPECTED" } },
  ]);
  t("mergeVerdicts drops the refuted one", survivors.length === 2 && !survivors.some((f) => f.where === "a:2"), survivors.map((f) => f.where));
}

// ---- regressions from the board's own dogfood (v4.6.0) ----
t("applyVerdict trims a whitespace-padded verdict → REFUTED still dropped", applyVerdict({ where: "a:1" }, { verdict: " REFUTED " }) === null);
t("applyVerdict trims a padded/lowercased CONFIRMED", applyVerdict({ where: "a:1" }, { verdict: " confirmed " })?.verdict === "CONFIRMED");
{
  const merged = dedupeFindings([
    { where: "a.js:10", cause: "x", severity: "blocker", confidence: 0.5, fix: "f", sources: ["s1"] },
    { where: "a.js:10 ", cause: "x", severity: "worth-fixing", confidence: 0.5, fix: "f", sources: ["s2"] },
  ]);
  t("dedupe trims where — a trailing space no longer splits one item into two", merged.length === 1, merged.length);
}
{
  const prefix = "the function returns null instead of throwing when the input collection is empty and";
  const merged = dedupeFindings([
    { where: "b.js:1", cause: prefix + " the cache is cold", severity: "blocker", confidence: 0.5, fix: "a" },
    { where: "b.js:1", cause: prefix + " the flag is off", severity: "blocker", confidence: 0.5, fix: "b" },
  ]);
  t("dedupe uses the full cause — 80-char-prefix twins stay distinct", merged.length === 2, merged.length);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} panel-aggregate: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
