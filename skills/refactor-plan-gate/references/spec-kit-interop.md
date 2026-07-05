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

---
## Per-discipline behavior × mode (the full matrix)

Multi-mode (1+2+3), chosen per run at the checkpoint. Within a mode, each discipline-pack
skill binds to the spec as follows — designed so the spec adds rigor without ever weakening
the behavior-preservation baseline (which is always the hard floor).

| Discipline | Mode 1 — Integrate | Mode 2 — Co-author | Mode 3 — Adopt |
|---|---|---|---|
| **plan-gate** | Consumes `spec.md`/`plan.md` as the plan; no duplicate planning. `--plan-note` records the spec ref. | Seeds the plan from the spec but marks it amendable; records which spec sections are in play. | Runs the spec-kit flow (constitution→specify→plan→tasks) AS the plan phase. |
| **adversarial-verify** | Attacks the diff against the spec's acceptance criteria **in addition** to behavior. A criterion violation is a failed attack → no `--adversarial` pass → advance blocked. | Attacks **both directions**: "is the code wrong?" and "is the spec wrong/stale?" Either can win at the checkpoint. | Attacks each generated task's output against its own acceptance criteria. |
| **verify (baseline)** | Behavior baseline stays the hard floor; spec acceptance is an added verify dimension. | Same floor; spec acceptance is advisory-with-checkpoint (may amend spec instead of code). | Same floor; each task's acceptance criteria are the per-step verify target. |
| **scope-fence** | Fences each step to the active `tasks.md` item; edits outside it hard-flag drift. | Same fence, but "expand to a sibling task" is an offered checkpoint, not just a park. | The current `tasks.md` item defines the scope automatically. |
| **live-truth** | Verifies code against the **live repo**, never against the spec's claims — the spec says intended, the code says actual; conflicts surface, never silently trusted. | Same — and explicitly reconciles the two, flagging where spec ≠ reality. | Same — generated tasks are checked against live state before applying. |
| **memory** | Records notes against spec/task IDs, so recall is spec-addressable next run. | Records every spec-vs-code conflict and its resolution, so the pattern informs later runs. | Records the generated task graph + outcomes. |
| **ruthless-editor** | Trims the write-up; leaves spec artifacts authoritative. | Produces a spec-delta alongside the code-delta; both edited for concision. | Edits the generated spec artifacts for concision before they land. |
| **guidelines-contract** | Unchanged — the LLM-conduct contract applies identically in every mode. | Unchanged. | Unchanged. |

**Strictness (your standing choice: keep multi-mode, best-practice binding):** the spec is a hard
gate on *advancement* in Integrate mode (a violated acceptance criterion blocks the adversarial pass,
so `advance --delta legal --adversarial` cannot be claimed) and a checkpointed negotiation in
Co-author mode — but the **behavior-preservation baseline is the non-negotiable floor in all three
modes**. Nothing about spec-kit ever lets a behavior-changing diff through unverified.
