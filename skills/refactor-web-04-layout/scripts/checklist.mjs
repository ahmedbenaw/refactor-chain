#!/usr/bin/env node
/**
 * refactor-web-04-layout — step checklist + rule index. Zero deps.
 *   node checklist.mjs           -> step checklist as JSON
 *   node checklist.mjs --rules   -> full rule index (LAY + INT) as JSON
 */
const SKILL = "refactor-web-04-layout";
const PHASE = "do-the-work (web lane, step 4 of 5)";
const NEXT = "refactor-web-05-naming";

const STEPS = [
  { id: 1, step: "detect-stack", detail: "Ask the harness signals registry for framework (React/Vue/Svelte/Angular/DOM) and styling approach; never guess from extensions alone." },
  { id: 2, step: "resolve-tokens", detail: "Bind size roles (dialog.sm/md/lg, drawer.narrow/wide, space.step, scrollbar.*, toast.duration) to the project's tokens; propose tokens only if none exist." },
  { id: 3, step: "pick-mode", detail: "check (audit) or generate (scaffold). Confirm scope: files/routes, and LAY, INT, or both." },
  { id: 4, step: "run-check", detail: "Apply LAY-01..09 and INT-01..08 per references/method.md; each finding = rule ID + severity + location + behavior-preserving fix." },
  { id: 5, step: "or-generate", detail: "Pick archetype (workspace / full-screen detail / drawer / dialog), build token-first in the detected framework, self-audit against all rules." },
  { id: 6, step: "report", detail: "Emit templates/output.md: must-fix, should-fix, suggestions, already-compliant, token bindings." },
  { id: 7, step: "fix-with-consent", detail: "Apply fixes smallest-first, re-render/re-test after each; multi-file fixes need an explicit yes; undo stays one step away." },
  { id: 8, step: "verify-gate", detail: "Re-check: zero ERRORs in scope, build green; record via orchestrate.mjs step-done --skill refactor-web-04-layout before advancing." },
];

const RULES = [
  { id: "LAY-01", severity: "ERROR", name: "Surface hierarchy", summary: "full-screen > drawer > dialog; children open equal-or-lighter surfaces only; dialogs are leaves" },
  { id: "LAY-02", severity: "WARNING", name: "Breadcrumb discipline", summary: "depth <= 10, width <= 60% of content area, long trails collapse the middle" },
  { id: "LAY-03", severity: "WARNING", name: "Working-region framing", summary: "one consistent outer frame separating content from chrome; no stray boundary scrollbar" },
  { id: "LAY-04", severity: "ERROR", name: "Dialog proportions", summary: "widths from dialog.sm/md/lg tokens; height clamped; ratio floor ~0.6; centered" },
  { id: "LAY-05", severity: "WARNING", name: "Drawer proportions", summary: "narrow/wide tokens; <= half viewport; read-only = no backdrop, editing = guarded backdrop; no horizontal scroll" },
  { id: "LAY-06", severity: "ERROR", name: "Pinned action area", summary: "toolbar flex-shrink:0; body flex:1 + overflow-y:auto; actions never scroll away" },
  { id: "LAY-07", severity: "WARNING", name: "Leading-edge alignment", summary: "first tab and first toolbar button share the same leading inset" },
  { id: "LAY-08", severity: "ERROR", name: "Full-bleed coverage", summary: "full-screen subpage occludes its parent incl. tab strip; fills height" },
  { id: "LAY-09", severity: "SUGGESTION", name: "Spacing rhythm", summary: "card/section gaps from the spacing scale; divider between actions and data" },
  { id: "INT-01", severity: "WARNING", name: "Quiet unified scrollbars", summary: "one global style; thumb hidden at rest, shown on pointer-over; slim + rounded via tokens" },
  { id: "INT-02", severity: "WARNING", name: "Menu overflow", summary: "no horizontal menu scroll; long labels ellipsize + reveal on hover; fixed token width" },
  { id: "INT-03", severity: "ERROR", name: "Notification policy", summary: "non-blocking toasts top-center; success auto-dismisses, failure sticks; 2-line clamp; hover pauses; blocking dialogs only for destructive acts" },
  { id: "INT-04", severity: "SUGGESTION", name: "Hover affordance", summary: "every interactive element answers hover: tone shift, underline, row/node/option wash" },
  { id: "INT-05", severity: "WARNING", name: "Truncate and reveal", summary: "width-constrained text ellipsizes AND exposes the full value (tooltip/title)" },
  { id: "INT-06", severity: "SUGGESTION", name: "Idle lock", summary: "user may shorten but not exceed admin default; lock replaces hard front-end timeout" },
  { id: "INT-07", severity: "WARNING", name: "Display-unit switching", summary: "page-wide, remembered, inherited by child surfaces; pinned fields opt out" },
  { id: "INT-08", severity: "SUGGESTION", name: "Surface-state memory", summary: "nav collapse, pane widths, default selection persist and restore" },
];

const out = process.argv.includes("--rules")
  ? { skill: SKILL, rules: RULES }
  : { skill: SKILL, phase: PHASE, next: NEXT, steps: STEPS,
      verifyGate: "orchestrate.mjs step-done --skill refactor-web-04-layout (harness records the verify delta)" };
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
