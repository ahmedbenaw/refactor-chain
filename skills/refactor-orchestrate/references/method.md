# The Conductor — method reference

The distilled method (the hand-run pipeline that produced the v4.6.6 hardening wave), ported native.

## The distilled method

1. **Resolve the chain.** For a task, `skill-registry.resolve(task, installedSkills)` ranks internal `refactor-*` skills and external installed skills by capability overlap (total tie-break: score, then id). `skill-registry.explore(installedSkills)` is open-set: it reads each installed skill's own description and matches semantically, so a skill the catalog never enumerated can still be assigned.
2. **Compose, do not re-derive.** `conductor.conduct` composes the SPINE (a constant) + the registry's resolution + `spec-kit.mapPhase`, then partitions the result. It never re-implements the registry or spec-kit.
3. **Multi-pass until dry.** `review-loop.shouldContinue` keeps the loop going until the floor (at least 3 rounds for a review-class target), then stops after two dry rounds or the budget ceiling. A round is dry when it adds zero fresh, non-REFUTED findings not already in the cross-round seen ledger.
4. **Shape artifacts.** `review-loop.shapeArtifacts` turns the ranked ledger into a SPEC and a sprint plan (the write-spec / sprint-plan step).
5. **Scope mode.** `full` folds prior-deferred findings back into the ledger; `focused` keeps only the current set.

## Spec-kit (SDD) mapping

The 4 real `state.phase` values and the prose phases map to the 8 SDD commands:

| phase / token | SDD command(s) |
|---|---|
| baseline | `/constitution` |
| understand · diagnose | `/specify` |
| clarify · decision | `/clarify` |
| plan | `/plan` · `/tasks` |
| lane | `/implement` |
| gate · verify · review | `/analyze` |
| docs · ship | `/checklist` |

Auto-run is gated by mode AND the `.specify` signal: even in autopilot, a repo with no `.specify/` never auto-runs SDD commands (they downgrade to confirm).

## Modes by edge case

| | careful | autopilot | ask-once |
|---|---|---|---|
| spec-kit auto-run | confirm at checkpoint | auto-run, announce | ask once, then remember |
| external-skill run | propose + wait | auto-run approved work async | ask once |
| review loop | propose each added pass | loop until dry (floor per class) | ask depth once |
| standalone, no active chain | conduct on `--target`, emit, stop | same, no pause | same |
| out-of-scope diagnosis | conductor no-ops (shows redirect) | same | same |
| non-git repo | emit chain, flag "no safety net" | same | same |
| monorepo | one lane per package; parallel across packages | same | ask which package(s) once |

## Where the >=3 floor applies

Only to a **review-class** target: the appended review gate, a standalone `/refactor-orchestrate` review, an explicit "final version / audit" request, or a large diff. Trivial or single-step work (a one-line debug fix, a tidy) runs the fast path: `depthFor(target) <= 1`, one verify-and-refute pass, never three forced passes.

## Async dispatch contract

- The engines are synchronous and deterministic and stay that way. 100% of concurrency is host-side.
- `conduct` emits `{ dispatch: { parallel: [...], sequential: [...] } }`. The host runs `parallel[]` concurrently (independent review lenses `lens:<id>`, independent external skills) and `sequential[]` in order (true dependencies: the lane chain ending at the gate).
- Review-loop rounds record each lens to its own file (`.refactor-chain/board/round-N/<lens>.json`), one writer per file, so parallel background records never lose-update. `board.json` is written only at round start and after the record barrier.
- Resumption: loop state (`reviewLoop`: seen ledger, dry-rounds, ceiling) and per-lens files persist under `.refactor-chain/`, so a compaction or a killed Agent resumes from `review-loop-status`.
