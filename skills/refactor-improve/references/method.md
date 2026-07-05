# refactor-improve — full method: the improvement retro & the confidence prior

Self-improvement = small, steady improvement. This skill closes each run by learning from this repo's own
history and proposing **one** thing to sharpen — no more. It reads; it never edits code.

## The history source
`<target>/.refactor-chain/history.jsonl` is append-only. The harness writes one retro line per run
on `orchestrate.mjs reset` (via `diagnose.mjs learn`). Each line:

```json
{
  "lane": "web",
  "case": "refactor-web",
  "mode": "ask",
  "confidence": 0.62,
  "clarified": true,
  "steps": [ { "skill": "refactor-web-03-components", "attempts": 2, "healed": true, "status": "done" }, ... ],
  "outcome": "done",
  "at": "ISO-8601"
}
```

Parse it with `node scripts/checklist.mjs --history <target>`.

## Make history complete first
If this run's retro isn't in the file yet (`reset` hasn't run), record it before analyzing —
otherwise the newest, most relevant data point is missing. The retro shape mirrors what
`orchestrate.mjs reset` builds.

## Pattern detection

| Pattern | Signal | Meaning |
|---|---|---|
| **Trouble step** | a step needs `attempts > 1` (or `healed`) in ≥2 runs and ≥50% of its appearances | this step reliably drifts here — pre-empt it |
| **Diagnosis friction** | a lane is `clarified:true` in ≥50% of its runs | the harness can't tell what this repo needs — add a signal |
| **Low-confidence lane** | recurring `confidence` below ~0.5 for a lane | classification is shaky — a repo cue would help |
| **Clean streak** | a lane has ≥3 runs all `outcome:"done"` | trust it more — the prior already nudges it up |
| **Recurring fail reason** | the same fail note across runs (from step notes) | a systemic cause worth naming |

## The one-improvement rule
Surfacing several patterns is fine. Recommending several changes is not. Rank candidates by
**leverage = how often it bites × how cheap the fix**, and propose the single top one. Typical shapes:
- **Pre-step safety:** "Add a characterization test / checkpoint before `<trouble step>`" — the most
  common and highest-leverage fix for a step that keeps drifting.
- **Diagnosis cue:** "Add a repo signal so the `<lane>` lane auto-detects without a clarify."
- **Plan tweak:** "The plan should checkpoint before `<step>`" / "run `<conditional guard>` earlier."

If there's no recurring pain point, say so — "the chain is running clean here" is a valid retro.
If there's only one run, say "not enough history for a pattern yet" rather than over-fitting.

## The confidence prior (already automatic — just confirm)
`diagnose.mjs historyPrior` reads `history.jsonl` on the *next* run and, for each lane with
confirmed `outcome:"done"` runs, nudges that lane's vote up (`+min(2,n)*0.5`). So recording clean
outcomes literally makes the next diagnosis more confident for this repo. This skill does **not**
hand-edit confidence — it confirms the mechanism will pick up the newly-recorded outcome and reports
the resulting picture (e.g. "web lane now has 5 clean runs → high prior").

## Optional: plugin refresh
If the one improvement is a change to the chain/config itself (not just a note for next time),
mention a `/update`-style plugin-refresh so the change is actually loaded — but only propose it;
the human approves and applies.

## Output
Fill `templates/output.md`: the patterns found, the single proposed improvement (with its
supporting count), and the updated per-repo confidence picture.
