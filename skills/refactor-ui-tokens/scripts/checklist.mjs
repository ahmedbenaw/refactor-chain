#!/usr/bin/env node
// checklist.mjs — prints the refactor-ui-tokens step checklist as JSON.
// Zero deps. Usage: node checklist.mjs [--pretty]
const pretty = process.argv.includes('--pretty');
const checklist = {
  skill: 'refactor-ui-tokens',
  phase: 'do-the-work',
  lane: 'ui',
  step: 1,
  prerequisite: 'plan (or none)',
  next: ['refactor-ui-visual', 'refactor-ui-mobile'],
  behaviorPreserving: true,
  steps: [
    { id: 'detect-system', label: 'Detect styling system (CSS/Tailwind/CSS-in-JS/SwiftUI/Compose/RN/Flutter)' },
    { id: 'inventory', label: 'Scan and bucket literal values by category (color/spacing/type/radius/shadow/z/duration)' },
    { id: 'cluster', label: 'Cluster near-duplicates and choose a restrictive scale per category' },
    { id: 'name', label: 'Name two tiers: primitives (value) + semantic aliases (role)' },
    { id: 'emit', label: 'Emit token file in the detected system format' },
    { id: 'migrate', label: 'Migrate call sites one category at a time, snapping to nearest step' },
    { id: 'drift-report', label: 'Report orphans, near-dupes, out-of-scale, contradictions' },
    { id: 'verify', label: 'Confirm pixel-preserving (visual diff) and token file builds' },
  ],
  gates: [
    'No silent pixel change: any snap that moves a pixel is surfaced and confirmed',
    'Components reference semantic tier only, never raw primitives',
    'Existing token names are extended, never renamed out from under call sites',
  ],
};
process.stdout.write(JSON.stringify(checklist, null, pretty ? 2 : 0) + '\n');
