# Scope Ledger — step <N> of <M> (<skill>)

**Declared scope:** `<prefix>`, `<prefix>` · **Chain:** <lane> · **Date:** <date>

## Fence outcome

| Signal | Value |
| --- | --- |
| Files in this step's diff | <count> |
| All inside declared scope | yes / no (see widenings) |
| ⚑ scope-drift flags emitted | <count> |
| Flags classified | <count> / <count> |

## Drift flags, classified

| # | File | Class (mistake / required / adjacent) | Response (reverted / new step / parked) |
| --- | --- | --- | --- |
| 1 | `<path>` | <class> | <response> |

## Parked items (→ write-up + session memory)

<!-- Verbatim from the step's state notes. Delete section if none. -->
- `parked: <path> — <what> — <why it matters> [found during step <N> <skill>]`

## Checkpoint decisions

<!-- One per mid-chat checkpoint. Delete section if none. -->
- Asked: <the out-of-scope pull>. Recommended: <a/b + clause>. User chose: **<new step | park>**. Result: <step <K> appended with scope `<prefix>` | parked note above>.

## Scope widenings

<!-- Only 'required' drifts approved via checkpoint. Delete if none. -->
- Scope grew to include `<prefix>` because <one clause>; recorded in state at <where>.

## Attestation

- [ ] Every flag above has exactly one class and a completed response.
- [ ] The diff contains no file outside declared scope + recorded widenings.
- [ ] Every parked item will appear in the write-up's parked-items section.
