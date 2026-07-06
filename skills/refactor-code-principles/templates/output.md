# Structural Refactor Report — refactor-code-principles

> Fill every section. The principle-choice record is mandatory even in autopilot.

## Run header

- **Target:** `<dir or files>`
- **Chain run:** `<run id, or "standalone">`
- **Detected stack:** `<languages / families from diagnose>`
- **Baseline:** `<safety-net baseline id / test pass-set, e.g. "61/61 green">`

## Principle-choice record (the decision window)

| Field | Value |
|---|---|
| Recommended set (registry) | `<principles>` |
| Chosen set | `<principles actually applied>` |
| Choice path | `(a) accepted / (b) mix-and-match / (c) unconventional` |
| Chosen by | `user / autopilot (announced)` |
| Accepted risks (verbatim registry `risks` lines) | `<none / list>` |
| Recorded in chain state | `<orchestrate.mjs advance --note "principles: …" — yes/no>` |

## Per-step report (one row per transformation / commit)

| # | Smell @ file:line | Principle | Transform applied | Verify result (proof of identical behavior) | Commit |
|---|---|---|---|---|---|
| 1 | `<smell> @ <file:line>` | `<principle>` | `<one reversible move>` | `<type-check/build/tests vs. baseline — identical>` | `<sha>` |
| 2 | | | | | |

### Rollbacks / self-heal attempts

| Step | What broke | Rolled back? | Smaller retry (attempt n of 3) | Outcome |
|---|---|---|---|---|
| | | | | |

## Deliberately not done

> Findings observed but intentionally left alone — with the reason (would change behavior,
> abstraction would not pay for itself, out of scope, bug parked for reviewers).

- `<finding>` — `<reason>`

## Bugs noticed (parked, never fixed in-line)

- `<file:line — one-line repro>` — handed to reviewers.

## Final verification

- [ ] Type-check / build clean after every move
- [ ] Baseline pass-set identical (`refactor-verify` clean / `advance --delta clean`)
- [ ] One behavior-preserving transformation per commit, each tagged with its principle
- [ ] No drift in ordering, error text, null-vs-undefined, precision, or async timing
- [ ] Principle-choice record present in state notes and this write-up

**Plain-language close:** "The code does exactly what it did before — every move was checked, and
this record shows which principles you approved and why each change happened."
