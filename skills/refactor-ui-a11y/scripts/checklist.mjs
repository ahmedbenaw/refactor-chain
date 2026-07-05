#!/usr/bin/env node
// checklist.mjs — prints the refactor-ui-a11y step checklist as JSON.
// Zero deps. Usage: node checklist.mjs [--pretty]
const pretty = process.argv.includes('--pretty');
const checklist = {
  skill: 'refactor-ui-a11y',
  phase: 'do-the-work',
  lane: 'ui',
  role: 'gate',
  standard: 'WCAG 2.2 AA',
  prerequisite: 'refactor-ui-components (+ tokens + visual/mobile)',
  next: ['refactor-code-principles', 'review gate'],
  behaviorPreserving: true,
  steps: [
    { id: 'audit', label: 'Audit against WCAG 2.2 AA across contrast, focus, semantics/ARIA, keyboard, reflow, dynamic-type' },
    { id: 'contrast', label: 'Text ≥4.5:1 (large ≥3:1), non-text ≥3:1; fix via nearest passing token step' },
    { id: 'semantics', label: 'Native elements first; ARIA only where needed; names/roles/states exposed' },
    { id: 'keyboard-focus', label: 'Full keyboard operability, logical focus order, visible focus, no traps, skip-link, managed focus' },
    { id: 'reflow', label: 'Reflow at 320px with no horizontal scroll; targets ≥24px; 200% zoom usable; viewport allows zoom' },
    { id: 'dynamic-type', label: 'Mobile text respects OS text-size without truncation/overlap' },
    { id: 'verify-gate', label: 'Automated (axe/audit) + manual keyboard & screen-reader spot-check clean; emit PASS/BLOCK verdict' },
  ],
  gates: [
    'Preserve content/behavior: make it reachable/perceivable/operable, do not change copy/data/actions',
    'Native HTML over ARIA; incorrect ARIA is worse than none',
    'Contrast fixed via passing token steps, not off-scale colors',
    'GATE: unmet core AA criterion is surfaced as a Blocker, never silently passed',
  ],
  criteriaChecked: ['1.1.1','1.4.1','1.4.3','1.4.4','1.4.10','1.4.11','1.4.13','2.1.1','2.1.2','2.4.3','2.4.6','2.4.7','2.4.11','2.5.7','2.5.8','3.3.1','3.3.2','4.1.2'],
};
process.stdout.write(JSON.stringify(checklist, null, pretty ? 2 : 0) + '\n');
