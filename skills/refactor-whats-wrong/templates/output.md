# Debug Report — `<short bug title>`

**Skill:** refactor-whats-wrong · refactor-chain DEBUG lane (do-the-work) · **Date:** <YYYY-MM-DD>
**Status:** <FIXED | ROOT-CAUSE-FOUND (fix pending) | NEEDS-MORE-SIGNAL (no reliable repro)>

---

## 1. Symptom (as reported)
> <the user's words / the observed failure>

**Exact error:**
```
<literal error message + stack trace, verbatim>
```

## 2. Reproduction (the oracle)
- **Deterministic?** <yes / made-deterministic by pinning: seed | clock | order | data | env>
- **Repro:**
```
<exact steps, command, or the failing test that reproduces it every time>
```
- **Hidden variable that was causing the flake (if any):** <e.g. "month-end date", "test order">

## 3. Bounding the search
- **Last known-good:** <point where state is provably correct>
- **First observed-bad:** <earliest point where state is provably wrong>
- **Cause is between:** <the bounded region>

## 4. Evidence chain (symptom → origin)
Walk backward; each link is a *confirmed observation*, not a guess.

| # | Hypothesis (one at a time) | Probe used | Result |
|---|---|---|---|
| 1 | <falsifiable claim> | <log/assert/breakpoint/test> | Confirmed / Refuted |
| 2 | <…> | <…> | <…> |
| 3 | <…> | <…> | <…> |

**Chain:** `<surface symptom>` ← `<link>` ← `<link>` ← **`<origin>`**

## 5. Root cause
<the earliest broken assumption — where correct input produced wrong output. File:line.>

- **File:** `<path>:<line>`
- **Why it breaks:** <plain-English explanation>

## 6. Fix (at the origin, not the symptom)
```diff
<the minimal diff at the origin>
```
- **Symptom-patch rejected because:** <why a surface guard/fallback would have hidden the bug>

## 7. Verification
- [ ] Original reproduction now **passes** (the oracle).
- [ ] Full existing test suite **green** — no regression.
- [ ] Repro converted into a **regression test** (fails on old code, passes on new): `<test path>`
- [ ] All temporary probes removed.

## 8. Conditional — Airflow (only if `dags/` detected)
- **Failing context:** <parsing | scheduling | task execution>
- **Task-instance log ref:** <dag_id / task_id / run_id / try_number>
- **Time/idempotency factor:** <execution_date / catchup / re-run considerations>

## 9. Handoff
- **Next in chain:** review gate → docs → ship.
- **Notes for reviewer:** <anything the review/security/docs steps should know>
