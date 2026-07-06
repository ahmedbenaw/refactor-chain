---
name: refactor-orchestrate
description: "Use this skill when the user wants the whole refactor-chain method run for them automatically — trigger phrases include \"conduct this\", \"orchestrate the refactor\", \"run the full method\", \"assign the skills\", \"chain of skills\", \"multi-pass review until dry\", \"spec-kit this\". It is The Conductor: given any task it deterministically resolves the chain-of-skills (internal refactor-* plus external installed skills), maps the spec-kit (SDD) commands per phase, and runs the generalized multi-pass review loop (find → refute → fresh-eyes → completeness, until dry, at least 3 passes for a review-class target). It is both an always-on layer inside every run and a standalone command. Emit-as-data and async by construction: the engines stay synchronous and deterministic; the host fans the work out in parallel. Portable across Claude Code / Cowork / Codex."
---

# The Conductor — refactor-chain · orchestration (cross-lane, always-on + standalone)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** all (an always-on layer) or standalone · **Prerequisite:** none (works on any repo) · **Next:** dispatch the emitted plan, then route survivors through the safe pipeline.
**Adaptivity / conditional:** repo-agnostic; the chain adapts to the detected lane, phase, mode, and the host's installed-skill set.

## Purpose
Port the hand-run method — the multi-pass adversarial review, the write-spec / sprint-plan step, spec-kit command assignment per task, a chain-of-skills per task, and augmentation with skills from other installed plugins — into one native capability. Given a task, the Conductor **composes** the standard spine, the task's resolved skills, and its spec-kit commands, then **partitions** the work into what the host runs in parallel (independent review lenses, independent external-skill runs) versus sequentially (the ordered pipeline). Nothing is dispatched by the engine: it emits the plan as data, and the host fans it out — parallel Agent calls on Claude Code, sequential on Codex.

## When to use
- "Conduct this", "orchestrate the refactor", "run the full method", "assign every skill", "chain of skills per task".
- "Review it until nothing new turns up" / "multi-pass until dry" — the generalized review loop.
- "Spec-kit this" / a repo with a `.specify/` directory — the SDD command mapping.
- As the always-on layer, it annotates every phase of a normal `/refactor` run with its chain-of-skills.
- NOT a replacement for the lanes — it composes with `refactor-chain`, never bypasses it.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm conducting this: here's the chain of skills I'll use for each step, in plain order, and which ones run in parallel."
- "This is a review-class task, so I'll run at least three passes and keep going until a round turns up nothing new."
- "This is a one-line fix, so I'll take the fast path — a single verify-and-refute pass, not the full loop."
- "I found two external skills installed that fit this task; want me to run them (autopilot) or should I ask first (careful)?"
- "Here's the SPEC and sprint plan I shaped from the findings."

## Method
Resolve the scripts dir the way the chain does: `DIR="${CLAUDE_PLUGIN_ROOT:-$HOME/.claude/skills/refactor-chain}/scripts"`. The Conductor engines are `lib/conductor.mjs` (scheduler), `lib/skill-registry.mjs` (SPINE + catalog + open-set explore), `lib/spec-kit.mjs` (SDD adapter), and `lib/review-loop.mjs` (the multi-pass controller). All are synchronous, deterministic, zero-dep.

1. **Conduct.** `node "$DIR/orchestrate.mjs" conduct --target <dir>` (or `--task ID --phase P --caps a,b --lane L`). It emits `{ spine, chain, perTask:{rootCause, guards, reviewLens, boardLens, specKit, externalSkills}, dispatch:{parallel[], sequential[]}, fastPath }`. This is **read-only** — it never mutates `state.steps`.
2. **Dispatch.** Run `dispatch.parallel[]` concurrently (review lenses, independent external skills) and `dispatch.sequential[]` in order (the lane chain → gate). Parallel on Claude Code (one `Agent` call each, same message), sequential on Codex.
3. **Spec-kit.** `node "$DIR/orchestrate.mjs" spec-kit --target <dir> [--phases a,b] [--mode M]`. Emits the SDD command sequence with per-phase run markers (auto / confirm / ask-once). Auto-run is refused unless the `.specify` signal is present.
4. **Review loop.** For a review-class target: `review-loop-plan` → dispatch finders (board prompts) → `review-loop-record` (per-lens, concurrency-safe) → `review-loop-aggregate`. Repeat while `shouldContinue` is true (at least 3 rounds, then stop after two dry rounds or the budget ceiling). The final verdict is refused until the floor is met (`--force-final` overrides deliberately).
5. **Shape artifacts.** On loop completion the aggregate writes `SPEC.md` + `sprint-plan.md` from the ranked ledger and appends a run record to `history.jsonl`.
6. **Present & route.** Show the chain and the ranked ledger calmly; route survivors through the normal checkpoint → apply → verify → gate pipeline. Never auto-fix from a review.

See `references/method.md` for the distilled method, the mode-by-edge-case matrix, and the async dispatch contract.

## Guardrails
- **Composes, never bypasses.** The Conductor annotates and emits; the state machine, review board, guards, hooks, and gates all keep working unchanged. `conduct` is read-only w.r.t. `state.steps`.
- **At least 3 passes for a review-class target; fast path for trivial work.** A one-step lane (a debug fix, a tidy) takes a single verify-and-refute pass, not the loop.
- **Deterministic.** Same `(task, diagnosis, installedSkills, seed)` reproduces byte-identically; installed-skill order never changes the result.
- **Async is host-side only.** The engines are synchronous; all parallelism is the host dispatching the emitted `dispatch.parallel[]`.
- **Modes honored everywhere.** autopilot auto-runs; careful confirms at a checkpoint; ask asks once. Destructive-action checkpoints are never removed.

## Verify
- `node "$DIR/orchestrate.mjs" conduct --target <dir>` emits a plan with a non-empty `dispatch.parallel[]` and the lane chain ending at `refactor-review-gate`.
- `review-loop-status` shows rounds, dry-rounds, and whether the loop should continue (resume aid across compaction).
- Plain: "I assigned a chain of skills per step, ran the review until it went quiet, and shaped a SPEC and sprint plan from what it found."

## Resources
- `references/method.md` — the distilled method, mode-by-edge-case matrix, async dispatch contract.
- `examples/before-after.md` — a worked conduct + review-loop run.
- `scripts/checklist.mjs` — prints the Conductor protocol as JSON.
- `templates/output.md` — the Conductor plan + review-loop report scaffold.

## Chain position
The always-on layer at PLAN resolves each step's chain-of-skills, spec-kit commands, and external augmentation; the review gate generalizes to the review loop. Standalone, it runs on any task via `/refactor-orchestrate`. It reuses `lib/board.mjs` + `lib/panel-aggregate.mjs` (the review board) and `refactor-plan-gate`'s spec-kit signal; `refactor-adversarial-verify` is the mechanism behind each refutation.
