# Readiness Report — <project-name>

_Produced by `refactor-legacy-assess` (read-only, advisory). Handed to diagnose + plan._

## Overall verdict
> **<🟢 GREEN | 🟡 YELLOW | 🔴 RED>** — <one-line plain-language reason>
> (Verdict = the worst gate below.)

## Gates
| Gate | Grade | Evidence (file:line or count) |
|------|-------|-------------------------------|
| Coupling / seam | `<GREEN|YELLOW|RED>` | `<evidence>` |
| Type safety | `<GREEN|YELLOW|RED>` | `<evidence>` |
| Deprecations / EOL | `<GREEN|YELLOW|RED>` | `<evidence + known-removal source or "verify vs release notes">` |
| Dead code | `<GREEN|YELLOW|RED>` | `<evidence>` |
| Test seam | `<GREEN|YELLOW|RED>` | `<evidence>` |

## Ordered prerequisites (the plan must do these first)
1. `<most-blocking fix>` — `<which gate, why RED/YELLOW>`
2. `<next fix>` — `<gate>`
3. `<...>`

## Low-risk warm-ups (optional, bundle in)
- `<dead code / trivial cleanup>` — proves the verify loop with near-zero risk.

## Plain-language summary
> <2–3 sentences a non-engineer can follow: how ready this is, and the single most
> important thing to fix first if it isn't GREEN.>

## Handoff
> `{verdict, gates, prerequisites}` ready for `refactor-diagnose` (which lane is
> viable) and the **plan** phase (what to do first).
