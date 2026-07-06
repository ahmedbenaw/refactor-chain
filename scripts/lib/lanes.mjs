/**
 * refactor-chain — the lane definitions, single-sourced. Both orchestrate.mjs (which builds the
 * authoritative state.steps) and conductor.mjs (which annotates/emits a chain) import from here, so
 * the two can never drift. Pure data + one pure helper; zero deps, deterministic.
 *
 * The lane→steps logic mirrors orchestrate.buildSteps EXACTLY (skill ids only; orchestrate wraps
 * each id in its step object). Any change here is caught by the veteran non-regression test.
 */
export const PRINCIPLES_STEP = "refactor-code-principles";
export const GATE = "refactor-review-gate";

export const BACKEND = ["refactor-backend-01-architecture", "refactor-backend-02-module-rename", "refactor-backend-03-dao-model", "refactor-backend-04-service", "refactor-backend-05-controller", "refactor-backend-06-dependency-guard", "refactor-backend-07-api-naming", "refactor-backend-08-common-extract", "refactor-backend-09-code-optimize"];
export const WEB = ["refactor-web-01-structure", "refactor-web-02-modules", "refactor-web-03-components", "refactor-web-04-layout", "refactor-web-05-naming"];
export const UI = ["refactor-ui-tokens", "refactor-ui-visual", "refactor-ui-components", "refactor-ui-a11y"];
export const UI_MOBILE = ["refactor-ui-tokens", "refactor-ui-mobile", "refactor-ui-components", "refactor-ui-a11y"];

/** The ordered lane skill ids for a diagnosis (NOT the wrapped step objects). Mirrors buildSteps. */
export function laneSkills(d) {
  const lane = d && d.lane;
  if (lane === "debug") return [`refactor-${d.case}`];
  if (lane === "backend") return [...BACKEND];
  if (lane === "web") return [...WEB];
  if (lane === "ui") return d.platform === "mobile" ? [...UI_MOBILE] : [...UI];
  return []; // code lane (or unknown) — principles-only
}

/** The full chain a lane runs: lane skills, then code-principles (except debug), then the gate. */
export function laneChain(d) {
  const lane = (d && d.lane) || "code";
  const steps = laneSkills(d);
  const withPrinciples = lane === "debug" ? [...steps] : [...steps, PRINCIPLES_STEP];
  return { lane, steps: withPrinciples, gate: GATE };
}
