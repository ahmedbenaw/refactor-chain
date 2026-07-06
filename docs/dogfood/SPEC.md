# SPEC — refactor-chain — Conductor dogfood (reproduced v4.6.6 finding classes)

Decision: **fix-these-first** · blockers: 3 · total: 6

## Findings
| # | severity | where | cause | fix |
|---|---|---|---|---|
| 1 | blocker | scripts/ship-gate.mjs:31 | the done gate keyed on a phase string the harness never sets, so it approved prematurely | gate on the review-gate step status, not a phase string |
| 2 | blocker | scripts/lib/guidelines.mjs:1 | the mandatory 100% guidelines gate trusted a cached manifest and a bare-id exception array, so it was bypassable | always re-extract observed facts; require {id,reason,approvedAt} exception records |
| 3 | blocker | scripts/orchestrate.mjs:80 | scope-fence keyed on a scope field that was never populated, so it recorded but never fenced | path-segment + separator-normalized matcher on the step scope |
| 4 | worth-fixing | install.sh:171 | installing from a working clone copied a token-bearing .env into the target | exclude .env* and .git from the installer copy |
| 5 | worth-fixing | scripts/lib/panel-aggregate.mjs:44 | a string confidence collapsed to 0.5 and flipped decisions | normalize confidence/behaviorChanged from strings before aggregating |
