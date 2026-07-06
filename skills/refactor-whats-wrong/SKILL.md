---
name: refactor-whats-wrong
description: "Use this skill when the user reports a reproducible bug and wants the real cause found and fixed — plain triggers like \"why is this broken\", \"it crashes when I…\", \"this throws an error\", \"it stopped working\", \"fix this bug\", \"there's a regression\", \"the test fails\". It is the do-the-work step of the refactor-chain DEBUG lane (the fix→verify chain), reached when the harness classifies a case as debug/whats-wrong. It traces the symptom backward to its true origin via an evidence chain rather than patching where the error surfaces. Conditional add-on: when an Airflow `dags/` directory is detected, it also applies DAG-specific root-cause tactics."
---

# What's Wrong? — Systematic Root-Cause Debugging — refactor-chain · DEBUG lane

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (debug) · **Prerequisite:** diagnose (harness classified the case as `debug`/`whats-wrong`) · **Next:** review gate → docs → ship.
**Adaptivity / conditional:** repo-agnostic; **conditional** DAG tactics activate only when an Airflow `dags/` directory (or an `apache-airflow` dependency) is detected by the harness signal `airflow-dags`.

## Purpose
Find the *true origin* of a reproducible bug and fix it there — not where the error happens to surface. This skill runs a disciplined loop: reproduce the failure reliably, form one hypothesis at a time, design the smallest probe that would confirm or refute it, and trace the symptom backward along an evidence chain until you reach the earliest broken assumption. Only then do you fix, and only then do you verify the fix against the original reproduction.

## When to use
- Something that used to work now fails, or fails only in certain conditions. Triggers: "why is this broken", "it stopped working", "regression".
- A concrete error, crash, or failing test. Triggers: "it throws X", "it crashes when I click Y", "this test fails".
- The bug is (or can be made) reproducible. If it is not yet reproducible, Phase 1 makes it so before anything else.
- Not for: performance-only complaints (use `refactor-web-performance`), memory growth over time (use `refactor-code-memory`), or "add a new feature" requests (out of scope for refactor-chain).

## What I'll tell you (plain-language / ADHD-friendly)
- "First I'm going to make it break on purpose so we both see the same thing. I won't change any of your code yet."
- "You are here: step 1 of 2 (find-and-fix, then a quick review gate) — I have one hunch. I'm going to run one tiny check to see if it's right, nothing more."
- "That hunch was wrong. Good — that rules out a whole area. I'm following the trail one step further back (attempt 2 of 3)."
- "Found it. The error shows up in `checkout.js`, but the real cause is three steps earlier where a date is parsed wrong. I'll fix it there so it can't come back."
- "Fix is in. I re-ran the exact thing that broke, and it now passes. Want the technical write-up of the evidence chain?"
- "Your app keeps working the same everywhere else — I only touched the one broken assumption."

## Method
Work the loop in `references/method.md`; the short form:
1. **Reproduce.** Get a deterministic repro (exact steps, inputs, command, or a failing test). Capture the exact error text and stack. If flaky, pin the conditions (seed, time, order, data) until it is reliable. No repro → no debugging.
2. **Observe & bound.** Read the real error and stack top-to-bottom. Mark the last known-good point and the first observed-bad point — the true cause lives between them. Do not guess past the evidence.
3. **Hypothesize (one at a time).** State a single falsifiable claim: "X is wrong because Y." Rank hypotheses by likelihood × cheapness-to-test.
4. **Minimal probe.** Design the smallest observation that decides it — a log line, an assertion, a breakpoint, a one-line REPL check, a narrowed test. Change as little as possible; probes are read-only where they can be.
5. **Confirm or refute.** Run the probe. If refuted, discard the hypothesis (that is progress) and step one link further back along the evidence chain. If confirmed, you have the origin.
6. **Fix at the origin, then verify.** Fix the earliest broken assumption, not the surface symptom. Re-run the *original* reproduction — it must now pass — plus the existing test suite to prove no regression. Record the evidence chain in the output template.

Use `scripts/checklist.mjs` to print the loop as JSON for the orchestrator or a to-do view. **Conditional (Airflow):** when `dags/` is present, also apply the DAG tactics in `references/method.md` (scheduler vs. execution vs. parsing context, task-instance logs, XCom/dependency mismatches, backfill/catchup effects) before concluding.

## Guardrails
- **Fix the cause, not the symptom.** A patch at the surface that hides the error is a failure, not a fix — the evidence chain must reach the origin.
- **One hypothesis, one probe at a time.** Never shotgun several changes at once; you lose the ability to attribute cause.
- **Behavior-preserving elsewhere.** Only the buggy path changes; everything else must keep working. Probes are removed or downgraded to permanent tests before shipping.
- **Undo is one step away.** Each probe/change is small and reversible; on a wrong turn, revert and try the next hypothesis (max ~3 attempts before escalating with what was learned).
- **No repro, no fix.** If it cannot be reproduced, say so and gather more signal rather than guessing.

## Verify
- Plain: "The exact thing that broke now works, and nothing else changed."
- Technical: the original reproduction (steps/command/failing test) now succeeds; the full existing test suite passes; the fix sits at the origin identified by the evidence chain (not at the surface frame); any temporary probes are removed or converted into a regression test that fails on the old code and passes on the new.

## Resources
- `references/method.md` — the full loop, evidence-chain rules, and the conditional Airflow DAG tactics.
- `examples/before-after.md` — a worked case tracing a surface `TypeError` back to its true origin.
- `scripts/checklist.mjs` — zero-dep Node script; prints this skill's step checklist as JSON.
- `templates/output.md` — the debug report scaffold (repro, evidence chain, root cause, fix, verification).

## Chain position
Reached from the harness `diagnose` step when the case is `debug`/`whats-wrong`. It is the DEBUG lane's fix→verify chain (diagnose → reproduce → fix → verify), **not** a refactor lane. The debug lane is a single step (this skill) followed directly by the review gate (`refactor-review-gate`) — `refactor-code-principles` does **not** run in the debug lane, unlike the refactor lanes. On success the orchestrator advances to that review gate, then docs and ship.
