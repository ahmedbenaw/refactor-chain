#!/usr/bin/env node
// Skill registry: SPINE constant, catalog completeness (superset of installed refactor-*),
// deterministic resolve (shuffle-invariant + total tie-break), and OPEN-SET explore (C0).
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SPINE, CATALOG, canonicalSkills, resolve, explore, capabilitiesOf } from "../scripts/lib/skill-registry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- SPINE: the actual chain the user ran (discipline pack + dropped review-chain members) ----
t("SPINE is a non-empty array", Array.isArray(SPINE) && SPINE.length > 0, SPINE);
for (const id of ["refactor-guidelines-contract", "refactor-live-truth", "refactor-scope-fence",
                  "refactor-adversarial-verify", "refactor-rules", "refactor-memory",
                  "refactor-red-team", "refactor-whats-wrong", "refactor-audit-trail",
                  "refactor-write-up", "refactor-publish-checklist"])
  t(`SPINE includes ${id}`, SPINE.includes(id), SPINE);
// every SPINE member must be catalogued (internal id or external /-name)
const catIds = new Set(CATALOG.map((e) => e.id));
for (const id of SPINE) t(`SPINE member catalogued: ${id}`, catIds.has(id), id);

// ---- CATALOG schema ----
for (const e of CATALOG)
  t(`schema: ${e.id || "?"}`,
    typeof e.id === "string" && e.id &&
    (e.kind === "internal" || e.kind === "external") &&
    Array.isArray(e.capabilities) && e.capabilities.length > 0, e);

// ---- catalog-superset guard: EVERY installed refactor-* must be catalogued (else a new skill ships uncatalogued) ----
const installedRefactor = readdirSync(join(HERE, "../skills")).filter((n) => n.startsWith("refactor-"));
t("58 refactor-* skills on disk", installedRefactor.length === 58, installedRefactor.length);
for (const id of installedRefactor)
  t(`catalog superset: ${id}`, CATALOG.some((e) => e.id === id && e.kind === "internal"), id);

// ---- external skills present ----
for (const id of ["/test-driven-development", "/write-spec", "/sprint-plan", "/opportunity-solution-tree",
                  "/write-query", "/tech-debt", "/root-cause-tracing", "/architecture",
                  "/code-review", "/review-implementing", "/ruthless-editor", "/humanizer"])
  t(`external catalogued: ${id}`, CATALOG.some((e) => e.id === id && e.kind === "external"), id);

// ---- determinism: shuffle installedSkills order → identical resolve output (f(inputs), not f(runs)) ----
const task = { capabilities: ["review", "security"] };
const installedA = ["/tech-debt", "/code-review", "/write-spec", "refactor-security", "refactor-review-gate"];
const installedB = [...installedA].reverse();
const rA = JSON.stringify(resolve(task, installedA));
const rB = JSON.stringify(resolve(task, installedB));
t("resolve is shuffle-invariant", rA === rB, { rA, rB });
t("resolve is repeatable", rA === JSON.stringify(resolve(task, installedA)), null);

// ---- canonical order + total tie-break: canonicalSkills sorts by id, stable ----
const canon = canonicalSkills(["zeta", "alpha", "mid"]).map((s) => s.id);
t("canonicalSkills sorts by id", JSON.stringify(canon) === JSON.stringify(["alpha", "mid", "zeta"]), canon);

// ---- resolve filters external to installed (open set on the installed side) ----
const debtTask = { capabilities: ["debt", "review"] };
const onlyDebt = resolve(debtTask, ["/tech-debt", "refactor-review-gate"]);
t("resolve external includes installed /tech-debt", onlyDebt.external.includes("/tech-debt"), onlyDebt.external);
t("resolve external excludes NON-installed /write-spec", !onlyDebt.external.includes("/write-spec"), onlyDebt.external);
t("resolve internal includes review-gate", onlyDebt.internal.includes("refactor-review-gate"), onlyDebt.internal);

// ---- OPEN-SET explore: a skill the catalog never enumerated is matched by its DESCRIPTION ----
const exotic = [{ id: "superpowers:systematic-debugging", description: "root cause analysis and systematic debugging of failures" }];
const disc = explore(exotic);
const found = disc.find((d) => d.id === "superpowers:systematic-debugging");
t("explore discovers an uncatalogued skill", !!found, disc);
t("explore matches it to root-cause capability", found && found.capabilities.includes("root-cause"), found);
t("explore marks it not-known (open-set discovery, not catalog)", found && found.known === false, found);
// explore is deterministic under shuffle too
const exotic2 = [{ id: "b-skill", description: "architecture review" }, { id: "a-skill", description: "security audit" }];
t("explore is shuffle-invariant", JSON.stringify(explore(exotic2)) === JSON.stringify(explore([...exotic2].reverse())), null);

// ---- capabilitiesOf ----
t("capabilitiesOf known internal", capabilitiesOf("refactor-red-team").includes("red-team"), capabilitiesOf("refactor-red-team"));
t("capabilitiesOf unknown → []", Array.isArray(capabilitiesOf("nope")) && capabilitiesOf("nope").length === 0, null);

console.log(`\n${fail === 0 ? "✅" : "❌"} skill-registry: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
