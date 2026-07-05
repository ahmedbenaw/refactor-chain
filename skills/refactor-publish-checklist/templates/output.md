# Publish Checklist — <project name>

> Refactor-chain · ship phase · lane `<lane>` · run <date>
> Read-only pre-flight. Verdict below is GO only if every applicable item passes.

## Verdict: <✅ GO | ⛔ NO-GO>

## Checklist

| ✓/✗ | Check | Evidence | Owner (if failing) |
|:--:|---|---|---|
| <✓/✗> | Review gate passed | `<gate status>` | refactor-review-gate |
| <✓/✗> | Baseline green, no un-redone drift | `<baseline + drift count>` | refactor-verify |
| <✓/✗> | All steps complete | `<incomplete list / "all done">` | orchestrator |
| <✓/✗> | Change write-up exists | `<artifact path / missing>` | refactor-write-up |
| <✓/✗> | Durable artifacts current | `<artifacts-sync record>` | refactor-artifacts-sync |
| <✓/✗/n·a> | Data-guard resolved *(if fired)* | `<report / n·a>` | refactor-data-guard |
| <✓/✗/n·a> | Telemetry plan resolved *(if fired)* | `<plan / n·a>` | refactor-telemetry-plan |
| <✓/✗/n·a> | Security review resolved *(if fired)* | `<report / n·a>` | refactor-security |
| <✓/✗> | No stale intent | `<health + open decisions/TODOs>` | chain |

## Blockers (only on NO-GO — ordered, each with next action)
1. **<blocker>** — owner `<skill>` — next: <smallest action>
2. **<blocker>** — owner `<skill>` — next: <…>

## Notes
- Conditional items marked **n·a** did not fire this run and do not affect the verdict.
- On GO: hand to `refactor-ship`. On NO-GO: clear the blockers above and re-run this checklist.
