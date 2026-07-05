#!/usr/bin/env node
// Principles registry: schema completeness + recommendation mapping (Workstream W0.4).
import { PRINCIPLES, recommendPrinciples } from "../scripts/lib/principles.mjs";

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- schema: every entry has id, plain-language pitch, and a valid appliesTo ----
for (const p of PRINCIPLES) {
  t(`schema: ${p.id || "?"}`,
    typeof p.id === "string" && p.id &&
    typeof (p.pitch || p.plain) === "string" &&
    (p.appliesTo === "agnostic" || (Array.isArray(p.appliesTo) && p.appliesTo.length > 0)),
    p);
}

// ---- the plan's frozen inventory: 13 agnostic + all family-mapped areas ----
const ids = new Set(PRINCIPLES.map((p) => p.id));
for (const id of ["solid", "grasp", "dry-kiss-yagni", "separation-of-concerns", "cohesion-coupling",
                  "law-of-demeter", "composition-over-inheritance", "cqs", "layering", "cupid",
                  "unix", "fail-fast", "least-astonishment",
                  "functional-core", "otp", "raii-ownership", "design-by-contract", "misra-safety",
                  "data-oriented", "twelve-factor", "ddd-tactical", "component-purity",
                  "posix-conventions", "set-based-sql", "reproducibility"])
  t(`inventory: ${id}`, ids.has(id), [...ids]);
t("agnostic count = 13", PRINCIPLES.filter((p) => p.appliesTo === "agnostic").length === 13, null);

// ---- recommendation mapping per stack ----
const rec = (langs) => recommendPrinciples(langs).recommended;
const beam = rec([{ id: "elixir", family: "beam" }]);
t("BEAM stack → otp + functional-core", beam.includes("otp") && beam.includes("functional-core"), beam);
t("BEAM stack → agnostic baseline always in", beam.includes("solid") && beam.includes("cupid"), beam);
const cpp = rec([{ id: "cpp", family: "systems" }]);
t("C++ stack → raii + misra + data-oriented", ["raii-ownership", "misra-safety", "data-oriented"].every((x) => cpp.includes(x)), cpp);
const java = rec([{ id: "java", family: "jvm" }]);
t("Java stack → ddd + twelve-factor, NOT otp", java.includes("ddd-tactical") && java.includes("twelve-factor") && !java.includes("otp"), java);
const none = recommendPrinciples([]);
t("empty stack → agnostic only, others offered", none.recommended.length === 13 && none.other.length === PRINCIPLES.length - 13, { rec: none.recommended.length, other: none.other.length });

console.log(`\n${fail === 0 ? "✅" : "❌"} principles: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
