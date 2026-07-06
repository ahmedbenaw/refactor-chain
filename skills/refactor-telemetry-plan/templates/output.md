# Tracking Plan & Analytics Risk — <project name>

> Refactor-chain · docs (conditional) · lane `<lane>` · run <date>
> Applicability: **ACTIVE** (tracking touched in diff) · Advisory — proposes, does not rewire tracking.

## 1. Risk summary
- Events **broken**: <n> · **at-risk (verify)**: <n> · **safe**: <n>
- Funnels affected: <list> · Experiments to verify: <list>

## 2. Event risk table

| Event | Call site | Change | Verdict | Property risk | Depends on |
|---|---|---|---|---|---|
| `<event>` | `<file:line>` | moved/renamed/deleted/props | broken / at-risk / safe | `<prop reads renamed thing?>` | <dashboard/funnel/experiment> |

## 3. Experiment dependencies (verify before trusting results)
- `<experiment>` — exposure event `<event>` (<safe/broken>), goal event `<event>` (<safe/broken>).
- <or "none this run">

## 4. Proposed tracking plan (per changed flow)

### Flow: <name>
| Order | Event | Properties (name : type : source) | Fix |
|---|---|---|---|
| 1 | `<event>` | `<prop> : <type> : <source>` | rename-map old→new / re-add call / re-point property / none |
| 2 | `<event>` | `<…>` | <…> |

### Flow: <name>
| Order | Event | Properties | Fix |
|---|---|---|---|
| 1 | `<…>` | `<…>` | <…> |

## 5. Fixes at a glance
- Rename mappings (for historical continuity): `<old event/prop> → <new>`
- Calls to re-add: `<event>` in `<file>`
- Properties to re-point: `<event>.<prop>` → `<new source or pinned value>`

## 6. Handoff
- Owner to notify: <analytics owner / team>
- Privacy note: <did the refactor change what data any event carries? y/n>
