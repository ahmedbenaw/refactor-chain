# refactor-publish-checklist — full method: the pre-ship go/no-go

This is the last gate. It creates no work; it confirms the claimed work is real. The output is a
single honest verdict — **GO** or **NO-GO** with exact blockers. Read-only.

## The fixed checklist (evidence per item)

| # | Check | PASS condition | Evidence source |
|---|---|---|---|
| 1 | Review gate passed | the `kind:"gate"` step is `status:"done"` | `state.json.steps[gate]` |
| 2 | Baseline green, no un-redone drift | `state.baseline` recorded AND no step has `verify.delta==="drift"` while not `done` | `state.baseline`, `state.steps[*].verify.delta` |
| 3 | All steps complete | no step in `pending/active/healing/blocked` | `state.steps[*].status` |
| 4 | Change write-up exists | a `refactor-write-up` Change Report is present | `.refactor-chain/change-report.md` / `docs/` / transcript artifact |
| 5 | Durable artifacts current | `refactor-artifacts-sync` ran; intended artifacts present & updated | artifacts-sync record + `--find` |
| 6a | Data-guard resolved *(conditional)* | if data-guard fired, its report shows no unresolved drift | `.refactor-chain/data-safety-report.md` |
| 6b | Telemetry plan resolved *(conditional)* | if telemetry fired, a tracking plan exists with no known-broken funnel unaddressed | `.refactor-chain/tracking-plan.md` |
| 6c | Security review resolved *(conditional)* | if security fired, no unresolved Blocker finding | `.refactor-chain/security-report.md` |
| 7 | No stale intent | no rolled-back-not-redone step, no open decision, no chain-left `TODO`; `state.health==="ok"` | `state.health`, step notes, grep for chain TODOs |

## Conditional inclusion logic
Items 6a–6c are **only evaluated if their guard fired** during this run. "Fired" is inferred from
the presence of the guard's artifact (`data-snapshot.json`, `tracking-plan.md`, `security-report.md`)
or a state flag. If a guard did not fire, its item is **skipped (n/a)** — it must NOT cause a
NO-GO. (Failing a run for a data-guard item when no data was touched would be a false blocker.)

## Verdict rule
```
GO      iff every APPLICABLE item PASSes.
NO-GO   if any applicable item FAILs.
```
There is no "GO with warnings." A real blocker is a NO-GO. A soft note (e.g. "artifacts current —
confirm manually") is surfaced but only fails the check if it's genuinely unmet.

## On NO-GO: route, don't fix
This skill never fixes a blocker. For each FAIL it names:
- the **blocker** (what's not satisfied),
- the **owning skill** (who fixes it),
- the **smallest next action**.

Examples:
- write-up missing → run `refactor-write-up`.
- a step drifted and was never redone → re-run that lane step under `refactor-transform` /
  `refactor-verify`.
- data-guard report shows unresolved drift → fix the migration, re-run the guard.

## Evaluating with the script
`node scripts/checklist.mjs --state <dir>` reads `state.json` + checks for report artifacts and
returns the verdict and per-check results. Treat its output as the machine draft; a human/skill
confirms the softer items (artifacts-current) that a file-existence check can't fully prove.

## Output
Fill `templates/output.md`: the ticked/unticked checklist, the verdict banner, and (on NO-GO) the
ordered blocker list with owners and next actions.
