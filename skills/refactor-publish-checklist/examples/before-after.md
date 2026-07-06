# Worked example — NO-GO for one un-redone step, then GO after the fix

## Run 1 — the checklist comes back NO-GO

The web lane finished, but step `refactor-web-03-components` had drifted, was rolled back to its
checkpoint, and — because the session was interrupted — never redone. Someone asks "are we ready
to ship?"

```
$ node scripts/checklist.mjs --state /repo
{
  "skill": "refactor-publish-checklist",
  "verdict": "NO-GO",
  "checks": [
    { "id": "review-gate",       "label": "Review gate passed",              "pass": false, "note": "gate status=pending" },
    { "id": "baseline-green",     "label": "Baseline green, no un-redone drift","pass": false, "note": "baseline recorded; drift-un-redone=1" },
    { "id": "steps-complete",     "label": "All steps complete",              "pass": false, "note": "incomplete: refactor-web-03-components, refactor-review-gate" },
    { "id": "write-up",           "label": "Change write-up exists",          "pass": false, "note": "no Change Report artifact" },
    { "id": "artifacts-current",  "label": "Durable artifacts current",       "pass": true,  "note": "confirm via artifacts-sync record" },
    { "id": "conditional-data",   "label": "Data-guard resolved (if fired)",  "pass": true,  "note": "n/a (data-guard did not fire)", "skipped": true },
    { "id": "conditional-telemetry","label":"Telemetry plan resolved (if fired)","pass": true,"note": "n/a", "skipped": true },
    { "id": "conditional-security","label":"Security review resolved (if fired)","pass": true,"note": "n/a", "skipped": true },
    { "id": "no-stale-intent",    "label": "No stale intent",                 "pass": false, "note": "health=healing" }
  ],
  "blockers": [
    { "id": "steps-complete", "label": "All steps complete", "owner": "orchestrator", "why": "incomplete: refactor-web-03-components, refactor-review-gate" },
    { "id": "review-gate", "label": "Review gate passed", "owner": "refactor-review-gate", "why": "gate status=pending" },
    { "id": "write-up", "label": "Change write-up exists", "owner": "refactor-write-up", "why": "no Change Report artifact" }
  ]
}
```

### Plain-language verdict to the user
> ⛔ NO-GO — we can't ship yet. One step (`web-03-components`) was rolled back and never redone,
> so the review gate never ran and there's no change write-up. Here's the order to finish:
> 1. Re-do `web-03-components` (transform + verify) — owner: refactor-transform.
> 2. Run the review gate.
> 3. Generate the change write-up.
> Then I'll re-run this checklist.

## Run 2 — after the blockers are cleared

The step was redone (verify `legal`), the gate passed, the write-up was generated.

```
$ node scripts/checklist.mjs --state /repo
{
  "skill": "refactor-publish-checklist",
  "verdict": "GO",
  "checks": [ /* every applicable item pass:true; three conditionals skipped n/a */ ],
  "blockers": []
}
```

### Plain-language verdict
> ✅ GO — review gate passed, tests green against the baseline, all steps complete, the write-up
> exists, and no loose ends. Safe to hand to `refactor-ship`.

## Why this is a good checklist
- It refused to say "done" while a step was secretly unfinished — the whole point of the gate.
- The three conditional items correctly skipped (no data/telemetry/security guard fired) instead
  of producing false blockers.
- Every FAIL named its owning skill and the smallest next action, so clearing NO-GO was mechanical.
