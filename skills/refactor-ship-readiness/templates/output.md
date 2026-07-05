# Store / Platform Ship-Readiness — rejection-risk report

**Project:** `<path>`
**Detected target(s):** `<iOS App Store | Android/Play | web/PWA | desktop | NONE — not applicable>`
**Diff reviewed:** `<base>..HEAD` (manifest/config/entitlements/privacy/signing surface)
**Date:** `<iso date>`

---

## Conditional gate
> `<A publishable target was detected → checklist run below.>`
> `<— OR —  No publishable target detected → NOT APPLICABLE. This skill stops here.>`

---

## Decision

> **`<GO for submission | NO-GO — Blocker(s) block the ship | GO with ship notes>`** —
> `<B>` Blocker(s), `<R>` Risk(s), `<A>` Advisory. Most important first.

---

## Rejection risks (ranked)

### 1. `[<Blocker | Risk | Advisory> · <platform>]` `<file:line or missing-key>` — `<one-line what>`
`<plain-English why a reviewer would flag / reject this, and to whom it applies>`
**Fix:** `<the exact change>`
Reference: `<guideline / required-reason category>` · Confidence: `<high|med|low>`

### 2. `[<severity> · <platform>]` `<where>` — `<what>`
`<why>`
**Fix:** `<fix>`
Reference: `<...>` · Confidence: `<...>`

<!-- ranked: Blockers first, then Risks, then Advisories -->

---

## Assurances (clean checks — good news)
| Platform | Check | Result |
|---|---|---|
| `<iOS>` | `<entitlements match capabilities>` | clean |
| `<Android>` | `<permissions justified; exported explicit>` | clean |
| `<web>` | `<manifest fields / HTTPS / installable>` | clean |
| `<desktop>` | `<signing / notarization>` | clean |

---

## Checklist coverage
| Item | Platform | Status |
|---|---|---|
| `<ios-usage-strings>` | iOS | `<pass | finding | n/a>` |
| ... | ... | ... |

---

## Ship gate
- **Blockers:** `<none | listed above — SHIP BLOCKED, handed to human>`
- **Risks / Advisories:** folded in as ship notes (do not block).
- This skill edited nothing. Fixes are a separate, clearly-labeled change.
- Store rules move — verify any Blocker against the **current** published guideline
  before submitting.
