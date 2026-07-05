# Naming report — <project>

**Framework:** <react|vue|svelte|angular> · **Dialect detected:** file casing `<…>`, shared prefix `<…>`, styling `<BEM|CSS Modules|utility>` · **Scope:** <all categories | category>

## Findings (worst first)

| Severity | Rule | Location | Offending name | Compliant form |
|---|---|---|---|---|
| ERROR | NAME-01 | `src/components/table.tsx` | `table` | `DataTable` (+ file `DataTable.tsx`) |
| WARNING | NAME-05 | `src/components/Form.tsx:40` | `submit` (handler) | `handleSubmit` (prop `onSubmit`) |
| SUGGESTION | NAME-03 | `src/lib/user.ts:12` | `flag` | `isActive` |

Severity: **ERROR** = breaks tooling or a framework-load-bearing convention · **WARNING** = inconsistency · **SUGGESTION** = taste.

## Rename plan (fix mode — approval required before running)

| Old → New | Kind | Propagation set |
|---|---|---|
| `table.tsx → DataTable.tsx` | file + component | 4 imports, 1 registration, 2 tests |
| `submit → handleSubmit` | handler | 1 def, 1 prop rename `onSubmit`, 1 template usage |

_Batch renames never run unannounced. After each batch: build/typecheck ✓, tests ✓, `grep` old name → zero survivors._

## Result
- Prior ERROR findings: <n> → 0
- New findings introduced: 0
- Build/typecheck: <pass> · Tests: <pass>
- Behavior unchanged (names only).

## Parked (out of this step's scope)
- <adjacent naming issue flagged for a follow-up, not fixed here>
