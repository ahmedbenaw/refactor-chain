# Review Board — verdict

**Target:** `<path>` · **Round:** `<n>` · **Seed:** `<N>` · **Lenses:** `<architecture, harness, correctness, security, docs-truth>`

## Decision: <GO | FIX-THESE-FIRST | NO-GO>

<one plain sentence: what the decision means and why. Lead with the single most
important thing — "do this first" — and state how many items there are.>

## The list — most important first

Each survivor was raised by a Lead and survived a Coordinator's refutation.

| # | Do | Where (`file:line`) | Severity | Verdict | Lens(es) | Fix |
|---|----|--------------------|----------|---------|----------|-----|
| 1 | **do this first** | `<file:line>` | Blocker | CONFIRMED | `<lens>` | `<concrete fix>` |
| 2 | | `<file:line>` | Blocker | CONFIRMED | `<lens>` | `<fix>` |
| 3 | | `<file:line>` | Worth-fixing | CONFIRMED | `<lens>` | `<fix>` |

<Mark any behavior-changing finding — a refactor's whole promise is "same behavior";
those sort to the top.>

## Assurances (the good news)

- `<lens>`: CLEAN — `<what was checked and found solid>`.
- `<lens>`: CLEAN — `<...>`.

## Refuted and dropped (the adversary earned its keep)

- `<file:line>` — raised by `<lead>`, **refuted** by `<coordinator>`: `<why it was not a real defect>`.

## Appendix — optional nits

- `<file:line>` — `<minor cleanup, not ship-blocking>`.

## Next

- [ ] Fix the survivors through the safe pipeline (checkpoint → apply → verify → adversarial → guidelines gate). **Not** straight from this list.
- [ ] Re-convene the board (next round, new seed) if the changes are large.
