# Worked example — one rename propagated end to end

A React + TypeScript project. The check flagged a single-word component whose file, symbol,
handler, prop, and test all disagreed with the project's own conventions. Here is that one
rename carried through every place it touches — nothing else changed.

## Before (the finding)

`NAME-01` (ERROR): component `Table` is single-word PascalCase and its file is lowercase.
`NAME-05` (WARNING): the click handler is named `click`, the prop `clicked`.

```
src/
  table.tsx                 // export function Table({ clicked }: { clicked: () => void })
  table.test.tsx            // import { Table } from "./table"
  pages/dashboard.tsx       // <Table clicked={refresh} />
  index.ts                  // export { Table } from "./table"
docs/components.md          // "The Table component renders…"
```

```tsx
// src/table.tsx  (before)
export function Table({ clicked }: { clicked: () => void }) {
  const click = () => clicked();
  return <table onClick={click} />;
}
```

## The rename plan (shown, approved before running)

| Old → New | Kind | Propagation set |
|---|---|---|
| `Table → DataTable` | component + file (`table.tsx → DataTable.tsx`) | 3 imports, 1 barrel re-export, 1 test, 1 doc line |
| `clicked → onRefresh` | callback prop | 1 def, 1 call site |
| `click → handleRefresh` | handler fn | 1 def, 1 usage |

Rule basis: `NAME-01` (multi-word PascalCase, file matches component), `NAME-05`
(`handle`-prefixed handlers, `on`-prefixed callback props).

## After

```
src/
  DataTable.tsx             // export function DataTable({ onRefresh }: { onRefresh: () => void })
  DataTable.test.tsx        // import { DataTable } from "./DataTable"
  pages/dashboard.tsx       // <DataTable onRefresh={refresh} />
  index.ts                  // export { DataTable } from "./DataTable"
docs/components.md          // "The DataTable component renders…"
```

```tsx
// src/DataTable.tsx  (after)
export function DataTable({ onRefresh }: { onRefresh: () => void }) {
  const handleRefresh = () => onRefresh();
  return <table onClick={handleRefresh} />;
}
```

## Proof it was behavior-preserving (names only)

- Build/typecheck: `tsc --noEmit` ✓ · Tests: `vitest run` ✓ (same pass set as the baseline).
- `git grep -n "\bTable\b\|clicked\|\bclick\b" src` → zero survivors (only `DataTable`, `onRefresh`, `handleRefresh`).
- Rendered output identical: same DOM, same click behavior, same data. Only the identifiers moved.
- Prior ERROR/WARNING findings: 2 → 0. New findings introduced: 0.

## Parked (out of this step's scope)

- `src/utils.ts` has an unrelated `fmt()` with an unclear name — noted for a follow-up, **not**
  renamed here (a rename outside the requested set is diff noise and risks unrelated callers).
