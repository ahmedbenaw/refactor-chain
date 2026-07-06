# Worked example — 5 runs of history → one self-improvement suggestion

## The history (`.refactor-chain/history.jsonl`, 5 web-lane runs)

```jsonl
{"lane":"web","case":"refactor-web","confidence":0.55,"clarified":true,"steps":[{"skill":"refactor-web-01-structure","attempts":1,"healed":false,"status":"done"},{"skill":"refactor-web-03-components","attempts":2,"healed":true,"status":"done"}],"outcome":"done","at":"2026-06-02T…"}
{"lane":"web","case":"refactor-web","confidence":0.58,"clarified":true,"steps":[{"skill":"refactor-web-03-components","attempts":2,"healed":true,"status":"done"}],"outcome":"done","at":"2026-06-11T…"}
{"lane":"web","case":"refactor-web","confidence":0.61,"clarified":false,"steps":[{"skill":"refactor-web-03-components","attempts":1,"healed":false,"status":"done"}],"outcome":"done","at":"2026-06-20T…"}
{"lane":"web","case":"refactor-web","confidence":0.66,"clarified":false,"steps":[{"skill":"refactor-web-03-components","attempts":2,"healed":true,"status":"done"}],"outcome":"done","at":"2026-06-27T…"}
{"lane":"web","case":"refactor-web","confidence":0.70,"clarified":false,"steps":[{"skill":"refactor-web-03-components","attempts":2,"healed":true,"status":"done"}],"outcome":"done","at":"2026-07-01T…"}
```

## Analysis

```
$ node scripts/checklist.mjs --history /repo
{
  "skill": "refactor-improve",
  "runs": 5,
  "troubleSteps": [
    { "skill": "refactor-web-03-components", "multiAttempt": 4, "seen": 5, "rate": 0.8 }
  ],
  "cleanLanes": [ { "lane": "web", "runs": 5 } ],
  "frictionLanes": [],
  "oneImprovement": {
    "kind": "pre-step-safety",
    "target": "refactor-web-03-components",
    "why": "needed >1 attempt in 4/5 runs",
    "suggestion": "Add a characterization test / checkpoint before refactor-web-03-components so it stops drifting here."
  }
}
```

## Patterns found (surfaced, not all acted on)
- **Trouble step:** `refactor-web-03-components` needed a second attempt in **4 of 5** runs (80%).
  That's a systemic drift point in this repo's component-tier split — not bad luck.
- **Clean lane:** the web lane is `done` in all 5 runs → the confidence prior has been climbing
  (0.55 → 0.70) and diagnosis stopped asking to clarify after run 2. Trust it more.

## The ONE improvement
> Add a characterization test that pins the rendered output of the components being re-tiered,
> and take a checkpoint, **before** `refactor-web-03-components` runs. That step drifts here 4 out
> of 5 times; pinning its behavior up front turns the recurring self-heal into a clean pass.

*(Deliberately not also suggesting: reordering the lane, extra logging, a naming-convention lint —
those are lower-leverage. Self-improvement is one step.)*

## Confidence prior picture
- Web lane: 5 confirmed `done` runs → `historyPrior` adds `+min(2,5)*0.5 = +1.0` to the web vote on
  the next run. Next diagnosis will classify this repo's web refactors with high confidence and
  won't ask to clarify. (This skill confirms the mechanism; it does not hand-edit the number.)

## Plain-language close
> The work shipped. Looking back at your last 5 refactors here, one step —
> splitting components into tiers — keeps needing a second try. My one suggestion: pin that step's
> behavior with a quick test before it runs next time, and it'll go clean. Everything else is in
> good shape; the web lane is now high-confidence for this repo. Want me to note that suggestion
> for next time?
