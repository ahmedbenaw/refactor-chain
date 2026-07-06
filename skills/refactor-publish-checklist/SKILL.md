---
name: refactor-publish-checklist
description: "Use this skill as the final handoff verification right before a refactor is merged or shipped — it confirms every prerequisite is actually satisfied: the review gate passed, tests are green against the recorded baseline, the change write-up exists, the durable artifacts are current, any conditional guards (data, telemetry, security) that fired are resolved, and no stale intent or open decision remains. It produces a single go/no-go checklist so nothing ships half-done. Trigger phrases: \"are we ready to ship\", \"final check before merge\", \"did we finish everything\", \"run the publish checklist\", \"is the refactor actually done\", \"go/no-go\". This is the ship phase of the refactor-chain pipeline; it runs after the docs phase and immediately before refactor-ship. Read-only — it verifies and reports a verdict; it never edits code."
---

# Publish Checklist — refactor-chain · ship

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** ship · **Prerequisite:** review gate passed + docs phase done (write-up, artifacts-sync) · **Next:** refactor-ship.
**Adaptivity / conditional:** repo-agnostic. Read-only verification. It checks conditional items (data-guard, telemetry-plan, security) only if those guards fired during the run.

## Purpose
This is the last gate before a refactor leaves your hands. It doesn't do new work — it confirms
that the work already claimed to be done actually is. It walks a fixed checklist: the review gate
passed, the baseline is green, the write-up exists, the durable docs are current, every
conditional guard that fired has been resolved, and there's no stale intent (a rolled-back step
never redone, an open decision, a `TODO` the chain left behind). It ends with a single, honest
verdict — **GO** or **NO-GO** with the exact blockers — so nothing ships half-finished.

## When to use
- The docs phase is complete and you're about to hand off / open a PR / merge.
- Someone asks "are we ready to ship?", "did we finish everything?", "go/no-go?".
- The orchestrator reaches the ship phase and needs the pre-flight check before `refactor-ship`.
- Any time you want an honest "is this actually done?" audit of a run.

## What I'll tell you (plain-language / ADHD-friendly)
- "Before we ship, I'm running the final checklist — I'm only verifying, not changing anything."
- "6 of 7 checks pass. The one that doesn't: the change write-up hasn't been generated yet. That's a quick fix, then we're clear."
- "GO ✅ — review gate passed, tests green, docs current, no loose ends. Safe to ship."
- "NO-GO ⛔ — one step drifted and was rolled back but never redone. We can't ship an unfinished step. Here's exactly what's left."
- "Say 'show technical details' to see each check and where its evidence comes from."

## Method
1. **Load the run state.** Read `state.json` (steps + verify deltas + health), the review-gate
   result, and which conditional guards fired. Run `node scripts/checklist.mjs --state <target>`
   to evaluate the fixed checklist against real state.
2. **Run the fixed checks** (each PASS/FAIL with cited evidence):
   - **Review gate passed** — the `kind:"gate"` step is `done`.
   - **Baseline green** — a baseline was recorded and every step's `verify.delta` is `legal`/`clean`
     (no un-redone `drift`).
   - **All steps complete** — no step left `pending`, `active`, `healing`, or `blocked`.
   - **Write-up exists** — `refactor-write-up` produced a Change Report.
   - **Artifacts current** — `refactor-artifacts-sync` ran; intended artifacts present and updated.
   - **Conditional guards resolved** — for each guard that fired (data-guard / telemetry-plan /
     security), its report shows no unresolved blocker.
   - **No stale intent** — no rolled-back-but-not-redone step, no open decision, no leftover `TODO`
     from the chain.
3. **Compute the verdict.** All PASS → **GO**. Any FAIL → **NO-GO** with the ordered list of
   blockers and the smallest next action for each.
4. **Do not fix anything** — route each blocker back to the skill that owns it (e.g. missing
   write-up → run `refactor-write-up`).
5. Fill `templates/output.md` into the checklist + verdict. See `references/method.md` for the
   per-check evidence rules and how conditional items are included/skipped.

## Guardrails
- **Read-only. Verifies and reports a verdict; never edits code, docs, or state.**
- Honest verdict only: never return GO with an open blocker. A single real blocker = NO-GO.
- Conditional checks are included **only if** their guard actually fired — don't fail a run for a
  data-guard item when no data was touched.
- Every check must cite where its PASS/FAIL came from (state field, gate result, report). No vibes.

## Verify
- Plain: "Every box on the list is genuinely ticked, or I've told you exactly which ones aren't and what to do about each."
- Technical: each checklist item resolves to a concrete state/report source; the verdict is GO iff
  all applicable items PASS; every FAIL carries a blocker + owning skill + next action.

## Resources
- `references/method.md` — the fixed checklist, per-item evidence rules, and conditional inclusion logic.
- `examples/before-after.md` — worked example: a run that came back NO-GO for one un-redone step, then GO.
- `scripts/checklist.mjs` — prints the checklist as JSON and evaluates it against `state.json` (`--state`).
- `templates/output.md` — the go/no-go checklist scaffold.

## Chain position
Runs in the **ship** phase, after docs and immediately before `refactor-ship`. It reads the whole
run's state + the docs-phase outputs and gates the ship: `refactor-ship` should only commit/PR on
a **GO**. On NO-GO it names the blockers and hands each back to its owning skill.
