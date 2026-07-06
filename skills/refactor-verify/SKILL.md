---
name: refactor-verify
description: "Use this skill after every single refactor step and at the final gate to prove the change preserved behavior — re-run the recorded baseline and compare pass-sets. An IDENTICAL pass-set means advance; an ASSERTION-level failure means STOP and roll back that one step (this is NOT an auto-fix). The only failures legal to mechanically fix are import/path churn that a rename step necessarily produced. Trigger phrases include \"did that change break anything\", \"verify this step\", \"re-run the tests\", \"is behavior still the same\", \"check before we move on\", or the orchestrator reaching the verify point inside a lane step or the final gate. This is the verify gate that runs within every step of the refactor-chain pipeline. Ties into `orchestrate.mjs advance --delta legal|drift`."
---

# Verify — the behavior-preserving gate — refactor-chain · verify (every step + final)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** verify — runs *inside* every lane step and again at the final gate · **Prerequisite:** a green baseline from `refactor-safety-net` (the chain will not enter a lane without it) · **Next:** on identical pass-set → the next step; on drift → roll back this step and re-attempt (self-heal).
**Adaptivity / conditional:** repo-agnostic; behaves on one signal — did the pass-set stay identical, and if a step failed, was it an *assertion* failure or mere *rename churn*?

## Purpose
After each refactor step, this skill re-runs the exact baseline recorded by
`refactor-safety-net` and compares the result to the recorded green pass-set. The gate
is binary. If the pass-set is **identical**, behavior was preserved and the chain
advances. If an **assertion** fails, behavior drifted — the change is a rewrite, not a
refactor — so this skill STOPS and rolls back *that single step*. It does not try to
"fix" a drifted step; rolling back is the answer. The one exception: a rename/move step
legitimately breaks imports and paths, and mechanically repairing that churn (updating
import statements the rename necessitated) is legal and expected. It runs the same way
at the final gate over the whole diff.

## When to use
- Immediately after each lane step edits code, before advancing.
- At the final review gate, over the entire accumulated diff.
- The person says: "verify this step", "did that break anything?", "re-run the tests
  before we continue", "is the behavior still identical?", "check it, then move on".
- Whenever the orchestrator reaches the verify point of a step (`orchestrate.mjs`
  expects an `advance --delta legal|drift` decision from this skill).

## What I'll tell you (plain-language / ADHD-friendly)
- "Step done — now I re-run our safety net to make sure the code still behaves the same. One check, then we either move on or undo. (you are here: verify)"
- "Same tests pass as before — behavior is identical. Advancing to the next step."
- "Two tests that were green are now failing on their *assertions*. That means the behavior actually changed. I did NOT keep going — I undid this one step so your code is back to the last good state. Want to try that step a different way? (attempt 2 of 3)"
- "The only things that broke were import paths after the rename — that's expected churn from moving files, not a behavior change. I'm fixing just those imports and re-checking."
- "Final gate: whole change re-verified, pass-set identical to the original baseline. Behavior preserved end-to-end. Show technical details?"

## Method
1. **Re-run the exact baseline.** Run the command `refactor-safety-net` recorded (via
   the harness). Never substitute a different command or a subset — identical input is
   the whole point of a fixed baseline.
2. **Compare pass-sets.** Compare the current result to the recorded green pass-set:
   same tests, same pass/fail, same snapshots. Classify the outcome:
   - **Identical** → `delta = legal` (nothing broke, or only legal churn was fixed). Advance.
   - **Assertion-level failure** → `delta = drift`. A test's assertion changed value /
     an output moved. This is behavior drift. STOP.
   - **Import/path/compile failure caused by a rename step** → *legal churn only*.
     Mechanically fix the imports and paths the rename necessitated, then re-run. Do NOT
     touch any assertion or logic. If the re-run is identical, `delta = legal`.
3. **On drift: roll back this step, do not fix it.** Restore the pre-step checkpoint
   (`git stash apply <checkpoint>` or reset the step's edits). Report which assertion
   moved (expected vs actual). Then hand back to self-heal to re-attempt the step a
   different way — a rollback is not a failure of the chain, it is the chain working.
4. **Signal the harness.** Advance only through the orchestrator so state stays single-sourced:
   - identical / legal-churn-fixed → `orchestrate.mjs advance --target <dir> --delta legal --note "<what verified it>"`
   - drift → `orchestrate.mjs advance --target <dir> --delta drift` (the harness refuses
     to advance and instructs rollback), then `orchestrate.mjs fail --reason "<assertion that moved>"` to enter self-heal.
5. **Final gate.** Re-run the whole baseline over the complete diff; the pass-set must
   equal the *original* baseline exactly. Only then is the change behavior-preserving.

The exact legal-vs-drift decision table, the rename-churn rules, and the drift-detail
checklist are in `references/method.md`.

## Guardrails
- **Behavior-preserving gate — never a fixer.** An assertion failure is answered by
  **rollback**, never by editing tests or code to make it pass. Changing a test to match
  new output is defeating the safety net.
- **Only rename-induced import/path churn is legal to mechanically fix.** Any other
  compile/runtime break is treated as drift until proven to be pure churn.
- **Identical means identical.** Same tests, same assertions, same snapshots, same
  order-sensitive output. "Close enough" is drift.
- Never weaken, skip, or `.only`/`.skip` a baseline test to get green.
- Do not advance on your own — go through `orchestrate.mjs advance`; the harness owns state.

## Verify (of this skill's own success)
- Plain: "Same tests, same results as before we started — so the code still does the same thing. If not, I rolled the step back."
- Technical: baseline command re-run verbatim; pass-set diff is empty (or non-empty only
  in rename-induced import paths that were mechanically repaired); `orchestrate.mjs
  advance --delta legal` succeeded, OR `--delta drift` was recorded and the step rolled back.

### Contract
- **Inputs:** the recorded baseline (`state.baseline`: cmd, framework, passSet) and the current working tree.
- **Outputs:** a verify delta — `legal` (identical pass-set → `advance` allowed) or `drift` (assertion-level change → `advance` refused by the harness).
- **Failure modes:** no baseline recorded → refuses to verify (run refactor-safety-net first); test command itself broken → surfaced as a blocker, never counted as a pass; drift → rollback to the step checkpoint, then fail/heal path.

## Resources
- `references/method.md` — full method: legal-vs-drift decision table, rename-churn rules, drift-detail checklist, harness signalling.
- `examples/before-after.md` — a step that drifts (rolled back) and a rename step (churn fixed, advanced).
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the per-step verify verdict scaffold.

## Chain position
Runs at the verify point *inside every lane step* and again at the **final gate** over
the whole diff. It is fed by `refactor-safety-net` (the baseline it re-runs) and it
feeds the orchestrator's `advance`/`fail` transitions: identical → next step; drift →
roll back + self-heal. It is the gate that makes "behavior preserved" a proven claim
rather than a hope.
