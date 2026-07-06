# Decision checkpoints — the mid-run question protocol

The pipeline asks the user multi-choice questions **in the chat thread, at the moment of the fork** — never batching decisions to the end, never deciding silently on the user's behalf. One decision at a time, plain words, a recommended option marked when one exists.

## Rendering
- In Claude surfaces, use the native multi-choice question UI.
- Everywhere else, render numbered text choices ("1 / 2 / 3 — reply with a number").
- Every checkpoint offers a plain-language explanation of what each option means and what happens next; "show technical details" expands it.

## The standing checkpoints

| # | Moment | Question shape |
|---|--------|----------------|
| 1 | Run start (ask-once) | Mode pick: careful / autopilot / ask-once |
| 2 | Diagnose, low confidence or monorepo | Lane clarify: ONE A/B question ("is this mostly a backend cleanup or a UI polish?") |
| 3 | Plan, `spec-kit` signal present | Integrate (Mode 1) / Co-author (Mode 2) / Adopt (Mode 3), with the case-based recommendation (see refactor-plan-gate) |
| 4 | Plan, principles selection | Recommended principle set for the detected stack + agnostic baseline: accept / mix-and-match / deliberate unusual combination (risks stated plainly) |
| 5 | Before any risky step | Confirm: proceed / skip this step / stop here (with what "risky" means in one sentence) |
| 6 | Review-gate findings | Per finding triage: fix now / defer (recorded) / accept (recorded with reason) |
| 7 | Scope-fence flag (⚑ drift) | Adjacent problem found: pursue as a NEW step / park it (noted in write-up) |
| 8 | Guidelines gate below 100% | Fix the gap now / record an explicit documented exception |
| 9 | Spec-vs-code conflict | Mode 1: fix code to match spec · Mode 2: fix code / amend spec / record divergence · Mode 3: spec is regenerated |
| 10 | Conductor proposes an external installed skill | Run it / skip it (careful asks; autopilot runs approved work and says so; ask-once asks once then remembers) |
| 11 | Review loop, another pass available | Continue the next pass / stop here (past the >=3 floor; autopilot loops until dry without asking) |

## Rules
- **Autopilot reduces frequency, never removes destructive-action checkpoints** (5, and any delete/rewrite/force operation always asks).
- Every answer is recorded in `state.json` notes and echoed in the write-up — decisions are auditable, never implicit.
- A checkpoint is a real question: give the user time; no defaults applied on silence except in autopilot, where the recommendation is taken **and said out loud**.
- Never more than one open question at a time (ADHD contract: one decision, then move).
