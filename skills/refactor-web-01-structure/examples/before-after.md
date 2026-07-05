# Worked example — restructuring a tangled React `src/`

## Before

```
src/
├── App.tsx
├── api.ts                      # axios instance + 40 endpoint fns, one file
├── components/
│   ├── OrderTable.tsx          # order-domain table, imported only by orders pages
│   ├── Navbar.tsx
│   ├── Button.tsx
│   ├── Button.css
│   └── useDebounce.ts          # a hook living in components/
├── pages/
│   ├── OrdersPage.tsx          # imports ../components/OrderTable
│   ├── CustomerPage.tsx        # imports ../pages/OrdersPage (page→page!)
│   └── helpers.ts
├── redux/store.ts
└── misc/
    ├── format.ts
    └── colors.ts               # 30 hardcoded hex constants
```

## Audit findings

| Rule | Severity | Evidence | Fix |
|---|---|---|---|
| STR-01 | blocker | `misc/` grab-bag; no `hooks/`, `features/`, `types/` layers | create layers; dissolve `misc/` |
| STR-02 | warning | no `assets/styles/`; `colors.ts` is an ad-hoc palette | create `assets/styles/tokens.css` (see refactor-ui-tokens) |
| STR-03 | blocker | `components/` untiered; `OrderTable` is feature-private, not shared | tier `common`/`layout`; move `OrderTable` into the orders feature |
| STR-04 | warning | `Button.tsx` + `Button.css` loose siblings | `components/common/Button/{index.tsx,Button.css}` |
| STR-06 | warning | `api.ts` mixes HTTP client and endpoints | `services/http/client.ts` + `services/api/` |
| STR-07 | blocker | `useDebounce.ts` lives in `components/` | move to `hooks/useDebounce.ts` |
| STR-08 | blocker | `CustomerPage` imports `OrdersPage` (feature→feature internals) | route via shared layer or link by route path |

## Confirmed move plan (excerpt)

| From | To | Imports rewritten |
|---|---|---|
| `components/useDebounce.ts` | `hooks/useDebounce.ts` | 6 |
| `components/OrderTable.tsx` | `features/orders/components/OrderTable.tsx` | 2 |
| `components/Button.*` | `components/common/Button/` | 11 |
| `api.ts` | `services/http/client.ts` + `services/api/orders.ts`, `customers.ts` | 17 |
| `misc/format.ts` | `utils/format.ts` | 4 |

## After

```
src/
├── assets/styles/tokens.css
├── components/
│   ├── common/Button/{index.tsx, Button.css}
│   └── layout/Navbar.tsx
├── hooks/useDebounce.ts
├── features/
│   ├── orders/    {pages/, components/OrderTable.tsx, api.ts, types.ts, index.ts}
│   └── customers/ {pages/, api.ts, types.ts, index.ts}
├── framework/
│   ├── router/index.tsx        # registers feature routes
│   └── store/index.ts
├── services/{http/client.ts, api/}
├── utils/format.ts
└── types/index.ts
```

**Why:** the feature→feature import became a router link (`CustomerPage` now
navigates to the orders route instead of rendering `OrdersPage` directly), so
the dependency arrow points at the framework layer, not a sibling feature.
Baseline re-run: identical pass-set; type-check clean. Behavior unchanged —
every change was a move plus an import rewrite.
