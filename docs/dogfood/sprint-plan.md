# Sprint plan — refactor-chain — Conductor dogfood (reproduced v4.6.6 finding classes)

| # | where | issue | fix | severity |
|---|---|---|---|---|
| S1 | scripts/ship-gate.mjs:31 | the done gate keyed on a phase string the harness never sets, so it approved prematurely | gate on the review-gate step status, not a phase string | blocker |
| S2 | scripts/lib/guidelines.mjs:1 | the mandatory 100% guidelines gate trusted a cached manifest and a bare-id exception array, so it was bypassable | always re-extract observed facts; require {id,reason,approvedAt} exception records | blocker |
| S3 | scripts/orchestrate.mjs:80 | scope-fence keyed on a scope field that was never populated, so it recorded but never fenced | path-segment + separator-normalized matcher on the step scope | blocker |
| S4 | install.sh:171 | installing from a working clone copied a token-bearing .env into the target | exclude .env* and .git from the installer copy | worth-fixing |
| S5 | scripts/lib/panel-aggregate.mjs:44 | a string confidence collapsed to 0.5 and flipped decisions | normalize confidence/behaviorChanged from strings before aggregating | worth-fixing |
