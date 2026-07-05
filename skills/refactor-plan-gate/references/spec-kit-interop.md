# spec-kit interoperability — the three modes

Detection: diagnose reports the `spec-kit` signal when a `.specify/` directory (or spec-kit artifacts) exists in the target. When detected, refactor-plan-gate PAUSES mid-chat with a decision checkpoint — the user chooses the mode per project, never silently. All three modes are available; the choice is by user request (autopilot takes the recommendation and says so out loud).

## Mode 1 — Integrate (spec is the source of truth)
- `refactor-plan-gate` consumes the existing `spec.md`/`plan.md` — no duplicate planning.
- `refactor-verify` + `refactor-adversarial-verify` check the diff against the spec's acceptance criteria in addition to the behavior baseline.
- `refactor-scope-fence` fences each step to the active `tasks.md` item.
- `refactor-memory` records notes against the spec's task IDs.
- `refactor-write-up`/`refactor-artifacts-sync` update the spec-kit artifacts when the work changes them.
- A spec-vs-code conflict resolves **in favor of the spec**: fix the code to match. If the spec looks wrong, that surfaces as a checkpoint but the default is code-conforms-to-spec.
- *Recommended default for existing spec-kit projects with mature, trusted specs.*

## Mode 2 — Co-author (spec and code evolve together)
- The spec seeds the plan like Mode 1, but the relationship is **bidirectional**: the spec is a living document, not a frozen contract.
- Every spec-vs-code conflict is a real decision checkpoint — **fix the code, amend the spec, or record a deliberate divergence** — not an automatic win for either side.
- `refactor-adversarial-verify` attacks BOTH directions: "is the code wrong?" and "is the spec wrong/stale?"
- `refactor-write-up` produces a spec-delta alongside the code-delta; `refactor-artifacts-sync` applies approved spec amendments back into `.specify/`.
- `refactor-memory` records which conflicts were resolved which way, so the pattern informs later runs.
- *Recommended when specs exist but are partially stale, or when the refactor legitimately changes intended behavior/contracts and the spec must move with it.*

## Mode 3 — Adopt (SDD becomes the plan phase)
- The chain's plan phase runs the spec-kit flow itself: constitution → specify → plan → tasks.
- Each `tasks.md` item maps 1:1 to a chain step, wrapped in the normal checkpoint → apply → verify loop.
- Spec artifacts are **outputs** the chain authors and updates.
- *Recommended when the refactor itself should be spec-driven end-to-end — architecture-scale work, reimagine-approved migrations, or a project with no usable spec yet.*

## The recommendation heuristic (shown at the checkpoint)
- Mature, trusted specs **and** a bounded refactor → recommend **Mode 1 (Integrate)**.
- Specs exist but are partially stale, **or** the work intentionally changes contracts → recommend **Mode 2 (Co-author)**.
- Specs absent/stale **or** the work is architecture-scale → recommend **Mode 3 (Adopt)**.
The user picks any of the three regardless of the recommendation; the choice is recorded in state and echoed in the write-up.
