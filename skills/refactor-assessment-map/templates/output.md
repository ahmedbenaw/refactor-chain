# Assessment Map — <project-name>

_Produced by `refactor-assessment-map` (read-only, advisory). Handed to diagnose + plan._
_Coverage: mapped `<N>` of ~`<M>` source files. Churn source: `<git|none>`._

## Load-bearing modules (highest fan-in — touch with care)
| module | fan-in (Ca) | fan-out (Ce) | instability I |
|--------|------------:|-------------:|--------------:|
| `<file>` | `<n>` | `<n>` | `<0.00>` |

## Tangles (circular dependencies — break these first)
- `<a> ↔ <b>` — <why it blocks safe extraction>
- <or "none detected">

## God modules & layer violations
- **God module:** `<file>` — fan-out `<n>`, complexity `<n>` (<why>)
- **Layer violation:** `<file>` imports `<file>` directly, skipping `<layer>`
- <or "none detected">

## Ranked refactor targets
| # | target | why | metric behind the rank | risk |
|---|--------|-----|------------------------|-----:|
| 1 | `<target>` | `<reason>` | `<fan-in/LOC/churn>` | `<high|med|low>` |
| 2 | `<target>` | `<reason>` | `<metric>` | `<...>` |
| 3 | `<target>` | `<reason>` | `<metric>` | `<...>` |

## Quick wins (safe warm-ups — low blast radius)
- `<leaf-module>` — fan-out `<n>`, in no cycle, fan-in `<n>`. Good first step to
  prove the verify loop.

## Plain-language summary
> <2–3 sentences a non-engineer can follow: where the debt concentrates, what's
> tangled, and where you'd safely start.>

## Handoff
> Ranked target list ready for `refactor-diagnose` (sharpen classification) and the
> **plan** phase (order of work).
