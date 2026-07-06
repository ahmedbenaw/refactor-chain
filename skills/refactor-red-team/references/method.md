# Red-Team the "Behavior Preserved" Claim — full method

A refactor's entire value rests on one promise: **behavior is identical.** This skill
treats that promise as a claim to be broken, not a fact to be trusted. It extracts the
load-bearing claims from the diff, attacks the ones most likely to be false, ranks by
**impact × likelihood × cheapness-to-test**, and writes the cheapest failing test per
surviving suspicion. It does not edit product code.

Absorbs: `pm-execution:red-team-prd` — the adversarial "assume the assumption is wrong,
find the counterexample, rank, and test the cheapest one" stance, retargeted from PRD
assumptions onto refactor behavior-preservation claims.

---

## 0. The posture

**Default belief: the refactor broke something. Prove it didn't.** "It compiles",
"the types pass", and "it looks the same" are not proof of behavior preservation —
they are the *starting* line, not the finish. A compiler proves the shapes line up; it
does not prove that `parseLine("")` returns what it used to. That gap is where refactors
silently change behavior, and it's exactly what you attack.

---

## 1. Get the diff and the baseline

```
git diff <lane-base>..HEAD           # the change to attack
node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs status --target <dir>   # baseline: true?
```

- **Green baseline present** → you can write the cheapest tests and run them; a failing
  test is a *proven* behavior change.
- **No baseline** → you can still extract and attack claims by reading, but you cannot
  run tests to green. Flag every verdict as "by reading only — unproven" and recommend
  `refactor-safety-net` first.

---

## 2. Extract the load-bearing claims (the claim catalogue)

For each hunk, name the *implicit* behavior-preservation claim the change depends on.
These are the recurring claim types:

| Claim type | The implicit promise | Where it hides |
|---|---|---|
| **rename-resolves** | Every reference to the renamed symbol now points at the new name; none stayed on the old one via string, reflection, config, or a serialized name. | dynamic dispatch, DI keys, JSON/ORM field names, event names, route strings |
| **extraction-equivalent** | The extracted function returns the same value and does the same side effects on **every** path the inlined code did. | early returns, error paths, the empty/null case, the "does nothing" branch |
| **order-preserved** | Iteration / evaluation / emission order is unchanged. | `map`→`forEach` swaps, `Object.keys` order, set vs array, sort stability, parallelized `await`s |
| **error-contract-same** | It still throws (vs returns) the same error type at the same trigger. | try/catch moved, throw→return-null, error type changed, swallowed error |
| **side-effect-same** | The same writes/logs/network/mutations happen, same count, same order. | a call moved out of / into a loop, a cache added, a write deduped |
| **boundary-value-same** | `null`/`undefined`/`0`/`""`/`NaN`/empty-collection produce the same result. | default args lost, `??` vs `||`, truthiness checks, off-by-one after extraction |
| **concurrency-same** | Sequential stayed sequential (or the new concurrency is genuinely safe). | `Promise.all` introduced, an `await` dropped, a lock moved |

Write each claim as a falsifiable sentence: *"After the rename, `OrderService`
resolves at every call site including the DI container key in `config.ts`."*

---

## 3. Attack each claim — hunt the counterexample

For each claim, **assume it is false** and go find the input, caller, or ordering that
breaks it:

- **rename-resolves** → grep the *old* name as a string across the whole repo (config,
  templates, serialized data, tests, docs). A type-safe rename misses string references.
- **extraction-equivalent** → enumerate the paths of the original inlined code and check
  the extracted function reproduces each — especially the error path and the empty case.
- **order-preserved** → find a caller that depends on order (renders a list, writes a
  file, emits events a consumer counts).
- **error-contract-same** → find a caller that branches on the throw / catches the type.
- **side-effect-same** → count the side effects before and after; a call that moved into
  a loop now fires N times.
- **boundary-value-same** → feed `null`, `undefined`, `0`, `""`, `[]`, `NaN`, the huge
  value, the negative.
- **concurrency-same** → check whether two now-concurrent operations share state or an
  ordering dependency.

The output of the attack is either a **concrete counterexample** (claim looks BROKEN) or
"I tried these and it held" (claim looks preserved — still worth the cheapest test if
impact is high).

---

## 4. Rank by impact × likelihood × cheapness-to-test

Score each attacked claim 1–5 on three axes:

- **Impact** — if behavior really changed here, how bad? (silent data corruption = 5;
  a cosmetic log line = 1)
- **Likelihood** — how plausible is the counterexample you found? (a caller that
  demonstrably branches on the old throw = 5; a theoretical edge no caller hits = 1)
- **Cheapness-to-test** — how few lines to pin it? (a 3-line characterization test = 5;
  needs a whole harness = 1) — cheapness *raises* priority because a cheap decisive test
  is almost free assurance.

`priority = impact × likelihood × cheapness`. Sort descending. Spend effort top-down;
you do not have to test every claim — you test the ones where the product of danger and
plausibility is high and the cost is low.

---

## 5. Emit the cheapest test per surviving suspicion

For each high-priority claim, write the **single smallest test** that pins the
*pre-refactor* behavior and fails if the claim is broken:

- Use the repo's existing test framework and the baseline as the source of truth for the
  expected value (pin behavior **including quirks/bugs** — a refactor doesn't get to
  "fix" behavior silently).
- Assert exactly the one behavior the claim is about — the return on the empty input,
  the throw on the bad line, the order of the emitted list. No sprawling coverage.
- Run it against the current code:
  - **FAIL** → a *proven* behavior change. Tag the claim **BROKEN**, severity Blocker.
  - **PASS** → earned assurance; the claim held under a real test.
- Put the test in the test tree, clearly labeled as a red-team characterization test.
  Never edit product code to make it pass — a caught break is fixed in a separate,
  labeled change (or the caller updated deliberately).

---

## 6. Report ranked verdicts

Fill `templates/output.md`: every claim with `file:line`, the attack performed, the
verdict (**held / BROKEN / unprovable**), the priority score, and — for the ones tested —
the cheapest test path and its pass/fail. Order most-dangerous-first. Hand the report to
`refactor-review-gate`, which folds a BROKEN claim into the go/no-go as a **Blocker**.

---

## 7. Relationship to the chain

- `refactor-safety-net` records the green baseline this skill treats as ground truth.
- `refactor-verify` re-runs the baseline per step; this skill goes *beyond* it by
  inventing new adversarial tests for claims the baseline never covered.
- `refactor-review-gate` is the consumer: it owns *"same behavior?"* by delegating to
  this skill, and a credible BROKEN verdict makes the gate a no-go.
- Sibling reviewers: `refactor-security` (safe?) and `refactor-performance` (slower?).
  This skill owns behavior preservation and nothing else.
