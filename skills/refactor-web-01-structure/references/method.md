# refactor-web-01-structure — full method

The audit half of this skill is read-only. The governance half moves files, and
only ever behind a confirmed plan plus a harness checkpoint.

## 1. Framework detection and vocabulary map

Detection is single-sourced from the harness:

```
node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs classify --target <dir>
```

Read `signals.framework` (`react` | `next` | `vue` | `svelte` | `angular` |
`react-native`). Never guess from file extensions when the signal is available.

| Concept | React / Next | Vue / Nuxt | Svelte / Kit | Angular |
|---|---|---|---|---|
| Reusable stateful logic | `hooks/` — `useXxx.ts` | `composables/` — `useXxx.ts` or `use-xxx.ts` | `lib/hooks` or runes modules | injectable services / signal stores |
| Feature code | `features/` | `modules/` or `features/` | `lib/features` + routes | feature `NgModule`s / standalone feature dirs |
| Router layer | React Router config or file-based routes | `router/` (vue-router) | `routes/` (file-based) | `*-routing.module.ts` / route configs |
| Store layer | Redux / Zustand / Jotai stores | `store/` (Pinia/Vuex) | svelte stores | NgRx / signal stores |
| App wiring | providers, `main.tsx` | `plugins/`, `directives/`, `main.ts` | hooks.server/client | `app.config.ts`, providers |

Use the repo's existing folder names when they map cleanly (e.g. `features/`
counts as the feature layer; `hooks/` counts as the composable layer). The rule
is the *layering*, not the literal folder name.

## 2. Reference layout

```
src/
├── assets/            # static assets
│   ├── styles/        #   global styles + tokens variables file
│   ├── icons/
│   └── images/
├── components/        # SHARED components only
│   ├── common/        #   app-agnostic, reusable anywhere
│   ├── layout/        #   page skeleton (shell, nav, footer)
│   └── business/      #   domain-aware but cross-feature
├── hooks/  | composables/   # shared reusable logic (use* naming)
├── features/ | modules/     # feature layer — see skill 02
├── <framework layer>/       # router, store, plugins, directives, config
├── services/
│   ├── http/          # HTTP client instance + interceptors
│   └── api/           # shared endpoint definitions
├── utils/             # pure helpers
└── types/             # shared type definitions
```

## 3. Rule set (STR-01 … STR-08)

Severities: **blocker** (breaks layering or naming contracts — must fix),
**warning** (should fix; degrade gracefully), **info** (advisory).

| ID | Rule | Severity |
|---|---|---|
| STR-01 | Layer completeness: the standard layers exist (or a documented equivalent); no stray top-level grab-bag dirs (`misc/`, `stuff/`, page dumps directly under `src/`) | blocker |
| STR-02 | Assets split into `styles` / `icons` / `images`; a token variables file exists under styles | warning |
| STR-03 | Shared components tiered `common` / `layout` / `business` (or the repo's documented equivalent tiers) | blocker |
| STR-04 | Composite components (component + styles + tests + subparts) live in their own folder with an entry file, not as loose sibling files | warning |
| STR-05 | Framework layer split by concern (router / store / plugins / directives / config as applicable to the ecosystem) | warning |
| STR-06 | Services split into `http/` (client + interceptors) and `api/` (shared endpoint defs) | warning |
| STR-07 | Hook/composable naming: every file in the shared-logic layer exports `useXxx`; filename matches the repo convention (`useXxx.ts` camelCase or `use-xxx.ts` kebab) — one convention per repo | blocker |
| STR-08 | Allowed-imports matrix holds (below) | blocker |

## 4. Allowed-imports matrix

Direction of dependency — rows import columns:

| importer ↓ / imported → | components | hooks | services | utils | types | features | framework |
|---|---|---|---|---|---|---|---|
| **features**  | yes | yes | yes | yes | yes | **no** (no sibling internals) | no |
| **components**| yes (own tier or lower) | yes | yes | yes | yes | **no** | no |
| **hooks**     | no | yes | yes | yes | yes | **no** | no |
| **services**  | no | no | yes | yes | yes | **no** | no |
| **utils**     | no | no | no | yes | yes | **no** | no |
| **framework** | yes | yes | yes | yes | yes | route registration ONLY | yes |

Detection: grep import statements per layer; resolve aliases from
`tsconfig`/`vite`/`webpack` config before judging. Report each violation with
file, line, and the downward-layer alternative (extract to shared layer, or
invert via props/events/context).

## 5. Audit procedure

1. Inventory directories and files under `src/` (respect `.gitignore`).
2. Evaluate STR-01…STR-07 from the tree; STR-08 from parsed imports.
3. Emit the report from `templates/output.md`: per-rule status, evidence
   (paths + lines), severity, concrete fix.
4. Order fixes: blockers first, then warnings grouped by directory so each
   move batch is small and reviewable.

## 6. Governance (move plan) procedure

1. Draft the plan: table of `from → to`, plus every import line that must
   change (including alias updates and barrel re-exports).
2. `orchestrate.mjs checkpoint --label pre-structure --target <dir>`.
3. Present the plan; **wait for explicit confirmation**. Remind the user the
   tree is checkpointed and reversible.
4. Execute one batch at a time: move files, rewrite imports, update
   path-alias config if layers were renamed, run type-check/build.
5. Re-run the baseline suite. Identical pass-set → keep; drift → roll back the
   batch and retry differently (max 3 attempts, then surface the blocker).

## 7. Scaffold procedure

1. Confirm project name, framework, and which layers are wanted.
2. Generate the tree from the scaffold section of `templates/output.md`,
   including: token variables file (`assets/styles/tokens.*`), HTTP client
   stub with interceptors, `utils/` and `types/` entry files, and empty
   tiered component dirs with `.gitkeep`.
3. Self-check: run the STR-01…STR-08 audit against the generated tree; fix
   until zero blockers/warnings before handing it over.
