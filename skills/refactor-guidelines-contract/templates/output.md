# Contract Compliance Log — refactor-guidelines-contract

> One log per run. Every violation gets a flag entry; a clean run still files the summary.

## Run header

- **Run:** `<chain run id>`
- **Contract loaded at:** `<orchestrate.mjs init timestamp / step>`
- **Phases covered:** `<all phases the run executed>`

## Violation flags (one block per incident)

### Flag `<n>`

| Field | Value |
|---|---|
| Clause | `1 — no invented APIs / 2 — no silent scope creep / 3 — done means verified / 4 — smallest sufficient diff / 5 — uncertainty stated plainly` |
| Phase / step | `<where in the run it occurred>` |
| What happened | `<the offending call, claim, diff, or assertion — concretely>` |
| Cue that fired | `<the detection cue from references/method.md>` |
| Repair taken | `<undone / parked / claim withdrawn and re-verified / minimal diff substituted / re-checked and restated>` |
| Evidence after repair | `<grep hit file:line, test result, diff size, parked-note id>` |
| Resolved | `yes / no (a completion claim failing Clause 3 must NOT pass the review gate while unresolved)` |

## Parked notes (Clause 2 discipline — observed, not touched)

- `<improvement noticed>` — parked at `<state note>`; surfaced to the human: `yes/no`

## Human overrides (recorded, never assumed)

| Clause relaxed | What was approved | Who / when |
|---|---|---|
| `<e.g. 4>` | `<e.g. full-file rewrite of retry.ts>` | `<human, timestamp>` |

## End-of-run summary

- [ ] Every new API reference in the diff has a located definition (file:line or manifest entry)
- [ ] Diff touches only planned files; all extras parked as notes
- [ ] Every completion claim cites an executed check and its result
- [ ] No rewrite shipped without recorded human approval
- [ ] Every guess was labeled; unresolved violations: `<0 required to pass the gate>`

**Handoff:** unresolved Clause 3 items block the review gate; all recorded violations feed the
improvement retro (`refactor-improve`) as patterns.
