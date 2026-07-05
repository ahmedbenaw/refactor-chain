# refactor-memory — full method: the per-project memory discipline

## Where memory lives
`<project>/.refactor-chain/memory/sessions.jsonl` — append-only, one JSON note per session,
written by the SessionEnd hook `~/.claude/skills/refactor-chain/scripts/memory-capture.mjs`.
Recall is done by the SessionStart hook `boot.mjs`, which reads only the **last** line and injects
a one-line plain-language summary into the new session's context.

Both hooks are deliberately boring and safe:
- **Dormant unless relevant.** No `state.json` and no `history.jsonl` → no capture, no banner.
- **Never fatal.** Both wrap everything in try/catch and exit 0; a broken memory file is skipped
  silently rather than breaking session start or end.

## The note schema (what capture actually writes)
```json
{
  "at": "ISO-8601",
  "activeRun": { "lane": "web", "phase": "do-the-work", "step": "3/7", "health": "ok" },
  "flagged": ["scope: sidebar rewrite parked — out of lane"],
  "lastRun": { "lane": "web", "outcome": "done", "at": "ISO-8601" }
}
```
- `activeRun` — present only when a chain is mid-flight (from `state.json`).
- `flagged` — up to 3 scope-drift notes harvested from step notes.
- `lastRun` — present only when there is no active run (from the last `history.jsonl` line).
- If none of the three exist, **nothing is written** — an empty session leaves no residue.

## The persistence filter
Ask of any candidate fact: *will this matter to a future session, and is it safe to write down?*

| Persist | Never persist |
|---|---|
| durable decisions ("kept the legacy adapter — X depends on it") | conversation transcripts, chat excerpts |
| parked items / scope-drift flags | secrets, tokens, credentials, keys |
| run outcomes and active-run position | personal data of any kind |
| recurring environmental facts the chain tripped on | transient debugging chatter, one-off errors |

The hook enforces the shape; the skill enforces the judgment. If a note only makes sense with the
transcript open, it fails the filter.

## Recall: the live-truth rule
Memory answers "what did we think last time?" — never "what is true now?". Before acting on any
recalled fact:

1. **Paused run remembered** → read `.refactor-chain/state.json`. It is the authority on phase,
   cursor, and step list. If it is gone or disagrees, the memory is stale; say so and follow state.
2. **Outcome remembered** → read the last `history.jsonl` line. Cite that, not the memory.
3. **Parked item remembered** → check the referenced code. It may have been fixed, deleted, or
   rewritten since; a parked item that no longer exists is closed, not re-raised.

The boot banner itself says "(verify against the live repo before relying on it)" — that clause is
the contract. The repo now outranks the note then, every time. This is the same discipline the
`live-state-truth` skill applies to any remembered claim: recall proposes, the live system decides.

## Inspection and pruning
- `node scripts/checklist.mjs --recall <target>` → note count + latest note, as JSON, for showing
  the human exactly what is remembered.
- The hook only appends. Pruning is a human act: truncate old lines or delete `sessions.jsonl`
  entirely — the chain degrades gracefully to a fresh start. Offer pruning when notes are stale,
  when the project changed hands, or on request ("forget this project").
- Never edit individual lines in place; if a note is wrong, the fix is a live-repo verification in
  the session (and, if needed, deletion), not historical revisionism.

## Failure modes to name plainly
- **Stale resume:** memory says "paused at step 3/7", state file says the run was reset. Trust state.
- **Ghost parked item:** flagged code no longer exists. Close it with one line of evidence.
- **Unreadable memory:** boot skips it silently by design; mention it only if the human asks why
  there was no banner.
