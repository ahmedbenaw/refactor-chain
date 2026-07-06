# Structure audit report — {{project}}

- **Framework detected:** {{framework}} (via harness signals registry)
- **Vocabulary in use:** {{hooks|composables}}, {{features|modules}}, {{router/store equivalents}}
- **Scope:** `{{src-root}}` · **Date:** {{date}} · **Baseline:** {{green|missing}}

## Summary

| Severity | Count |
|---|---|
| Blocker | {{n}} |
| Warning | {{n}} |
| Info | {{n}} |

## Findings

| Rule | Severity | Status | Evidence | Fix |
|---|---|---|---|---|
| STR-01 layer completeness | blocker | {{pass/fail}} | {{paths}} | {{fix}} |
| STR-02 assets foldering + tokens file | warning | {{pass/fail}} | {{paths}} | {{fix}} |
| STR-03 component tiering | blocker | {{pass/fail}} | {{paths}} | {{fix}} |
| STR-04 composite-component folders | warning | {{pass/fail}} | {{paths}} | {{fix}} |
| STR-05 framework-layer split | warning | {{pass/fail}} | {{paths}} | {{fix}} |
| STR-06 services split (http/api) | warning | {{pass/fail}} | {{paths}} | {{fix}} |
| STR-07 hook/composable naming | blocker | {{pass/fail}} | {{paths}} | {{fix}} |
| STR-08 allowed-imports matrix | blocker | {{pass/fail}} | {{file:line → violation}} | {{fix}} |

## Import violations detail

| File | Line | Imports | Layer rule broken | Downward alternative |
|---|---|---|---|---|
| {{path}} | {{n}} | {{target}} | {{rule}} | {{extract to shared / invert via router-store-props}} |

## Move plan (requires explicit confirmation)

Checkpoint: `orchestrate.mjs checkpoint --label pre-structure` → {{ref}}

| # | From | To | Imports rewritten | Batch |
|---|---|---|---|---|
| 1 | {{path}} | {{path}} | {{n}} | {{A}} |

**Confirm to proceed?** Moves are reversible via the checkpoint.

---

# Compliant skeleton scaffold

Generate for {{framework}}; delete layers the project declines. Self-check
against STR-01…STR-08 before handover.

```
src/
├── assets/
│   ├── styles/
│   │   ├── tokens.{{css|scss|ts}}    # design-token variables: color, space, type, radius, shadow
│   │   └── index.{{css|scss}}        # global styles, imports tokens
│   ├── icons/
│   └── images/
├── components/
│   ├── common/                       # app-agnostic (Button/, Modal/ …) — foldered, entry file each
│   ├── layout/                       # AppShell/, Navbar/, Footer/
│   └── business/                     # domain-aware but cross-feature
├── {{hooks|composables}}/            # useXxx.* only
├── {{features|modules}}/             # scaffolded by refactor-web-02-modules
├── framework/                        # or ecosystem-native equivalents
│   ├── router/                       # registers feature routes
│   ├── store/
│   ├── plugins/
│   ├── directives/                   # (Vue/Angular)
│   └── config/
├── services/
│   ├── http/client.{{ts}}            # instance + request/response interceptors
│   └── api/                          # shared endpoint definitions
├── utils/index.{{ts}}
└── types/index.{{ts}}
```

Token variables file starter (adapt format to the styling system — CSS custom
properties, SCSS variables, Tailwind theme, or exported theme object):

```css
:root {
  /* semantic color tokens */
  --color-primary: …;
  --color-text: …;
  --color-text-muted: …;
  --color-danger: …;
  --color-success: …;
  --color-warning: …;
  --color-surface: …;
  --color-border: …;
  /* spacing scale */
  --space-1: …; --space-2: …; --space-3: …; --space-4: …;
  /* type scale */
  --font-size-heading: …; --font-size-body: …; --font-size-caption: …;
  /* shape */
  --radius-sm: …; --radius-md: …;
}
```

## Scaffold self-check
- [ ] STR-01…STR-08 all pass on the generated tree
- [ ] Token variables file present and imported by global styles
- [ ] HTTP client stub compiles; router/store entries registered
