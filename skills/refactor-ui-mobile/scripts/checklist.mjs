#!/usr/bin/env node
// checklist.mjs — prints the refactor-ui-mobile step checklist as JSON.
// Zero deps. Usage: node checklist.mjs [--pretty]
const pretty = process.argv.includes('--pretty');
const checklist = {
  skill: 'refactor-ui-mobile',
  phase: 'do-the-work',
  lane: 'ui',
  branch: 'mobile',
  prerequisite: 'refactor-ui-tokens (or plan)',
  next: ['refactor-ui-components', 'refactor-ui-a11y', 'refactor-code-principles'],
  behaviorPreserving: true,
  minimums: { iosTouchTargetPt: 44, androidTouchTargetDp: 48 },
  steps: [
    { id: 'detect-platform', label: 'Confirm platform + framework (SwiftUI/UIKit/Compose/RN/Flutter) and convention set (HIG/Material)' },
    { id: 'touch-targets', label: 'Ensure every interactive element ≥44pt (iOS) / 48dp (Android) with spacing; enlarge hit area not just glyph' },
    { id: 'safe-areas', label: 'Respect notch/Dynamic Island, status bar, home indicator, and keyboard via inset APIs' },
    { id: 'navigation', label: 'Use platform-native navigation (iOS tab+stack+back-swipe / Android bottom nav+system back); preserve destinations' },
    { id: 'scalable-type', label: 'Wire text to Dynamic Type / sp+font-scale; keep spacing on the token scale' },
    { id: 'polish', label: 'Native motion, correct control styles, haptics, list affordances — last' },
    { id: 'verify', label: 'Measure targets, insets on notched+gesture devices, largest text scale; snapshot compare' },
  ],
  gates: [
    'Presentation only: copy, behavior, data, and navigation destinations preserved',
    'No essential/interactive content under a hardware inset or the keyboard',
    'No cross-platform look mixing (Material on iOS / Cupertino on Android) unless confirmed',
    'Values pulled from tokens, no reintroduced literals',
  ],
};
process.stdout.write(JSON.stringify(checklist, null, pretty ? 2 : 0) + '\n');
