---
name: refactor-plan-gate
description: "Use this skill before ANY multi-edit work begins — it requires a short written mini-plan (goal, unknowns, success criteria, step order) and records it into chain state before the baseline is allowed to run. The refactor-chain plan phase consumes this plan; without it, `orchestrate.mjs baseline` must not be called. Trigger phrases include \"let's just start editing\", \"refactor this\", \"make these changes\", the orchestrator entering the plan phase after `init`, or any task that will touch more than one file or make more than one edit. Conditional interop — when diagnose reports the `spec-kit` signal (a `.specify/` directory exists), this skill pauses mid-chat for a decision checkpoint asking the user to choose Mode 1 (Integrate), Mode 2 (Co-author), or Mode 3 (Adopt). Phase: plan."
---

# Plan Gate — think on paper before touching code — refactor-chain · plan

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** plan — runs after `orchestrate.mjs init` builds the step list, before `baseline` may run · **Prerequisite:** an initialized chain (`init` succeeded, `state.json` exists) · **Next:** `refactor-safety-net` (baseline).
**Adaptivity / conditional:** repo-agnostic; the spec-kit interop branch activates only when diagnose reports the `spec-kit` signal (`.specify/` directory detected).

## Purpose
No multi-edit work starts on impulse. This skill forces one cheap artifact into
existence first: a mini-plan of four parts — the **goal** in one sentence, the
**unknowns** that could sink the work, the **success criteria** that will prove it
worked, and the **step order** mapped onto the chain's step list. The plan is recorded
into chain state as a note, and until it is recorded, the baseline phase stays locked.
Five minutes of writing routinely saves an hour of undoing.

## When to use
- Every time a chain is initialized and the work will involve more than one edit or
  more than one file — which is to say, essentially always.
- The person says: "just start refactoring", "go ahead and make the changes", "clean
  this up", "let's dive in" — the more eager the phrasing, the more this gate matters.
- The orchestrator sits in phase `baseline` right after `init` (state exists, no plan
  note recorded yet).
- Diagnose reported `spec-kit` among its signals — the decision checkpoint below is
  mandatory before anything else.

## What I'll tell you (plain-language / ADHD-friendly)
- "Before I edit anything, I'm writing a five-line plan: what we're doing, what I'm unsure about, how we'll know it worked, and in what order. Takes a minute, saves an hour."
- "Plan's written and saved into the chain's memory. Nothing is locked in — if we learn something mid-way, the plan bends, the code doesn't break."
- "One unknown worries me: I don't know if anything else imports this module. I'll check that first instead of guessing."
- "I found a `.specify/` folder — you already have specs for this project. Quick decision, one question: should I work *inside* your existing spec (Mode 1) or run the full spec-driven flow as our plan (Mode 3)? I'll recommend one."
- "Plan recorded — the safety-net baseline is now unlocked. You are here: plan done, 0 of N steps run."

## Method
1. **Confirm the chain is initialized.** Run `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs status --target <dir>`.
   If `active: false`, run `init` first — a plan needs the step list it will order.
2. **Write the mini-plan** using `templates/output.md` (four sections, each brutally
   short): Goal (one sentence), Unknowns (what could invalidate the approach — each
   with how it will be resolved), Success criteria (observable, checkable statements),
   Step order (the chain's step list from `state.steps`, with anything to front-load
   or watch called out per step).
3. **Spec-kit checkpoint (conditional).** If the diagnosis (`state.diagnosis.signals`
   or `orchestrate.mjs detect`) includes `spec-kit`, STOP and ask the user mid-chat to
   choose, with a recommendation:
   - **Mode 1 — Integrate:** the existing `spec.md`/`plan.md` ARE the plan; verify
     additionally checks the spec's acceptance criteria; scope fences to the active
     `tasks.md` item; artifacts are updated after the work.
   - **Mode 3 — Adopt:** the spec-driven flow becomes the chain's plan phase; tasks
     map 1:1 onto chain steps.
   - **Heuristic to recommend:** mature, current specs + a bounded refactor → Mode 1.
     Absent or stale specs, or architecture-scale work → Mode 3.
   Record the choice in the plan and in the state note.
4. **Record the plan into state.** The harness has no `plan` subcommand, so the plan
   lands as a note on the first step:
   `orchestrate.mjs advance` is NOT used here — instead write the plan file to
   `<target>/.refactor-chain/plan.md` and append a marker note via the first step's
   `notes` (see `references/method.md` for the exact recording contract). The gate is:
   **no `plan.md` on disk → do not call `baseline`.**
5. **Unlock the baseline.** Only after the plan exists, hand off to
   `refactor-safety-net` to record the green baseline (`orchestrate.mjs baseline …`).

The full four-part plan rubric, the spec-kit decision table, and the recording
contract are in `references/method.md`.

The mini-plan is drafted using the shared reasoning protocol (`refactor-chain/references/reasoning-protocol.md`) — numbered steps, revisable, unknowns explicit.

## Guardrails
- **Advisory-plus-blocking:** this skill edits no code (nothing to preserve), but it
  DOES block — `baseline` must not run before the plan is recorded.
- A plan is a direction, not a contract. When reality contradicts it, update the plan
  note; never force the code to match a stale plan.
- Unknowns must come with a resolution path ("check X first"), not just be listed.
- Success criteria must be checkable ("the baseline pass-set is identical"), never
  vibes ("code is cleaner").
- The spec-kit checkpoint is a real question to the user, not a silent default. Give
  the recommendation, wait for the answer.

## Verify
- Plain: "There's a written plan with a goal, the open questions, what 'done' looks like, and the step order — and it's saved where the chain can see it."
- Technical: `<target>/.refactor-chain/plan.md` exists and has all four sections
  non-empty; `state.json` carries the plan marker note; if `spec-kit` was signalled,
  the plan records the chosen mode (1 or 3); `baseline` was called only after all that.

## Resources
- `references/method.md` — full rubric, spec-kit modes + heuristic, recording contract.
- `references/spec-kit-interop.md` — the two interop modes (Integrate / Adopt) in full, with the checkpoint heuristic.
- `examples/before-after.md` — a dive-in disaster vs. the same task planned first.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the mini-plan scaffold the skill fills in.

## Chain position
Runs in the **plan** phase: after `refactor-diagnose`/`init` produce the lane and step
list, before `refactor-safety-net` records the baseline. It is fed by the diagnosis
(lane, signals — including `spec-kit`) and it feeds every later phase: verify reads
its success criteria, `refactor-scope-fence` reads its step scopes, and
`refactor-write-up` quotes it to show what was intended vs. what happened.
`refactor-code-principles` + the review gate still run at the end of every lane.
