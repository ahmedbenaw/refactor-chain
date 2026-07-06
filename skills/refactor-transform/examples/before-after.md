# Worked example — apply a rename, verify identical, with one self-heal

## The approved step

Lane plan step `rename-OrderRepo`: rename the type `OrderRepo` → `OrderRepository`
to match the project's naming rule (`R03` from `refactor-rules`: repositories end
in `Repository`). Behavior-preserving. Baseline is GREEN: 214 tests pass.

## 1. Checkpoint

```
orchestrate.mjs checkpoint --label "rename-OrderRepo" --target .
→ snapshot taken (git stash)
```

## 2. Apply the smallest transform (attempt 1)

Rename the class and update its references:

```java
// BEFORE
public interface OrderRepo extends JpaRepository<Order, Long> { }
```
```java
// AFTER
public interface OrderRepository extends JpaRepository<Order, Long> { }
```

Plus the necessary import/reference updates in the 6 files that used `OrderRepo`
— that is the *legal churn* a rename forces. Nothing else touched.

## 3. Verify — attempt 1 drifts

Re-run baseline: **213 pass, 1 fail.** `OrderErrorMessageTest` asserted an error
string `"OrderRepo lookup failed"` — the message embedded the old class name via
`getSimpleName()`, so the rename changed observable output.

Pass-set is **not** identical → **drift**. This is a real behavior change, not
legal churn. Do NOT edit the test to match.

```
orchestrate.mjs fail --target . --reason "rename changed error message via getSimpleName(); OrderErrorMessageTest flipped"
→ rolled back to checkpoint; retrying (attempt 2 of 3)
```

Plain-language to the user: *"That didn't work — renaming the class changed an
error message your tests check. I undid it and I'm trying a cleaner way (attempt 2
of 3)."*

## 2'. Apply (attempt 2, cleaner)

Same rename, but decouple the message from the class name first (the message was
never *meant* to depend on the type name — it's incidental). Introduce a constant
message `"Order lookup failed"` used by both the code and the test's expectation
as the deliberate behavior, then rename. Now the rename touches no observable
output.

> Note: the message change is itself a tiny behavior-preserving adjustment that
> the plan absorbs; if it were a real behavior change it would be its own step,
> not smuggled into the rename.

## 3'. Verify — attempt 2 identical

Re-run baseline: **214 pass** — identical pass-set. The only incidental edits are
the import/reference updates (legal churn).

## 4. Advance

```
orchestrate.mjs advance --target . --delta legal --note "rename-OrderRepo"
→ cursor advanced to next step
```

Signal emitted:
```json
{ "step": "rename-OrderRepo", "result": "healed", "delta": "legal",
  "attempts": 2, "checkpoint": "rename-OrderRepo" }
```

## What this demonstrates

- The change was applied **only** behind a checkpoint.
- The first attempt's drift was caught by the identical-pass-set check and rolled
  back — not masked by editing the test.
- The self-heal retried a cleaner approach and succeeded within the 3-attempt
  budget.
- Had all 3 attempts drifted, the step would have **blocked** with the repo left
  GREEN at the checkpoint — never half-renamed, never red.
