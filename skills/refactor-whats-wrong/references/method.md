# Method — Systematic Root-Cause Debugging (evidence chain)

The whole discipline is one idea: **the error surfaces where it surfaces, but it originates
somewhere earlier. Trace backward, one falsifiable step at a time, until the earliest broken
assumption is proven. Fix there.** Guessing and patching the surface is how bugs come back.

---

## Phase 1 — Reproduce (no repro, no debugging)

A bug you cannot reproduce, you cannot fix — you can only guess. Make it deterministic first.

1. **Capture the exact failure.** The literal error message, the full stack trace, the exit code,
   the failing assertion. Do not paraphrase; the exact wording is evidence.
2. **Write the minimal repro.** The shortest sequence — steps, inputs, a command, or (best) a
   failing automated test — that produces the failure every time.
3. **Kill the flake.** If it fails only sometimes, the "sometimes" IS a clue. Pin the hidden
   variable until it is 100% reliable:
   - **Ordering / shared state:** run in isolation vs. in suite; a leaked global or DB row?
   - **Time / date:** freeze the clock; timezone, DST, month boundary, leap day?
   - **Randomness:** fix the seed.
   - **Concurrency:** force serial; a race, a missing lock/await?
   - **Data:** which specific input triggers it? Bisect the dataset.
   - **Environment:** env var, locale, node/runtime version, missing file.
4. A reliable repro is your **oracle**: it is how you will later prove the fix.

## Phase 2 — Observe & bound the search space

1. **Read the stack top-to-bottom.** The top frame is where it *threw*, not necessarily where it
   *went wrong*. Read the whole chain and the actual values, not the code you assume ran.
2. **Establish two anchors:**
   - **Last known-good:** the latest point where state is provably correct.
   - **First observed-bad:** the earliest point where state is provably wrong.
   The true cause lives *between* these two anchors. Everything outside is out of scope.
3. **Do not read past the evidence.** If you have not observed a value, you do not know it. Instrument
   to observe; never assume.

## Phase 3 — Hypothesize (exactly one at a time)

State a single **falsifiable** claim: *"The value of `X` is wrong at line L because `Y`."* A good
hypothesis predicts what a probe will show. Rank candidates by **likelihood × cheapness-to-test** and
take the cheapest decisive one first. Never hold two live hypotheses — you lose attribution.

## Phase 4 — Minimal probe

Design the **smallest observation that decides the hypothesis**:
- A single log/print of the suspect value at the suspect point.
- An `assert`/invariant that must hold if the hypothesis is false.
- A breakpoint / REPL evaluation.
- A narrowed test that exercises only the suspect path.

Rules: change as little as possible; prefer read-only observation over mutation; one probe per
hypothesis; keep probes labeled so they are trivial to remove.

## Phase 5 — Confirm or refute → walk the chain

- **Refuted:** discard the hypothesis. This is *progress* — a whole region is now cleared. Move the
  "first observed-bad" anchor one link earlier and form the next hypothesis.
- **Confirmed:** you have found a broken link. Ask: *is this the origin, or is the thing that produced
  this value ALSO wrong?* Keep tracing backward until the input to the broken step is provably correct.
  That boundary — correct-in, wrong-out — is the **root cause**.

This backward walk is the **evidence chain**: symptom ← link ← link ← origin, each link a confirmed
observation, not a guess.

Stop rule: if 3 hypotheses in a row are refuted with no narrowing, step back and re-check Phase 1
(is the repro really deterministic?) and Phase 2 (are the anchors real?) before continuing.

## Phase 6 — Fix at the origin, then verify

1. **Fix the earliest broken assumption.** If the symptom is `null` in `render()` but the origin is a
   parser that returns `undefined` for empty input, fix the parser — not `render()`.
2. **Reject symptom patches.** A `try/catch` that swallows the error, a `?? fallback` that hides the
   bad value, a guard that returns early — these mask the bug; they do not fix it. Only ship them if the
   evidence chain proves that value is genuinely valid.
3. **Verify against the oracle:** re-run the *original* reproduction from Phase 1 — it must now pass.
4. **Prove no regression:** run the full existing test suite green.
5. **Lock it in:** convert the repro into a regression test that **fails on the old code and passes on
   the new**. Remove every temporary probe.

---

## Conditional — Airflow DAG tactics (only when a `dags/` dir or `apache-airflow` is detected)

The harness sets the `airflow-dags` signal. Airflow bugs hide in *context*, not just code:

- **Which context failed?** DAG *parsing* (import errors, top-level code run every scheduler heartbeat),
  *scheduling* (dependencies/trigger rules/`catchup`), or *task execution* (the operator's runtime)?
  The three run in different processes — read the matching logs.
- **Task-instance logs are the real stack trace.** Read the specific try-number's log, not the UI summary.
- **Top-level DAG-file code is a trap.** Anything at module scope runs on every parse; heavy work, live
  connections, or `datetime.now()` at top level cause "works once, breaks later" bugs.
- **XCom / dependency mismatches:** a downstream task pulling a key an upstream never pushed; a trigger
  rule (`all_success` vs `all_done`) that skips or runs unexpectedly.
- **Time is state:** `execution_date`/`logical_date`, `start_date`, `schedule_interval`, `catchup=True`
  backfills — a "wrong data" bug is often a wrong-interval bug.
- **Idempotency:** re-runs and backfills replay tasks; a non-idempotent task fails the second time.

Apply the same loop: reproduce (trigger the exact DAG run / `airflow tasks test`), bound (which context),
hypothesize, probe (targeted log/`test`), confirm, fix at origin, verify by re-running the task.
