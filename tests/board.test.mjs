/**
 * refactor-chain — board.mjs conductor test suite. Proves the deterministic half of
 * the Review Board: reproducible plans, persona+rubric baked into every emitted
 * prompt, the verifier's coordinator matching the plan exactly, and correct
 * verdict-merge + aggregation of lens results.
 * Run: node tests/board.test.mjs
 */
import { buildPlan, finderPrompt, verifierPrompt, verifierPromptsFor, aggregateLensResults, selectLenses } from "../scripts/lib/board.mjs";
import { assignPanel } from "../scripts/lib/personas.mjs";

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- buildPlan is deterministic (reproducible) ----
{
  const a = buildPlan("/repo", null, 0);
  const b = buildPlan("/repo", null, 0);
  t("same target+seed → identical plan", JSON.stringify(a) === JSON.stringify(b), null);
  t("plan lists all default lenses", a.lenses.length === selectLenses({}).length, a.lenses.length);
  t("plan echoes its seed + lensIds", a.seed === 0 && Array.isArray(a.lensIds), a.seed);
}

// ---- every finder prompt bakes in persona + rubric + contract (data, not vibes) ----
{
  const plan = buildPlan("/repo", null, 0);
  const arch = plan.lenses.find((l) => l.lens === "architecture");
  t("architecture finder is led by Appel (fit)", arch.lead === "Andrew Appel", arch.lead);
  t("finder prompt names the lead persona", arch.finderPrompt.includes("Andrew Appel"), null);
  t("finder prompt injects the rubric (file:line rule)", /file:line/.test(arch.finderPrompt), null);
  t("finder prompt injects the grumpy voice", /grumpy|Dutch|BS/i.test(arch.finderPrompt), null);
  t("finder prompt carries the strict output contract", /OUTPUT CONTRACT/.test(arch.finderPrompt) && /JSON array/.test(arch.finderPrompt), null);
  t("finder prompt scopes to the lens focus", /module boundaries|coupling/.test(arch.finderPrompt), null);
  t("finder prompt names the authority (Lattner)", /Chris Lattner/.test(arch.finderPrompt), null);
}

// ---- the verifier's coordinator MUST match the plan's assignment (cross-call determinism) ----
{
  const seed = 2;
  const panel = assignPanel(null, seed);
  const lensIds = panel.map((p) => p.lens);
  const target = panel.find((p) => p.lens === "harness");
  const expectedCoordinator = target.coordinator.name;
  const vps = verifierPromptsFor("harness", lensIds, seed, [{ where: "scripts/x.mjs:10", cause: "unguarded parse", severity: "blocker", confidence: 0.9, fix: "wrap" }]);
  t("verifier prompt built for the finding", vps.length === 1, vps.length);
  t("verifier coordinator matches the plan's assignment", vps[0].prompt.includes(expectedCoordinator), { want: expectedCoordinator });
  t("verifier prompt carries the REFUTE mandate", /REFUTE/i.test(vps[0].prompt), null);
  t("verifier prompt embeds the finding under review", vps[0].prompt.includes("unguarded parse"), null);
  t("verifier prompt has its own output contract", /verdict.*CONFIRMED.*SUSPECTED.*REFUTED/s.test(vps[0].prompt) || /"verdict"/.test(vps[0].prompt), null);
}

// ---- aggregateLensResults: REFUTED dropped, survivors ranked + tagged, decision emitted ----
{
  const ledger = aggregateLensResults([
    { lens: "harness", findings: [
      { where: "a.mjs:1", cause: "real crash", severity: "blocker", confidence: 0.9, fix: "guard" },
      { where: "a.mjs:2", cause: "false alarm", severity: "blocker", confidence: 0.8, fix: "n/a" },
    ], verdicts: [{ i: 0, verdict: "CONFIRMED" }, { i: 1, verdict: "REFUTED", note: "not reachable" }] },
    { lens: "docs-truth", findings: [
      { where: "README.md:5", cause: "stale version", severity: "optional", confidence: 0.7, fix: "bump" },
    ], verdicts: [{ i: 0, verdict: "CONFIRMED" }] },
  ]);
  t("refuted finding is dropped", ledger.total === 2, ledger.total);
  t("confirmed blocker drives the decision", ledger.decision === "fix-these-first", ledger.decision);
  t("blocker leads the calm list", ledger.list[0].where === "a.mjs:1", ledger.list[0]?.where);
  t("optional survivor goes to the appendix", ledger.appendix.length === 1 && ledger.appendix[0].where === "README.md:5", ledger.appendix);
  t("survivors keep their lens as source", ledger.list[0].sources.includes("harness"), ledger.list[0]?.sources);
  t("missing verdict defaults to kept (SUSPECTED), not dropped",
    aggregateLensResults([{ lens: "x", findings: [{ where: "z:1", cause: "c", severity: "worth-fixing", confidence: 0.5, fix: "f" }], verdicts: [] }]).total === 1, null);
}

// ---- regressions from the board's own dogfood (v4.6.0) ----
{
  // a null lensResult element must not crash; a STRING verdict index "0" must still drop the REFUTED finding
  const ledger = aggregateLensResults([
    null,
    { lens: "x", findings: [{ where: "z:1", cause: "c", severity: "blocker", confidence: 0.9, fix: "f" }], verdicts: [{ i: "0", verdict: "REFUTED" }] },
  ]);
  t("aggregateLensResults tolerates a null element AND coerces a string verdict index", ledger.total === 0, ledger.total);
}
{
  // subset invariance: a lens's coordinator is the same whether the full panel or just that lens is planned
  const full = assignPanel(null, 0);
  const harnessCoord = full.find((p) => p.lens === "harness").coordinator.name;
  const vps = verifierPromptsFor("harness", ["harness"], 0, [{ where: "a:1", cause: "c", severity: "blocker", confidence: 0.9, fix: "f" }]);
  t("verify-prompt coordinator is subset-invariant (matches the full plan)", vps[0].prompt.includes(harnessCoord), harnessCoord);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} board: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
