# Output scaffolds — feature-module boundaries & anatomy (step 02)

## A. Audit report

```markdown
# Module-boundary audit — {project} — {date}

Framework: {React/Vue/Svelte/Angular} · Feature layer: `{features|modules|…}/`
Modules inventoried: {N} · Size ceiling: {10} views (configurable)

## Boundary decisions (quorum matrix, 3 of 5)
| Candidate | Business indep. | Data boundary | Cohesion | Team owner | Reusability | Total | Decision |
|-----------|:---------------:|:-------------:|:--------:|:----------:|:-----------:|:-----:|----------|
| {orders}  | 1 | 1 | 1 | 1 | 0 | 4 | separate module |
| {invoices}| 1 | 1 | 1 | 0 | 0 | 3 | borderline → your call |

## Per-module anatomy (MOD-01…MOD-10)
| Module | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | Worst tier |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|-----------|
| {orders} | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | – | ✔ | OK |

## Violations & fixes
| # | Rule | Severity | Location | Fix |
|---|------|----------|----------|-----|
| 1 | encapsulation | ERROR | {OrdersList imports customers/api/customersApi} | route the call through `services/api/customers` |
| 2 | MOD-04 | ERROR | {module has no index entry} | add a single public entry file |

## Waivers (accepted exceptions)
| Module | Rule | Reason |
|--------|------|--------|
```

## B. Govern plan (requires explicit confirmation)

```markdown
# Module-boundary plan — {project}

Checkpoint: `orchestrate.mjs checkpoint --label pre-modules` ✔

## Splits / merges / moves
| # | Action | From | To | Import rewrites | Route/store updates |
|---|--------|------|-----|-----------------|---------------------|
| 1 | split | {lists/, forms/, details/} | {orders/, customers/} | {n} | {routes + store slice} |

Batches: {list} · routes and store registrations update in the same batch as the moves.
Reply "confirm" to execute, or name the rows to exclude.
```

## C. Standard module skeleton (framework-adaptive)

```
<feature-layer>/<domain-name>/        # kebab-case directory
├── <Views>.<ext>                     # PascalCase view components this module owns
├── api/
│   └── <domain>Api.<ext>             # this module's endpoints
├── types/
│   └── <domain>.<ext>                # data shapes; pairs 1:1 with api/
└── index.<ext>                       # the single public entry — the only importable surface
```

| Concept | React | Vue | Svelte | Angular |
|---------|-------|-----|--------|---------|
| Public entry | `index.ts` barrel | `index.ts` | `index.ts` | public-api file |
| Local state | hook / store slice | composable / store | store | service |
| Route link | route config | router record | route file | routing module |

After scaffolding: register routes in the framework layer, export the public entry, then
re-audit the new module against MOD-01…MOD-10 (must pass with 0 ERROR before delivery).

## D. Completion report

```markdown
# Module-boundary fix — completion

| Verification | Result |
|--------------|--------|
| Baseline green after each batch | PASS/FAIL |
| Zero cross-module internal imports (incl. sibling api/) | PASS/FAIL |
| Every module passes MOD-01…MOD-10 or has a waiver | PASS/FAIL |
| Routes resolve; store registrations intact | PASS/FAIL |

Modules created/split/merged: {list} · Import rewrites: {n} · No page-type module remains ✔
→ `orchestrate.mjs advance --target <dir>`, then step 03 (components).
```
