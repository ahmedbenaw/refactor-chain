# Architecture — <project name>

> Last synced by refactor-chain: <date> · lane `<lane>` · changed sections: <list>

## Overview
<One paragraph: what the system is and the shape of its architecture. (Human prose — preserve.)>

## Structure
- `<root>/`
  - `<dir>/` — <purpose>
    - `<subdir>/` — <purpose>
  - `<dir>/` — <purpose>

## Layers & responsibilities
| Layer | Path | Responsibility |
|---|---|---|
| <layer> | `<path>` | <what it owns> |

## Dependency direction (allowed / forbidden)
- Allowed: `<A> → <B>`, `<A> → <C>`
- Forbidden: `<B> → <A>`, `<module>A → <module>B internals`

## Entry points
- <build/run entry> — `<path>`
- <test entry> — `<command>`

## Why this layout (rationale)
<Human prose — the refactor should not overwrite this; only correct facts above.>
