# refactor-transform — full method, safe-transform catalog & harness loop

The behavior-preserving applier. It edits code, but only through a tight loop:
**checkpoint → apply the smallest transform → verify behavior identical →
advance, or heal/roll back.** The contract is simple and absolute: the test
pass-set *after* must equal the pass-set *before*. If it doesn't, the step did not
happen — roll it back.

## Hard preconditions (gate before any edit)

1. **GREEN baseline exists.** `refactor-safety-net` has recorded a passing run (an
   existing suite, or derived characterization tests, run green). If none exists,
   STOP and route back to baseline. **Never transform on a red repo.**
2. **Step is approved and behavior-preserving.** The change must come from the
   lane plan or an opted-in `refactor-reimagine` step, and must be a
   behavior-preserving *kind* of change (see catalog). Feature work and bug fixes
   are out of scope here.

## The loop (one approved transform per iteration)

### 1. Checkpoint
```
node <harness>/orchestrate.mjs checkpoint --label "<step-id>" --target <dir>
```
Takes a git-stash snapshot — the one-step undo. Every edit that follows sits
behind this. (`<harness>` = `~/.claude/skills/refactor-chain/scripts`.)

### 2. Apply the smallest transform
Make the *minimal* version of the approved change and **nothing else**. No
opportunistic renames, no "while I'm here" tidy-ups, no bundling two changes. The
smaller the diff, the cheaper the verification and the cleaner the rollback.

### 3. Verify — behavior identical
Re-run the recorded baseline and compare pass-sets to the baseline's.
- **Identical pass-set → pass.** Behavior preserved.
- **The only legal incidental change** is the import/path churn a rename/move
  *necessarily* causes (a moved symbol's imports, a renamed file's references).
  Fix exactly those and nothing more.
- **Any assertion-level difference → drift.** A test that flipped, a new failure,
  a changed value — behavior changed. Not allowed.

### 4. Advance or heal
- **Legal:**
  ```
  node <harness>/orchestrate.mjs advance --target <dir> --delta legal --note "<step-id>"
  ```
  Only `--delta legal` advances. `advance --delta drift` is refused by the harness
  (it returns `blocked: "behavior drifted — roll back this step"`), so never pass
  `drift` to `advance` to "push through" — a test drift or an ERROR-level rule drift
  is not advanceable. A non-test WARNING (e.g. a `refactor-rules` WARNING or a perf
  flag) that fired while tests held is still `legal` for advancing; record it in the
  `--note` so the review gate sees it.
- **Drift / failure:**
  ```
  node <harness>/orchestrate.mjs fail --target <dir> --reason "<what drifted>"
  ```
  The harness **self-heals**: rolls back to the checkpoint and retries a cleaner
  approach, up to `MAX_RETRIES` (3). Between attempts, tell the user plainly
  ("that didn't work — I undid it and I'm trying another way, attempt 2 of 3").
  After 3 failed attempts it **blocks** and surfaces to the human, leaving the
  repo GREEN at the last good checkpoint — never half-applied, never red.

## Safe-transform catalog (behavior-preserving kinds)

Each is behavior-preserving *when applied minimally and verified*:

- **Rename** (symbol / file / package). Legal churn: updating references/imports.
- **Extract** (method, function, variable, service, module). The extracted unit
  must be called from exactly where the code used to run inline.
- **Inline** (the inverse of extract). Only when the inlined unit has no other
  callers whose behavior would change.
- **Move** (symbol/file to another module/package). Legal churn: import paths.
- **Introduce a seam / interface** over an existing implementation, delegating
  through it (no behavior change until a later step swaps the implementation).
- **Change a signature** in a behavior-preserving way (reorder params with all
  callers updated, add a defaulted param, widen a return type) — every caller
  updated in the same step, verified identical.
- **Replace-with-equivalent** (a deprecated API for its documented drop-in, a loop
  for an equivalent stream/comprehension) — only when documented as equivalent.

If a proposed step is NOT one of these (it adds behavior, removes behavior,
changes output), it is not a transform — reject it here and route it to the
appropriate lane (feature/debug), or back to `refactor-reimagine` for
decomposition into behavior-preserving steps.

## The "smallest change" discipline

- One transform per checkpoint. If the plan says "extract 4 services," that's 4
  loop iterations, not one.
- Don't reformat unrelated code inside the same diff — it hides the real change
  and muddies rollback.
- Don't rename *and* move in one step; do the rename, verify, then the move.
- Prefer the change your editor's refactor tool can do mechanically; mechanical
  transforms drift less.

## Legal vs. drift — the one subtle rule

The verify gate allows **only** the import/path churn that the transform itself
forced. Concretely:
- Renaming `OrderRepo` → `OrderRepository` legally updates every import of it.
  That is `legal`.
- If, after that rename, a test asserting an error message now fails because the
  message embedded the old class name — that is a **behavior change** → `drift`.
  Roll back and handle the message deliberately, don't sneak it in.

Never edit a test to make it pass against changed behavior. That converts a
caught drift into a hidden one. Roll back instead.

## Output signal

Per step, emit:
```json
{ "step": "<step-id>", "result": "advanced|healed|blocked",
  "delta": "legal|drift", "attempts": 1, "checkpoint": "<label>" }
```
This mirrors the harness state so the chain (and the review gate) can see exactly
what happened at each transform.

## Hard rules
- Behavior-preserving only; pass-set after == pass-set before.
- Never transform on a red repo.
- One minimal transform per checkpoint.
- Every change reversible via its checkpoint.
- Only legal import/path churn is an allowed incidental edit.
- Never edit tests to mask a behavior change.
- Keep identifiers/paths verbatim in `backticks`.
