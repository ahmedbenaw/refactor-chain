/**
 * refactor-chain — personas.mjs test suite. Proves the mandatory persona layer:
 * the rubric is complete and role-aware, assignment is deterministic (reproducible),
 * every veteran participates, and each lens gets a Lead + adversarial Coordinator.
 * Run: node tests/personas.test.mjs
 */
import { RUBRIC, PERSONAS, LEADS, COORDINATORS, AUTHORITY, LENSES, assignPanel, rubricText } from "../scripts/lib/personas.mjs";

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- roster integrity ----
t("has one authority (Lattner)", AUTHORITY?.id === "lattner", AUTHORITY);
t("three leads", LEADS.length === 3 && LEADS.every((p) => p.role === "lead"), LEADS.map((p) => p.id));
t("three coordinators", COORDINATORS.length === 3 && COORDINATORS.every((p) => p.role === "coordinator"), COORDINATORS.map((p) => p.id));
t("all seven named", PERSONAS.length === 7 && PERSONAS.every((p) => p.name && p.edge), PERSONAS.length);

// ---- the mandatory rubric is real and enforceable (not vibes) ----
t("rubric has a grumpy/Dutch voice", /grumpy|Dutch|BS/i.test(RUBRIC.voice), RUBRIC.voice);
t("rubric has multiple hard constraints", RUBRIC.constraints.length >= 5, RUBRIC.constraints.length);
t("rubric demands file:line anchoring", RUBRIC.constraints.some((c) => /file:line/.test(c)), true);
t("rubric demands CONFIRMED/SUSPECTED tagging", RUBRIC.constraints.some((c) => /CONFIRMED/.test(c) && /SUSPECTED/.test(c)), true);
t("rubric penalizes over-flagging", RUBRIC.constraints.some((c) => /over-flag/i.test(c)), true);
t("rubric bans shortcuts/duct-tape", RUBRIC.constraints.some((c) => /duct-tape|shortcut/i.test(c)), true);

// ---- rubricText: finder vs verifier ----
{
  const finder = rubricText("finder");
  const verifier = rubricText("verifier");
  t("finder rubric includes the constraints", /file:line/.test(finder) && /Non-negotiable/.test(finder), null);
  t("finder rubric has NO adversary mandate", !/REFUTE/i.test(finder), null);
  t("verifier rubric ADDS the adversary mandate", /REFUTE/i.test(verifier) && /survives only if/i.test(verifier), null);
}

// ---- assignment is DETERMINISTIC (reproducible for a given seed) ----
{
  const a = assignPanel(null, 0);
  const b = assignPanel(null, 0);
  t("same seed → identical assignment", JSON.stringify(a) === JSON.stringify(b), null);
  const c = assignPanel(null, 1);
  t("different seed → coordinators rotate", JSON.stringify(a.map((x) => x.coordinator.id)) !== JSON.stringify(c.map((x) => x.coordinator.id)), null);
}

// ---- every lens gets a Lead + Coordinator + the authority ----
{
  const panel = assignPanel(null, 0);
  t("one entry per lens", panel.length === LENSES.length, panel.length);
  t("every lens has a lead finder", panel.every((p) => p.lead?.role === "lead"), panel.map((p) => p.lead?.id));
  t("every lens has a coordinator verifier", panel.every((p) => p.coordinator?.role === "coordinator"), panel.map((p) => p.coordinator?.id));
  t("Lattner is authority over every lens", panel.every((p) => p.authority?.id === "lattner"), null);
  t("lens focus is carried through", panel.every((p) => typeof p.focus === "string" && p.focus.length > 0), null);
}

// ---- fit-based leads: preferLead is honored ----
{
  const panel = assignPanel(null, 0);
  const arch = panel.find((p) => p.lens === "architecture");
  const harness = panel.find((p) => p.lens === "harness");
  const docs = panel.find((p) => p.lens === "docs-truth");
  t("architecture led by Appel (fit)", arch?.lead?.id === "appel", arch?.lead?.id);
  t("harness led by Carmack (fit)", harness?.lead?.id === "carmack", harness?.lead?.id);
  t("docs-truth led by Newell (fit)", docs?.lead?.id === "newell", docs?.lead?.id);
}

// ---- across a full default panel, every veteran participates ----
{
  const panel = assignPanel(null, 0);
  const leadsUsed = new Set(panel.map((p) => p.lead.id));
  const coordsUsed = new Set(panel.map((p) => p.coordinator.id));
  t("all three leads participate", LEADS.every((l) => leadsUsed.has(l.id)), [...leadsUsed]);
  t("all three coordinators participate", COORDINATORS.every((c) => coordsUsed.has(c.id)), [...coordsUsed]);
}

// ---- subset of lenses still assigns cleanly ----
{
  const panel = assignPanel(["architecture", "harness", "docs-truth"], 0);
  t("subset panel sized to request", panel.length === 3, panel.length);
  t("subset entries all valid", panel.every((p) => p.lead && p.coordinator && p.focus), null);
}

// ---- subset invariance (v4.6.0 dogfood fix): a lens gets the SAME pair in a subset as in the full panel ----
{
  const full = assignPanel(null, 0);
  const sub = assignPanel(["harness"], 0);
  const hFull = full.find((p) => p.lens === "harness");
  t("a subset lens keeps the same lead+coordinator as the full panel",
    sub[0].lead.id === hFull.lead.id && sub[0].coordinator.id === hFull.coordinator.id,
    { sub: [sub[0].lead.id, sub[0].coordinator.id], full: [hFull.lead.id, hFull.coordinator.id] });
  // and still reproduces + rotates by seed
  t("subset assignment still rotates the coordinator by seed",
    assignPanel(["harness"], 0)[0].coordinator.id !== assignPanel(["harness"], 1)[0].coordinator.id, null);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} personas: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
