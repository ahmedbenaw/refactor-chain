#!/usr/bin/env node
// checklist.mjs — prints the refactor-ui-components step checklist as JSON.
// Zero deps. Usage: node checklist.mjs [--pretty]
const pretty = process.argv.includes('--pretty');
const checklist = {
  skill: 'refactor-ui-components',
  phase: 'do-the-work',
  lane: 'ui',
  prerequisite: 'refactor-ui-tokens + visual/mobile pass',
  next: ['refactor-ui-a11y', 'refactor-code-principles'],
  behaviorPreserving: true,
  defaultRegistry: 'shadcn/ui',
  usesMcp: 'mcp__Shadcn_UI__* when connected',
  steps: [
    { id: 'inventory', label: 'Inventory bespoke primitives and count divergent copies' },
    { id: 'init-registry', label: 'Pick registry (shadcn/ui default); init via shadcn MCP or CLI (components.json, cn())' },
    { id: 'theme-to-tokens', label: 'Map registry CSS-variable theme onto semantic tokens from refactor-ui-tokens' },
    { id: 'migrate-per-primitive', label: 'Replace one primitive at a time using a 1:1 prop/behavior map' },
    { id: 'compose-blocks', label: 'Adopt registry blocks for repeated page shapes (forms/auth/dashboards/tables)' },
    { id: 'delete-dead-code', label: 'Delete the old bespoke primitive; remove dangling imports' },
    { id: 'verify', label: 'Build; prop/behavior map satisfied; theme resolves to tokens; interaction diff intended-only' },
  ],
  gates: [
    'Behavior identical: props/events/controlled-state mapped 1:1',
    'Registry themed to project tokens, never default look',
    'Compose around the registry, never fork its source',
    'One primitive migrated and verified before the next',
  ],
};
process.stdout.write(JSON.stringify(checklist, null, pretty ? 2 : 0) + '\n');
