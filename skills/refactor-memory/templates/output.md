# Project Memory Audit — <project name>

> Refactor-chain · memory (improve/understand) · <date>
> Memory proposes; the live repo decides. Every claim below was verified before being stated.

## Memory file
- Path: `<project>/.refactor-chain/memory/sessions.jsonl`
- Notes: `<N>` · oldest: `<date>` · newest: `<date>`
- Hook status: capture <active/dormant — why> · recall banner shown this session: <yes/no>

## Latest note, verified
| Remembered claim | Live check performed | Verdict |
|---|---|---|
| <e.g. "paused run: web lane, step 3/7"> | read `.refactor-chain/state.json` | <confirmed / stale — state says …> |
| <e.g. "last run: done"> | last line of `history.jsonl` | <confirmed / differs> |
| <e.g. parked item "…"> | checked `<path>` / `git log` | <still real / already resolved — closed> |

## Persistence-filter review
- Durable-only: <yes / violations found> · Secrets/transcripts/personal data: <none found / FLAG>
- Notes that no longer earn their place: <list, or "none">

## Actions
- Stale notes closed with evidence: <list, or "none">
- Pruning: <not needed / offered / performed by human — what was removed>
- Items carried forward into this session: <list, or "none">

## For next session
<one line on what SessionEnd capture is expected to write when this session closes>
