# Red-Team — "behavior preserved?" verdicts

**Project:** `<path>`
**Diff attacked:** `<lane-base>..HEAD`
**Baseline:** `<green | MISSING — verdicts by reading only, unproven>`
**Date:** `<iso date>`

---

## Headline

> **`<N>` of `<M>` behavior-preservation claims BROKEN. Scariest first.**
> `<one-line: is behavior preserved, and what's the worst break?>`

---

## Ranked claims

### 1. `<HELD | BROKEN | UNPROVABLE>` · `<Blocker | Worth-fixing | —>` — `<file:line>` (`<claim type>`)
**Claim:** `<the falsifiable behavior-preservation sentence>`
**Attack:** `<what input/caller/path/order you tried; the counterexample or "held on read">`
**Cheapest test:** `<path::testname>` → `<RED (fail) | GREEN (pass) | not written — held/low-priority>`
**Priority:** impact `<1-5>` × likelihood `<1-5>` × cheapness `<1-5>` = `<score>`

### 2. `<verdict>` · `<severity>` — `<file:line>` (`<claim type>`)
**Claim:** `<...>`
**Attack:** `<...>`
**Cheapest test:** `<...>` → `<...>`
**Priority:** `<...>`

<!-- one block per claim, ordered by priority descending -->

---

## Scoreboard
| # | Claim | Type | Verdict | Impact | Likelihood | Cheapness | Priority |
|---|---|---|---|---|---|---|---|
| 1 | `<file:line>` | `<type>` | `<verdict>` | `<>` | `<>` | `<>` | `<>` |

---

## Tests added (red-team characterization)
| Test file | Pins | Result today |
|---|---|---|
| `<test/...>` | `<the one behavior>` | `<RED — proves break | GREEN — assurance>` |

> Product code was **not** edited. Any BROKEN claim is fixed in a separate, labeled
> change (or the caller updated deliberately) — never smuggled into the refactor.

---

## Hand-off to the review gate
- BROKEN claims → **Blocker** (behavior preservation is the refactor's core promise).
- Handed to `refactor-review-gate` for the single ranked go/no-go.
- If the baseline was missing: `refactor-safety-net` first, then re-run to prove/disprove.
