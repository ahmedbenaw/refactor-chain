# Safety Net — full method (baseline phase)

The safety net is the green fixed point that makes a refactor *provable*. Everything
downstream (`refactor-verify`) compares the code's live behavior against this net.
This document is the exhaustive "how"; the SKILL.md body is the summary.

Absorbs and bakes in the intent of: test-driven-development (the discipline of a
test that describes behavior before code changes), derive-tests (constructing tests
from observed behavior when none exist), and test-scenarios (enumerating the seams
worth pinning). No runtime dependency on those skills — the method is inlined here.

---

## 0. The one invariant

**NEVER refactor on a red repo.** A red baseline is not a baseline — there is no
agreed truth to preserve, so "behavior unchanged" is unprovable. If the suite is red
before you have touched anything, STOP and surface it. Getting to green is a separate,
clearly-labeled fix (a bug fix or a broken-test fix), never smuggled into the refactor.

---

## 1. Detect the suite

Determine whether a runnable test suite already exists. Signals, in rough priority:

- **Package manifest scripts** — `package.json` `scripts.test`, `Makefile` `test:`,
  `pyproject.toml`/`tox.ini`, `pom.xml`/`build.gradle` test tasks, `Cargo.toml`,
  `go.mod` (`go test ./...`), `*.csproj` test targets.
- **Test directories / naming** — `test/`, `tests/`, `spec/`, `__tests__/`,
  `*_test.go`, `*.test.ts`, `*.spec.js`, `test_*.py`, `*Test.java`, `*Spec` classes.
- **Runner config** — `jest.config`, `vitest.config`, `pytest.ini`, `.mocharc`,
  `karma.conf`, `phpunit.xml`, `rspec`.
- **CI** — `.github/workflows/*`, `.gitlab-ci.yml`, `Jenkinsfile` — the CI test
  command is often the most authoritative "how this repo is tested".

Outcome: either **suite exists** (go to §2) or **no suite** (go to §3).

Record the exact command you will use — `refactor-verify` re-runs precisely it.

---

## 2. Suite exists → run and read

1. Run the **narrowest** command that exercises the code in scope first (fast signal),
   then the **full** suite (authoritative). Prefer the CI command if one exists.
2. Read the result:
   - **GREEN** → this passing run is the baseline. Capture the pass-set (test count,
     or the list, or a stable summary) and record it (§5).
   - **RED** → STOP. Do not refactor. Surface the failing tests verbatim. Offer:
     (a) help make it green as a separate labeled fix, or (b) baseline only the
     currently-green subset that the refactor will touch, and explicitly note the
     red area is out of the net (the refactor must not touch it).
   - **FLAKY** (passes/fails nondeterministically) → mark and exclude flaky tests
     from the baseline set; a flaky net produces false drift alarms and destroys trust
     in the chain. Note them for the user to stabilize separately.

Do not add or "improve" tests here if a green suite already exists — the existing
green run is the net. Adding coverage is not this phase's job.

---

## 3. No suite → derive minimal characterization tests

Characterization (a.k.a. "golden master" / "pin-down") tests record what the code
*actually does now*, so any later change of behavior is visible. They describe, they
do not prescribe.

### 3a. Enumerate the seams worth pinning (test-scenarios intent)
List the observable surfaces the refactor will cross:
- Public functions / methods the refactor moves or reshapes.
- HTTP endpoints (status, headers, body shape).
- CLI invocations (stdout/stderr, exit code).
- Rendered output (HTML/DOM, a component's rendered text/attrs).
- Emitted events, written files, DB rows, external calls (assert via fakes/spies).
Pick the *smallest set that would notice the drift you care about*. A net is minimal
by design: enough to catch regressions in the refactored surface, not a full spec.

### 3b. Derive each test from observed behavior (derive-tests intent)
For each seam:
1. Run the code with representative + edge inputs (empty, boundary, error paths).
2. Capture the **actual current output** and make it the assertion — exactly as it is.
3. **Pin quirks and bugs too.** If the function returns `-0`, sorts unstably, throws a
   weirdly-worded error, or returns `null` where you'd expect `undefined` — pin *that*.
   The point is to detect *change*, not to bless "correct" behavior. "Fixing" behavior
   while pinning it hides exactly the drift you are trying to catch.
4. Prefer approval-style snapshots for large/structured output; prefer explicit
   assertions for small/critical values so intent is readable.

### 3c. Watch these drift-prone details (they are what verify will guard)
Output ordering · error message text and error *type* · `null` vs `undefined` vs
missing key · numeric precision / rounding · date/timezone formatting · whitespace ·
log lines · thrown-vs-returned errors · async timing / ordering of side effects.

---

## 4. Run the derived tests GREEN against unmodified code

The derived tests must pass against the code as it is *right now* — they describe it.
A derived test that fails on untouched code is a wrong test: fix the *test*, never the
production code. Only when every derived test is green is the net valid.

Keep them fast. They run after every lane step via `refactor-verify`; a slow net taxes
the whole chain.

---

## 5. Record the baseline into the harness

Single-source the state through the orchestrator so `refactor-verify` can compare:

```
node <orchestrate.mjs> baseline \
  --target <project-dir> \
  --cmd "<exact test command>" \
  --framework <jest|pytest|go|junit|...> \
  [--derived] \
  --passset "<stable summary, e.g. '142 passed' or a snapshot hash>"
```

`--derived` marks that this net was authored by safety-net (vs pre-existing). The
harness flips phase `baseline → lane`, marks the first lane step active, and records
`baseline.at`. Confirm with `orchestrate.mjs status` (`baseline: true`).

The harness path is the plugin's `scripts/orchestrate.mjs`
(`~/.claude/skills/refactor-chain/scripts/orchestrate.mjs`). Do not reinvent state.

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

## 6. Hand off

Report, using `templates/output.md`:
- The exact baseline command and framework.
- Pass-set summary (count / list / snapshot id).
- Whether the net was pre-existing or derived (and which seams, if derived).
- Confirmation the harness advanced to `lane`.
- Any excluded red/flaky areas the refactor must avoid.

The chain may now run its first lane step. From here, `refactor-verify` owns the gate.
