---
name: refactor-transform
description: "Use this skill to actually APPLY an approved modernization step to the code while proving behavior stays identical — the behavior-preserving transformation applier used by the refactor/modernize lanes. It runs the tight safety loop the whole chain is built on: checkpoint (a rollback point) → apply the SMALLEST possible transform → verify behavior is identical against the recorded baseline → advance, or self-heal/roll back if it drifted. Trigger phrases include \"apply this refactor step\", \"make the change but don't break anything\", \"do it safely, one step at a time\", \"execute the approved modernization\", \"transform this without changing behavior\", \"carefully apply and verify\". This is the do-the-work executor of the refactor-chain pipeline; it ties directly into the harness checkpoint→apply→verify→advance/heal loop (orchestrate.mjs). Behavior-preserving by contract — it edits code, but only in verified, reversible increments."
---

# Transform — Behavior-Preserving Applier — refactor-chain · do-the-work executor

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work · **Prerequisite:** refactor-safety-net (a GREEN baseline exists) + an approved step (from the lane plan, or opted-in from `refactor-reimagine`) · **Next:** the verify gate, then the next step, then the review gate.
**Adaptivity / conditional:** repo-agnostic. It is the only skill in the lane that *edits code*, and it does so strictly through the checkpoint→apply→verify loop so every change is small, verified, and reversible.

## Purpose
This is the hands-on-keyboard step. Given one **approved, behavior-preserving**
transformation (a rename, an extract, a move, an inline, a signature change), it
applies that change safely: it first takes a rollback checkpoint, then makes the
**smallest** version of the change, then re-runs the recorded baseline to prove
behavior is **identical** (same pass-set), then advances. If behavior drifted, it
does not push forward — it self-heals (retry a cleaner way) or rolls the step
back, and never leaves the repo half-changed and red. It is the executor the
whole chain's safety story depends on, wired directly into the harness loop.

## When to use
- An approved modernization step is ready to be applied. Trigger: "apply this
  refactor step", "execute the approved modernization".
- The user wants the change made carefully and reversibly. Trigger: "make the
  change but don't break anything", "do it safely, one step at a time",
  "carefully apply and verify".
- `refactor-reimagine` handed over an opted-in step, or the lane plan reached a
  transform.

## What I'll tell you (plain-language / ADHD-friendly)
- "Before I change anything, I'm saving a restore point. If this goes sideways I
  can put it back exactly."
- "You are here: step 3 of 7 — I'm making one small change: `<the one change>`.
  Nothing else."
- "Change made. Now I'm re-running your tests to check the app still behaves
  exactly the same… all green, behavior identical. Moving on."
- "That didn't work — the tests changed. I undid it and I'm trying another way
  (attempt 2 of 3)."
- "I've tried three ways and it still changes behavior, so I stopped and left your
  code exactly as it was. Here's what I saw — you decide the next move."
- "Only import/path churn changed, which a rename always causes; I fixed just
  those and re-verified. Want to see the exact edits? Say 'show technical
  details.'"

## Method
1. **Preconditions (hard gate).** Confirm a GREEN baseline exists
   (`refactor-safety-net`) and the step is approved and *behavior-preserving*. If
   the repo is red, STOP — never transform on a red repo.
2. **Checkpoint.** Take a rollback point before touching code:
   `orchestrate.mjs checkpoint --label "<step>" --target <dir>` (git-stash
   snapshot). This is the one-step undo.
3. **Apply the smallest transform.** Make the *minimal* version of the approved
   change and nothing else — one rename, one extraction, one move. No opportunistic
   edits, no bundled "while I'm here" changes. See `references/method.md` for the
   catalog of safe transforms and how to keep each minimal.
4. **Verify — behavior identical.** Re-run the recorded baseline and compare
   pass-sets. **Identical pass-set = pass.** The *only* incidental changes allowed
   are the import/path churn a rename/move necessarily produces — fix just those.
   Any assertion-level difference is drift.
5. **Advance or heal.**
   - Identical (modulo legal import churn) → `orchestrate.mjs advance --target
     <dir> --delta legal`. Move to the next step. (Note: `advance --delta drift`
     does NOT advance — the harness blocks it and tells you to roll back. Use it
     only to signal drift, never to push a drifted step forward.)
   - Behavior changed → `orchestrate.mjs fail --target <dir> --reason "<what
     drifted>"`. The harness self-heals: it rolls back to the checkpoint and
     retries a cleaner way, up to `MAX_RETRIES` (3). After 3, it blocks and
     surfaces to the human — the repo is left GREEN at the last checkpoint, never
     half-applied.
6. **Repeat per step.** One approved transform per loop. Never batch two
   behavior-changing edits into one checkpoint.

See `references/method.md` for the safe-transform catalog, the "smallest change"
discipline, the legal-vs-drift rule, and the exact harness commands.

## Guardrails
- **Behavior-preserving by contract.** The pass-set after must equal the pass-set
  before. This skill applies refactors, not features or fixes.
- **Never transform on a red repo.** A GREEN baseline is a hard precondition.
- **Smallest change only.** One transform per checkpoint; no bundled edits.
- **Reversible always.** Every change sits behind a checkpoint; undo is one step.
- The only mechanically-legal incidental edit is import/path churn caused by the
  transform itself. Anything else that changes behavior is drift → heal/roll back.
- Do not "fix" a failing assertion by editing the test to match new behavior —
  that hides drift. Roll back instead.
- Keep identifiers/paths verbatim in `backticks`.

## Verify
- Plain-language: "The change is in, and your app behaves exactly as before — I
  re-ran your tests and they matched. If it hadn't matched, I'd have undone it."
- Technical: `checkpoint` exists for the step; the diff contains exactly the
  approved transform plus only legal import/path churn; the post-run pass-set is
  identical to the baseline; `advance --delta legal` recorded, OR after ≤3 heals
  the step blocked with the repo left GREEN at the last checkpoint. Emit
  `{ "step": "<id>", "result": "advanced|healed|blocked", "delta": "legal|drift" }`.

## Resources
- `references/method.md` — safe-transform catalog, smallest-change discipline, legal-vs-drift rule, harness commands.
- `examples/before-after.md` — worked example (a rename applied, verified identical, one self-heal shown).
- `scripts/checklist.mjs` — zero-dep Node script; prints this skill's step checklist as JSON.
- `templates/output.md` — the per-step transform log this skill fills in.

## Chain position
The executor of do-the-work. Fed a GREEN baseline by `refactor-safety-net` and an
approved step by the lane plan or by `refactor-reimagine` (opt-in). It drives the
harness loop `orchestrate.mjs checkpoint → apply → advance/fail`, and its verify
step is the same identical-pass-set check the chain's verify gate enforces. After
the lane's transforms, `refactor-code-principles` and the review gate run near the end.
