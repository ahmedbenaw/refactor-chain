---
name: refactor-safety-net
description: "Use this skill right before any refactor touches code, to record a GREEN behavior baseline the whole chain will be judged against. If a test suite already exists, its passing run IS the baseline; if none exists, derive minimal behavior-pinning (characterization) tests first, then run them green. Trigger phrases include \"set up a baseline\", \"pin the current behavior\", \"make sure we can tell if I break something\", \"we have no tests\", or the orchestrator entering the baseline phase after plan. This is the baseline phase of the refactor-chain pipeline — its hard rule is NEVER refactor on a red repo. Ties into `orchestrate.mjs baseline`."
---

# Safety Net — record a GREEN behavior baseline — refactor-chain · baseline

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** baseline · **Prerequisite:** plan · **Next:** the first lane step (then `refactor-verify` gates every step against this baseline).
**Adaptivity / conditional:** repo-agnostic — behaves differently only on the single signal "does a runnable test suite already exist?".

## Purpose
Before a single line is refactored, this skill establishes proof of what the code does *today* and confirms that proof is GREEN. That green run is the baseline — the fixed point the rest of the chain compares against. If tests already exist, their passing run is the baseline. If they don't, this skill first derives the smallest set of behavior-pinning (characterization) tests that lock in the current observable behavior — bugs and all — then runs them green. The chain is not allowed to start on a red repo, because a red repo has no truth to preserve.

## When to use
- The orchestrator has finished `plan` and moved to the `baseline` phase.
- The person says: "set up a baseline", "pin the current behavior first", "we have no tests and I want to refactor safely", "how will we know if this breaks something?", "lock in what it does now".
- Any time a behavior-preserving change is about to begin and the green fixed point has not yet been recorded.
- NOT for adding new features, fixing bugs, or improving coverage for its own sake — this is only the minimal net under a refactor.

## What I'll tell you (plain-language / ADHD-friendly)
- "First I'm going to make a safety net, then we refactor. The net tells us instantly if the code stops behaving the same. Your code keeps working the same the whole time."
- "You already have tests — I'm just running them once to confirm they're all green. That green run is our net. (you are here: 1 of 2)"
- "No tests here, so I'll write a few tiny ones that just record what the code does right now — even any quirks. I'm not fixing anything, only photographing today's behavior."
- "Heads up: the suite is red before we've touched anything. We do NOT refactor on a red repo — that's the one rule. Want me to help get it green first, or should I pin only the parts that currently pass?"
- "Net is green and recorded. From here, every step gets checked against it. Show technical details?"

## Method
1. **Detect the suite.** Look for a test runner and existing tests (config files, `test`/`spec` folders, package scripts). Decide: suite exists, or none.
2. **If a suite exists — run it and read the result.** Run the narrowest command that exercises the code in scope, then the full suite. If it is green, record it as the baseline (see step 5). If it is RED, STOP: do not refactor. Surface the failure; offer to help make it green (that is a separate, clearly-labeled fix, not part of the refactor) or to baseline only the currently-green subset the refactor touches.
3. **If no suite exists — derive minimal characterization tests.** Pick the seams the refactor will cross (public functions, endpoints, CLI outputs, rendered output). For each, capture *actual current output* as the assertion — pin behavior exactly as it is, including known bugs, ordering, error messages, `null` vs `undefined`, precision. Keep it minimal: enough to notice drift, not a full spec. See `references/method.md` for the derive procedure and characterization patterns.
4. **Run the derived tests green.** They must pass against unmodified code (they describe it). A derived test that fails on untouched code is wrong — fix the test, not the code.
5. **Record the baseline into the harness.** Capture the pass-set and how it was produced so `refactor-verify` can compare later:
   `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs baseline --target <dir> --cmd "<test command>" --framework <name> [--derived] --passset "<summary>"`. The `--derived` flag marks that the net was written by this skill (not pre-existing). This flips the harness phase `baseline → lane` and unlocks the first step.
6. **Hand off.** Report the exact command, the green pass-set, and that the chain may now proceed.

Full rules, the derive-tests procedure, characterization patterns, and the red-repo protocol are in `references/method.md`.

## Guardrails
- **Behavior-preserving / advisory:** this skill writes *tests only*. It NEVER edits production code. If getting to green requires a code fix, that is out of scope — flag it as a separate labeled change.
- **NEVER refactor on a red repo.** This is the one non-negotiable rule. A red baseline is not a baseline.
- Characterization tests pin *current* behavior, including bugs. Do not "correct" behavior while pinning it — that hides drift you are trying to detect.
- Keep the net minimal and fast; it will run after every step. Slow/flaky tests undermine the whole chain — mark and exclude flaky tests from the baseline set.
- Record the exact command and framework; `refactor-verify` re-runs precisely this.

## Verify
- Plain: "The net is green and written down. If anything changes behavior from here, we'll see it."
- Technical: the recorded baseline command exits 0; the pass-set is captured in `orchestrate.mjs status` (`baseline: true`, phase advanced to `lane`); derived tests (if any) pass against unmodified code and live under version control.

## Resources
- `references/method.md` — full method: suite detection, the derive-tests procedure, characterization-test patterns, the red-repo protocol, harness wiring.
- `examples/before-after.md` — a repo with no tests → minimal characterization net recorded green.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the baseline record scaffold to fill in and hand off.

## Chain position
Runs in the `baseline` phase, immediately after `plan` and before the first lane step. It produces the green fixed point that `refactor-verify` re-runs after every step and at the final gate. Nothing in the lane may start until this skill has recorded a green baseline.
