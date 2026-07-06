#!/usr/bin/env node
// refactor-ui-visual — step checklist (zero-dep).
// Usage:
//   node checklist.mjs                      -> full-pass checklist as JSON
//   node checklist.mjs --concern <name>     -> scoped run: echoes the scoped concern and its reference
//   node checklist.mjs --concern            -> lists the valid scoped concerns

const CONCERNS = {
  hierarchy: {
    reference: "references/hierarchy.md",
    summary:
      "Make elements stand out or fit in via size, weight, and contrast; de-emphasize secondary content rather than shouting the primary.",
  },
  typography: {
    reference: "references/typography.md",
    summary: "Type scale, sensible line-height, considered font selection/pairing.",
  },
  color: {
    reference: "references/color.md",
    summary:
      "Pick colors in HSL, manage saturation, ensure accessible contrast, build cohesive palettes over one-off values.",
  },
  layout: {
    reference: "references/layout-spacing.md",
    summary: "Grid, deliberate alignment, manage density with whitespace.",
  },
  spacing: {
    reference: "references/layout-spacing.md",
    summary: "Consistent spacing scale; give elements room to breathe; group with proximity.",
  },
};

const STEPS = [
  {
    id: 1,
    key: "feature-first",
    title: "Feature first",
    detail:
      "Identify the specific functional piece to improve (a form, a card) — do not start from the app shell, nav, or sidebar.",
  },
  {
    id: 2,
    key: "low-fidelity",
    title: "Low fidelity first",
    detail:
      "Solve layout and spacing in grayscale; ignore color, shadows, and fonts until structure is right.",
  },
  {
    id: 3,
    key: "define-systems",
    title: "Define restrictive systems",
    detail:
      "Establish scales for spacing, type, and color up front so every later choice is a pick from a scale, not an invention.",
  },
  {
    id: 4,
    key: "refine-by-concern",
    title: "Refine by concern",
    detail:
      "Full pass order: hierarchy -> layout/spacing -> typography -> color -> depth/polish. Scoped run: jump straight to the single concern and consult its reference.",
  },
  {
    id: 5,
    key: "polish-last",
    title: "Polish last",
    detail:
      "Depth, imagery, and finishing touches only after structure, type, and color are settled; keep one consistent light source and one chosen personality.",
  },
];

const GUARDRAIL =
  "Preserve semantics and content — restyle only; no arbitrary one-off values; happy path and feature first.";

const args = process.argv.slice(2);
const out = { skill: "refactor-ui-visual", guardrail: GUARDRAIL, steps: STEPS };

const ci = args.indexOf("--concern");
if (ci !== -1) {
  const name = (args[ci + 1] || "").toLowerCase();
  out.scopedConcerns = Object.keys(CONCERNS);
  if (name && CONCERNS[name]) {
    out.scope = { concern: name, ...CONCERNS[name] };
    out.note = `Scoped run: apply step 4 to '${name}' only; verify the other concerns are undisturbed.`;
  } else if (name) {
    out.error = `Unknown concern '${name}'. Valid: ${Object.keys(CONCERNS).join(", ")}.`;
    process.exitCode = 1;
  } else {
    out.note = "Pass one of the listed concerns to scope the run.";
  }
}

console.log(JSON.stringify(out, null, 2));
