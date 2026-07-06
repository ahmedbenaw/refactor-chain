#!/usr/bin/env node
// Conductor scheduler: composes spine + registry + spec-kit, partitions dispatch (parallel/
// sequential), covers degenerate lanes (code/debug), is deterministic (f(inputs)), and is
// read-only w.r.t. its inputs (C2).
import { conduct, partition, isFastPath } from "../scripts/lib/conductor.mjs";
import { laneChain, BACKEND, WEB, UI, UI_MOBILE } from "../scripts/lib/lanes.mjs";
import { SPINE } from "../scripts/lib/skill-registry.mjs";

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- lanes.mjs is the single source (must match the historical orchestrate constants) ----
t("BACKEND has 9 steps", BACKEND.length === 9, BACKEND.length);
t("WEB has 5 steps", WEB.length === 5, WEB.length);
t("UI has 4 steps", UI.length === 4 && UI_MOBILE.length === 4, [UI.length, UI_MOBILE.length]);

// ---- laneChain: every lane + the two degenerate ones ----
t("backend lane → 9 + principles", laneChain({ lane: "backend" }).steps.length === 10, laneChain({ lane: "backend" }).steps);
t("web lane → 5 + principles", laneChain({ lane: "web" }).steps.length === 6, laneChain({ lane: "web" }).steps);
t("ui mobile lane uses UI_MOBILE", laneChain({ lane: "ui", platform: "mobile" }).steps.includes("refactor-ui-mobile"), laneChain({ lane: "ui", platform: "mobile" }).steps);
t("code lane (empty laneSteps) → [principles]", JSON.stringify(laneChain({ lane: "code" }).steps) === JSON.stringify(["refactor-code-principles"]), laneChain({ lane: "code" }).steps);
t("debug lane → single fix step, no principles", JSON.stringify(laneChain({ lane: "debug", case: "whats-wrong" }).steps) === JSON.stringify(["refactor-whats-wrong"]), laneChain({ lane: "debug", case: "whats-wrong" }).steps);

// ---- conduct: composition ----
const diag = { lane: "code", case: "code", platform: "cli", confidence: 0.8, inScope: true };
const task = { id: "C0", phase: "plan", capabilities: ["review", "architecture"] };
const installed = ["/tech-debt", "/architecture", "/code-review"];
const c = conduct(task, diag, "careful", installed);
t("conduct.spine === SPINE", c.spine === SPINE, null);
t("conduct emits the lane chain ending in the gate", c.chain[c.chain.length - 1] === "refactor-review-gate", c.chain);
t("perTask has the 6 fields", ["rootCause", "guards", "reviewLens", "boardLens", "specKit", "externalSkills"].every((k) => k in c.perTask), Object.keys(c.perTask));
t("perTask.specKit maps the phase", c.perTask.specKit.includes("/plan") || c.perTask.specKit.includes("/tasks"), c.perTask.specKit);
t("perTask.guards always includes scope-fence", c.perTask.guards.includes("refactor-scope-fence"), c.perTask.guards);

// ---- dispatch partition: parallel non-empty for independent work; sequential ends at the gate ----
t("dispatch.parallel is non-empty", Array.isArray(c.dispatch.parallel) && c.dispatch.parallel.length > 0, c.dispatch.parallel);
t("dispatch.sequential ends at the gate", c.dispatch.sequential[c.dispatch.sequential.length - 1] === "refactor-review-gate", c.dispatch.sequential);
t("dispatch.parallel carries review lenses", c.dispatch.parallel.some((x) => String(x).startsWith("lens:")), c.dispatch.parallel);

// ---- determinism: byte-identical for same inputs; shuffle-invariant on installedSkills ----
t("conduct is repeatable", JSON.stringify(conduct(task, diag, "careful", installed)) === JSON.stringify(c), null);
t("conduct is shuffle-invariant on installed", JSON.stringify(conduct(task, diag, "careful", [...installed].reverse())) === JSON.stringify(c), null);

// ---- read-only w.r.t. inputs: a frozen diagnosis + task must not be mutated ----
const frozenDiag = Object.freeze({ lane: "debug", case: "web-performance", platform: "web", inScope: true });
const frozenTask = Object.freeze({ id: "X", phase: "gate", capabilities: Object.freeze(["performance"]) });
let threw = false;
try { conduct(frozenTask, frozenDiag, "autopilot", null); } catch { threw = true; }
t("conduct does not mutate frozen inputs", !threw, null);

// ---- fast path: single-step (debug / code) lanes trigger it ----
t("debug lane is fast-path", isFastPath(laneChain({ lane: "debug", case: "whats-wrong" })), null);
t("code lane is fast-path", isFastPath(laneChain({ lane: "code" })), null);
t("backend lane is NOT fast-path", !isFastPath(laneChain({ lane: "backend" })), null);
t("conduct surfaces fastPath boolean", typeof conduct({ id: "d", phase: "lane", capabilities: [] }, frozenDiag, "ask", null).fastPath === "boolean", null);

// ---- partition() is a pure helper ----
const p = partition({ capabilities: ["review"] }, { external: ["/tech-debt"] }, laneChain({ lane: "code" }));
t("partition returns {parallel, sequential}", Array.isArray(p.parallel) && Array.isArray(p.sequential), p);

console.log(`\n${fail === 0 ? "✅" : "❌"} conductor: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
