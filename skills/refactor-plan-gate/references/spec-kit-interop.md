# spec-kit interoperability — the two modes

Detection: diagnose reports the `spec-kit` signal when a `.specify/` directory (or spec-kit artifacts) exists in the target. When detected, refactor-plan-gate PAUSES mid-chat with a decision checkpoint: the user chooses the mode per project — never silently.

## Mode 1 — Integrate (spec as source of truth)
- `refactor-plan-gate` consumes the existing `spec.md`/`plan.md` — no duplicate planning.
- `refactor-verify` + `refactor-adversarial-verify` check the diff against the spec's acceptance criteria in addition to the behavior baseline.
- `refactor-scope-fence` fences each step to the active `tasks.md` item.
- `refactor-write-up`/`refactor-artifacts-sync` update the spec-kit artifacts when the work changes them.
- A spec-vs-code conflict surfaces as its own checkpoint: **fix the code to match the spec, or amend the spec** — the user decides, the choice is recorded.
- *Recommended default for existing spec-kit projects with mature specs.*

## Mode 3 — Adopt (SDD becomes the plan phase)
- The chain's plan phase runs the spec-kit flow itself: constitution → specify → plan → tasks.
- Each `tasks.md` item maps 1:1 to a chain step, wrapped in the normal checkpoint → apply → verify loop.
- *Recommended when the refactor itself should be spec-driven end-to-end — architecture-scale work, reimagine-approved migrations.*

## The recommendation heuristic (shown at the checkpoint)
- Specs exist **and** the task is a bounded refactor → recommend **Mode 1**.
- Specs absent/stale **or** the work is architecture-scale → recommend **Mode 3**.
The user can always override; autopilot takes the recommendation and says so out loud.
