# Safety Net — baseline record

**Project:** `<path>`
**Date:** `<iso date>`
**Phase:** baseline → lane

## 1. Suite status
- Suite already existed: `<yes | no>`
- Runner / framework: `<jest | pytest | go test | junit | ...>`
- Baseline command (exact): `<command refactor-verify will re-run>`

## 2. Green pass-set
- Result: `<N passed, 0 failed>` / snapshot id `<...>`
- Narrowest-in-scope check used first: `<command>` → `<result>`
- Full suite: `<command>` → `<result>`

## 3. If derived (no prior suite)
Seams pinned:
| Seam (function / endpoint / output) | Inputs captured | Pinned current behavior (incl. quirks) |
|---|---|---|
| `<seam>` | `<inputs>` | `<asserted output — note any bug pinned>` |

Derived test file(s): `<path(s)>` — all green against unmodified code.

## 4. Excluded from the net
- Red areas (refactor must NOT touch): `<none | list>`
- Flaky tests excluded: `<none | list>`

## 5. Harness state
- `orchestrate.mjs baseline` recorded: `<yes>`
- `status` → `baseline: true`, phase: `lane`, first step: `<skill>`

## 6. Hand-off
The green fixed point is recorded. `refactor-verify` will re-run
`<baseline command>` after every lane step and at the final gate.
**Reminder to the chain:** never refactor on a red repo — if this net ever goes red
mid-chain from an assertion failure, STOP and roll back that step.
