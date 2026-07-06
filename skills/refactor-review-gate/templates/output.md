# Ship Review Gate — go / no-go

**Project:** `<path>`
**Diff reviewed:** `<lane-base>..HEAD` — `<N files, +A −D>`
**Baseline:** `<green | MISSING — behavior not certifiable>`
**Date:** `<iso date>`

---

## Decision

> **`<GO | FIX-THESE-FIRST | NO-GO>` — `<N>` item(s) worth your attention. Most important first.**

`<one-sentence plain-English bottom line: what to do next>`

---

## The list (most important first)

### 1. `[<Blocker|Worth-fixing|Optional> · <do this first?>]` `<file:line>` — `<one-line what>`
`<plain-English why it matters, and to whom>`
**Fix:** `<concrete, specific fix>`
Source: `<[security] | [perf] | [red-team] | [correctness] | [combined tags]>` · Confidence: `<high|med|low>`

### 2. `[<severity>]` `<file:line>` — `<one-line what>`
`<why>`
**Fix:** `<fix>`
Source: `<...>` · Confidence: `<...>`

<!-- add items in ranked order; keep the headline list to the few that matter -->

---

## Assurances (clean checks — good news)
- Security: `<no secrets / no injection in the diff | ...>`
- Performance: `<no regression introduced | ...>`
- Behavior preserved: `<red-team checks passed | ...>`
- Structure: `<layering clean, no dead scaffolding | ...>`

---

## Appendix — optional nits (the long tail)
| Where | Note | Source |
|---|---|---|
| `<file:line>` | `<minor cleanup / naming / dedupe>` | `<tag>` |

---

## Coordination record
| Reviewer | Ran / consumed | Findings contributed |
|---|---|---|
| `refactor-security` | `<invoked | consumed report | n/a>` | `<count>` |
| `refactor-performance` | `<invoked | consumed report | n/a>` | `<count>` |
| `refactor-red-team` | `<invoked | consumed report | n/a>` | `<count>` |
| gate correctness read | `<done>` | `<count>` |
| **After de-dupe** | | **`<merged count>`** |

---

## Hand-off
- **Blockers:** `<none | listed above — chain paused for human decision>`
- The gate edited nothing. Fixes (if any) are a separate, clearly-labeled change.
- On a clean re-run of the gate, the chain advances: **review → docs → ship.**
- Until the gate passes, the Stop hook keeps the "done" narrative blocked.
