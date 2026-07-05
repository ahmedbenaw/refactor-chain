# Design-Token Extraction — full method

This is the exhaustive "how" behind `refactor-ui-tokens`. The SKILL.md gives the
5-step spine; this file gives the rules each step follows.

## 0. Detect the styling system first
Before extracting anything, identify how the project styles UI, because it decides
the emit format and the migration mechanics:

| Signal | System | Token home |
|---|---|---|
| `tailwind.config.{js,ts}`, `@tailwind` directives | Tailwind | `theme.extend` in config + optional CSS vars |
| `.css`/`.scss` with raw properties, `:root {}` | Plain CSS / Sass | `:root` custom properties (`--token`) |
| `styled-components`, `@emotion`, `stitches` | CSS-in-JS | exported `theme` object + `ThemeProvider` |
| `*.swift`, `Color(...)`, `.padding(_)` | SwiftUI | `Color`/`CGFloat` constants in an `enum`/asset catalog |
| `*.kt` + Compose `MaterialTheme` | Jetpack Compose | `Color`/`Dp` vals + `Theme.kt` |
| RN `StyleSheet.create`, Flutter `ThemeData` | RN / Flutter | JS theme object / `ThemeData` extension |

If the repo already has a partial token layer, **extend it** — read existing names,
match conventions, never rename existing tokens out from under call sites.

## 1. Inventory rules
Collect literals per category. Categories and what counts:
- **color** — hex, `rgb(a)`, `hsl(a)`, named colors, gradients (decompose into stops).
- **spacing/size** — `margin`, `padding`, `gap`, `width`/`height` when used as layout
  spacing, `top/left/...` offsets. Ignore `100%`, `auto`, `0`.
- **font-size**, **font-weight**, **line-height**, **letter-spacing**.
- **radius** — `border-radius`.
- **shadow** — `box-shadow` / `elevation`.
- **z-index**, **duration/easing** (`transition`, `animation` timings).

Record for each literal: value, category, occurrence count, and file locations.
`scripts/scan-tokens.mjs` produces this as JSON.

## 2. Clustering & scale selection
- **Numbers:** sort, then cluster values within a tolerance (default: spacing ±1px or
  ±5%, font-size ±1px). Each cluster → one scale step at the cluster's modal value.
  Prefer a **4px or 8px base** spacing scale (`0,4,8,12,16,24,32,48,64`) and a
  **modular type scale** (e.g. 1.2–1.25 ratio: `12,14,16,18,20,24,30,36,48`).
- **Colors:** cluster by perceptual distance (ΔE-ish; the script uses a cheap RGB/HSL
  distance). Collapse near-duplicate grays into a single ramp. Target a **5–10 step
  neutral ramp** + a small set of semantic accents (primary/success/warning/danger/info).
- **Restrictive is the point.** If you can't choose between two adjacent steps, you
  have too many steps. Fewer inputs → fewer future inconsistencies.

## 3. Naming taxonomy (two tiers)
**Tier 1 — primitives** (raw scale, value-named): `--blue-500`, `--gray-100`,
`--space-4`, `--text-lg`, `--radius-md`. These are the palette.

**Tier 2 — semantic aliases** (role-named, reference primitives):
`--color-primary → --blue-500`, `--color-surface → --gray-50`,
`--color-text → --gray-900`, `--color-text-muted → --gray-500`,
`--color-border`, `--color-danger`. Components reference **semantic** tokens only.

Naming rules:
- Name by **role or scale position**, never by literal value at the semantic tier
  (`--color-text-muted`, not `--gray-500-text`).
- Keep names system-idiomatic: Tailwind keys (`colors.primary`), CSS `--kebab-case`,
  Swift `Color.Brand.primary`, Compose `md.colorScheme.primary`.
- Provide light/dark (or theme) variants at the **semantic** tier so primitives stay stable.

## 4. Emit rules (per system)
Use `templates/output.md`. Key points:
- **CSS vars:** define primitives + semantic aliases in `:root`; dark theme under
  `@media (prefers-color-scheme: dark)` or `[data-theme="dark"]`.
- **Tailwind:** put primitives + semantic names under `theme.extend.{colors,spacing,
  fontSize,borderRadius,boxShadow}`; optionally back them with CSS vars for runtime theming.
- **CSS-in-JS / RN / Flutter:** export a typed `theme` object; wrap app in provider.
- **SwiftUI/Compose:** use asset catalogs / `MaterialTheme` color+dimension sets; never
  hardcode `Color(hex:)` at call sites.

## 5. Migration & snap policy
- Migrate **one category at a time** (color → spacing → type → radius → shadow → misc),
  committing between categories so each is reviewable.
- For each literal, snap to its **nearest scale step**. Track the delta.
  - Delta **0** (exact): migrate silently.
  - Delta within tolerance (e.g. 13px→12px): list in the drift table, confirm before commit.
  - Delta outside tolerance: **do not snap** — flag as drift (intentional one-off or a
    missing scale step; decide with the user).
- Never introduce a new visible pixel change without surfacing it in the drift table.

## 6. Drift report (feeds the next step)
Enumerate, with reasons:
- **Orphans** — values used exactly once that fit no step.
- **Near-dupes** — clusters collapsed (before → after, count saved).
- **Out-of-scale** — literals too far from any step to snap safely.
- **Contradictions** — same role, different values across files.
This report is the design-debt handoff to refactor-ui-visual / refactor-ui-mobile.

## Guardrail recap
Pixel-preserving by default. Two-tier tokens. Components reference semantic tier only.
Snaps that move pixels are always confirmed. Extend existing systems; don't rename them.
