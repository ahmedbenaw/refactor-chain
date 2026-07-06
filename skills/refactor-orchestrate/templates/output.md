# Conductor plan — <task>

**Lane:** <lane> · **Mode:** <careful|autopilot|ask> · **Fast path:** <yes|no>

## Chain of skills (this task)
- **Root cause:** <root-cause skill>
- **Guards tripped:** <scope-fence, data-guard, …>
- **Spine:** understand → contracts → plan → baseline → do → verify → review → docs → ship
- **Task-specific:** <ordered internal + external skills>
- **Spec-kit:** <SDD command(s) for this phase>
- **Sign-off lens:** <review lens> · **Board dogfood lens:** <board lens>

## Dispatch
- **Parallel (independent):** <lens:…, external skills>
- **Sequential (dependent):** <lane chain → refactor-review-gate>

## Review loop (review-class only)
- Round 1 … N — until dry (at least 3 rounds), then stop after two dry rounds or the budget ceiling.
- **Decision:** <go | fix-these-first | no-go> · blockers: <n> · total: <n>

## Artifacts
- `SPEC.md` — goal, acceptance, ranked findings.
- `sprint-plan.md` — ordered remediation tasks.
- `history.jsonl` — the run record (rounds, dry-rounds, decision).

## Plain-language summary
<one calm paragraph: what will and will not change, what ran in parallel, what the loop found>
