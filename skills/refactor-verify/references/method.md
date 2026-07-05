# Verify — full method (behavior-preserving gate)

`refactor-verify` is the gate that turns "behavior preserved" from a hope into a proof.
It runs inside every lane step and once more at the final gate. This document is the
exhaustive "how"; SKILL.md is the summary.

Absorbs and bakes in the intent of: testing-strategy (deciding which check proves what),
test-fixing (but strictly bounded — see the legal-fix rules; we do NOT fix tests to make
them pass), webapp-testing (re-exercising UI/endpoints after a change),
intended-vs-implemented (the assertion is the intended behavior; a drift means the
implementation now diverges from it), and ab-test-analysis (comparing two result sets —
here the "A" is the recorded baseline, the "B" is post-step, and we test for a null
difference). No runtime dependency on those skills.

---

## 0. The gate is binary

For every step and the final diff:

- **Pass-set identical to the recorded green baseline → advance** (`delta = legal`).
- **Any assertion-level change → STOP, roll back the step** (`delta = drift`).

There is no third "fix it and continue" branch for behavior. The only mechanical fixing
allowed is rename-induced import/path churn (§3), which is not a behavior change.

---

## 1. Re-run the EXACT baseline

Run the precise command `refactor-safety-net` recorded through the harness — same
runner, same scope, same flags. Never substitute a faster subset or a different command:
a fixed baseline is only meaningful if the input is fixed. If you need a faster inner
loop during a step, that is fine for your own iteration, but the *gate* decision must be
made on the full recorded baseline.

---

## 2. Classify the outcome — legal vs drift

Compare current result to the recorded pass-set: same tests present, same pass/fail per
test, same snapshot contents, same order-sensitive output.

| Outcome | Meaning | delta | Action |
|---|---|---|---|
| Pass-set identical | Behavior preserved | `legal` | Advance |
| A test's **assertion** now fails (expected≠actual value) | Behavior drifted | `drift` | Roll back the step |
| A snapshot content changed | Output drifted | `drift` | Roll back the step |
| Test count dropped / a baseline test vanished | Coverage lost | `drift` | Roll back — never let baseline tests disappear |
| **Compile/import/path error introduced by a rename/move step** | Mechanical churn, not behavior | `legal` (after fix) | Fix imports/paths only, re-run (§3) |
| Compile error NOT from a rename (logic won't build) | The change is broken | `drift` | Roll back the step |
| New flakiness | Untrustworthy signal | treat as `drift` | Roll back; stabilize separately |

### Drift-detail checklist (what "assertion-level" covers)
Value of an assertion · snapshot text · output ordering · error message text · error
*type* (thrown vs returned) · `null`/`undefined`/missing-key · numeric precision /
rounding · date/timezone formatting · whitespace · log-line output · number or identity
of side effects (rows written, calls made, events emitted) · async ordering.

Any of these moving = drift = rollback.

---

## 3. The ONLY legal mechanical fix: rename-induced churn

A rename or move step (e.g. `refactor-*-module-rename`, moving a file to its correct
layer) *necessarily* breaks the import statements and paths that referenced the old
name/location. Repairing exactly that churn is legal and expected, because it changes no
behavior — it only re-points references to the moved symbol.

**Legal to fix mechanically after a rename step:**
- `import` / `require` / `use` statements pointing at the old path or old name.
- Path strings that referenced the moved file.
- Re-export barrels that named the old symbol.

**NEVER legal (this is drift, roll back):**
- Editing an assertion, expected value, or snapshot.
- Changing logic, conditionals, or data flow to make a test pass.
- Deleting, `.skip`-ing, or `.only`-ing a baseline test.
- "Adjusting" an error message or return shape the test checks.

After repairing churn, re-run the full baseline. If it is now identical, `delta = legal`.
If assertions still fail, it was never pure churn — it is drift; roll back.

---

## 4. On drift: roll back, do not fix

1. Restore the pre-step state from the checkpoint the orchestrator took before the step
   (`git stash apply <checkpoint sha>` or reset the step's edits). The repo returns to
   the last green state — the baseline passes again.
2. Report the specific assertion that moved: test name, expected (baseline) vs actual
   (post-step) value. This is the drift evidence.
3. Signal self-heal (§5). A rollback is the chain working correctly — it caught a
   behavior change and refused to let it through. It is not a failure of the chain.
4. Re-attempt the step a *different* way (that is `refactor-*`'s job on heal), then
   verify again. After `MAX_RETRIES` the harness blocks and the blocker is surfaced.

---

## 5. Signal the harness — single-sourced state

Advance only through the orchestrator so state survives turns/compaction:

```
# identical, or legal churn fixed:
node <orchestrate.mjs> advance --target <dir> --delta legal --note "<baseline re-run identical: 142 passed>"

# drift detected:
node <orchestrate.mjs> advance --target <dir> --delta drift        # harness refuses to advance, tells you to roll back
node <orchestrate.mjs> fail    --target <dir> --reason "<assertion that moved: priceCart SAVE10 expected 175 got 170>"
```

`advance --delta drift` will not move the cursor — it returns
`blocked: "behavior drifted — roll back this step, do not advance"`. `fail` records the
attempt and enters `healing` (or `blocked` after 3 tries). Never hand-edit state.json.

Checkpoints are created by `orchestrate.mjs checkpoint --label <step>` before a step;
use the returned sha for rollback.

---

## Per-framework baseline commands (registry-backed)

The language registry (`scripts/lib/languages.mjs`) resolves these; use the project's own script when one exists (`npm test`, a Makefile target) before falling back to the bare runner.

| Stack | Baseline command | Notes |
|---|---|---|
| JS/TS (jest/vitest/mocha) | `npx jest` / `npx vitest run` / `npm test` | prefer the package script |
| Java (Maven/Gradle) | `mvn -q test` / `./gradlew test` | surefire/JUnit output parsed per class |
| Python | `pytest -q` | |
| Go | `go test ./...` | |
| Rust | `cargo test` | |
| .NET | `dotnet test` | sln or csproj dir |
| Ruby | `bundle exec rspec` | Gemfile + spec/ |
| Elixir | `mix test` | ExUnit: async tests are per-module; compare the pass-set at test-name granularity |
| Erlang | `rebar3 eunit` (or `rebar3 ct` for suites) | eunit vs common_test differ — record which was baselined |
| C/C++ (CMake) | `ctest --test-dir build` | plus compile-clean `-Wall -Werror` as a legal gate; sanitizers advisory |
| PHP | `vendor/bin/phpunit` | |
| Lua | `busted` | |
| Perl | `prove -l` | |
| Haskell | `stack test` / `cabal test` | |
| OCaml | `dune test` | |
| Ada | `gprbuild` + gnattest harness | compile-clean is part of the gate |
| Fallback | `make check` / `make test` | only with a Makefile target present |

**BEAM semantics:** a green `mix test`/`rebar3 eunit` compares *named tests*, not just exit code — OTP supervision restarts can mask crashes, so treat new `Logger` error bursts during a green run as drift-suspect. **C/C++ compile-as-verify:** when a repo has no tests, a warnings-clean build (`-Wall -Werror`) plus the derived characterization checks IS the baseline; record it as `--derived`.

## 6. Final gate

After the last lane step (and after `refactor-code-principles`), re-run the whole baseline
over the complete accumulated diff. The pass-set must equal the **original** baseline
exactly — not "each step was fine individually" but "the end state matches the start
behavior". Only then report the change as behavior-preserving and let the chain move to
the docs/ship phases.

Record the verdict with `templates/output.md`.

## Running the verify gate in CI

The composite GitHub Action (`uses: ahmedbenaw/refactor-chain@v3`, deterministic mode) runs this same gate headless: baseline command from the registry, pass-set comparison, report to the job summary / PR comment. It never merges and never edits — a red verify in CI is information for a human, exactly like a red verify in chat. See `refactor-ci-agent` for setup and secrets hygiene.
