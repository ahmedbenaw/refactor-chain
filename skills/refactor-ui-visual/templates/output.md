# Visual Refactor Report — refactor-ui-visual

## Run header

- **Target:** `<screen / component / files>`
- **Scope:** `full pass / scoped to <hierarchy | typography | color | layout | spacing>`
- **Chain run:** `<run id, or "standalone">`

## Systems defined (before any refinement)

| System | Scale |
|---|---|
| Spacing | `<e.g. 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64>` |
| Type | `<sizes + line-heights>` |
| Color | `<primary + tints, gray ramp (single hue, HSL), semantic colors>` |
| Personality | `<serious-elegant / playful-friendly — one, consistent>` |

## Changes (one row per visual change)

| # | Change | Concern | Before | After | Why | Keep / undo |
|---|---|---|---|---|---|---|
| 1 | `<what changed>` | `<hierarchy / typography / color / layout / spacing / depth-polish>` | `<concrete before: values, colors, sizes>` | `<concrete after — from the scales above>` | `<the principle this serves>` | `keep / undo (reason)` |
| 2 | | | | | | |

## Undo ledger

> Changes tried and reverted, with the reason — decoration without function, hierarchy disturbed,
> scale violated, personality drift.

- `<change>` — undone because `<reason>`

## Verify

- [ ] Content, labels, and interactive behavior unchanged — presentation only
- [ ] Every spacing, size, and color traces to a defined scale — no arbitrary one-offs remain
- [ ] Hierarchy reads correctly: primary dominant, secondary de-emphasized
- [ ] All text meets accessible contrast; palette is cohesive
- [ ] Typography uses the scale and consistent line-height
- [ ] If scoped: the targeted concern is resolved and the other concerns are undisturbed
