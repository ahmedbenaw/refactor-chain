# Feature-module boundaries & anatomy — full method

This is the exhaustive rulebook behind `refactor-web-02-modules`. It carves the feature
layer into domain-driven modules with hard walls. The contract is **behavior preservation**:
boundaries and structure change; API endpoints, payloads, and business logic do not. It is
framework-adaptive — the feature layer is `features/` (React, Svelte), `modules/` (Vue),
or feature areas (Angular); router and store correspondence map to the detected ecosystem.

## 1. Load context

Resolve the framework and feature-layer location from the harness signals registry (step
01's report if present). Inventory every module directory before scoring anything.

## 2. Boundary decision — quorum matrix (3 of 5)

For each candidate boundary, score five signals. **Three or more of five → it is a
separate module.** Split by business domain, never by page type (no `lists/`, `forms/`,
`details/` modules).

| Signal | Question | Scores 1 when… |
|--------|----------|----------------|
| Business independence | Is it a distinct area of the product's domain? | it maps to a domain a stakeholder would name |
| Data boundary | Does it own its own data / entities / endpoints? | its API and types are its own, not borrowed |
| Cohesion | Do its screens and logic change together? | changes to it rarely touch other areas |
| Team ownership | Is there one clear owner? | one team or person is responsible for it |
| Reusability | Is it (or could it be) used independently? | it could be lifted out with a clear seam |

A score of exactly 3 is **borderline**: present it as a choice, not a silent decision. A
score of 4–5 is a confident separate module; 0–2 means it belongs inside another module.

Domain language rule: module names come from the business vocabulary the code already
uses, never an invented taxonomy.

## 3. Anatomy audit — MOD-01 … MOD-10

Each module is graded against ten rules, each ERROR (blocks), WARN, or SUGGESTION.

| ID | Rule | Severity |
|----|------|----------|
| MOD-01 | Contains its views/pages (the screen components it owns). | ERROR |
| MOD-02 | Has an `api/` layer for its own endpoints. | ERROR |
| MOD-03 | Has a `types/` layer for its own data shapes. | WARN |
| MOD-04 | Exposes exactly one public entry file (the only importable surface). | ERROR |
| MOD-05 | Module directory is kebab-case. | WARN |
| MOD-06 | View components are PascalCase. | WARN |
| MOD-07 | Respects the size ceiling (default 10 views, configurable); over it triggers a sub-domain split. | WARN |
| MOD-08 | `api/` files and `types/` files pair one-to-one. | SUGGESTION |
| MOD-09 | Sub-modules repeat the same anatomy (views + api + types + entry). | WARN |
| MOD-10 | A routed module has a route registration; a stateful one has a store slice / composable. | ERROR |

### Module anatomy — the standard shape

```
<feature-layer>/<domain-name>/
├── <Views>/            # the screen components this module owns (PascalCase files)
├── api/                # this module's own endpoint calls
├── types/              # this module's own data shapes (pairs 1:1 with api/)
└── index.<ext>         # the single public entry — the only importable surface
```

Casing: module directories are kebab-case; view components are PascalCase. Sub-modules
under a large domain repeat this exact shape.

## 4. Encapsulation — hard walls

- **No module imports another module's internals — including its `api/` layer.** The only
  importable file of a module is its public entry, and only where the architecture
  explicitly permits.
- Cross-module needs route through the shared layers instead: shared `services/api/`
  (shared endpoints), shared hooks / composables, the store, or route navigation.
- A direct reach into a sibling's `api/`, `types/`, or view internals is a violation; the
  fix moves the shared call behind a shared layer so both modules use one door.

## 5. Report

Emit `templates/output.md`: the matrix scores per candidate boundary, a per-module MOD-01…
MOD-10 table, and a violation list with concrete fixes.

## 6. Govern (confirmation-gated)

1. Checkpoint (`orchestrate.mjs checkpoint --label pre-modules`).
2. Present the split / merge / move plan **with** the import-rewrite list and the
   route/store-update list.
3. Get explicit confirmation.
4. Execute in batches. Routes and store registrations are updated in the **same batch** as
   the file moves — never deferred.
5. Re-run the baseline after each batch; a red baseline rolls that batch back.

## 7. Scaffold (on request)

Generate a standard module from the skeleton in `templates/output.md` in the detected
framework's idiom, register its routes in the framework layer, export the public entry,
then re-audit the new module against the same MOD-01…MOD-10 rules before delivery.

## 8. Framework vocabulary map

| Concept | React | Vue | Svelte | Angular |
|---------|-------|-----|--------|---------|
| Feature layer | `features/` | `modules/` | route groups | feature areas |
| View unit | component | component | component / route | component |
| Public entry | `index.ts` barrel | `index.ts` | `index.ts` | public-api / module file |
| Local state | hook / store slice | composable / store | store | service |
| Routing link | route config | router record | route file | routing module |

The rules are identical across frameworks; only the vocabulary and file idiom differ.

## 9. Verification

- Baseline green after each batch.
- Grep confirms **zero** cross-module internal imports, including sibling `api/` files.
- Every module passes MOD-01…MOD-10 or carries an accepted waiver.
- Routes resolve; store registrations are intact.

Then `orchestrate.mjs advance --target <dir>`; the verify gate blocks on drift.
