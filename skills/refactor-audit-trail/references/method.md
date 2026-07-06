# refactor-audit-trail — full method: chain of custody for a refactor

The write-up says *what happened, in plain English*. The audit trail *proves it, tamper-evidently*.
This is the forensic slice: an ordered, hash-linked log where each change is evidence.

## Sources of truth (never invent)
| Source | Gives |
|---|---|
| `<target>/.refactor-chain/state.json` | steps, `verify.delta`, self-heals (`retries`, notes), `checkpoints[]`, `lastEdit` |
| `git log --oneline <first-checkpoint>..HEAD`, `git diff` | commits, files, symbols changed |
| `refactor-artifacts-sync` permission-delta list | which permissions changed (sensitive flag) |

If a fact isn't in these, it doesn't go in the log — or goes in as `"why": "unstated"`.

## Entry schema
Each entry is one change event:

```json
{
  "seq": 7,
  "when": "2026-07-01T14:03:22Z",
  "step": "refactor-web-05-naming",
  "what": { "files": ["src/services/api/user.ts", "..."], "symbols": ["getUsr -> getUser"], "op": "rename" },
  "checkpoint": "pre-web-05@<git-stash-sha>",
  "why": "consistent API naming (S-naming rule)",
  "verify": "legal",            // legal | clean | drift->healed | unverified
  "sensitive": false,           // true if it touched permissions/auth/data
  "prevHash": "<hash of seq 6>",
  "hash": "<sha256(this entry without hash + prevHash)>"
}
```

Field meanings (the four forensic fields + corroboration):
- **what** — files + symbols + operation. Precise enough to reproduce the change.
- **when** — ISO-8601, copied verbatim from `state.json`/git (never paraphrased).
- **checkpoint** — the rollback point in effect (label + git-stash SHA from `state.json.checkpoints`).
- **why** — the step's recorded intent. `"unstated"` if none was recorded — never fabricated.
- **verify** — corroborating evidence that behavior held (or drifted and was healed).
- **sensitive** — reviewer jump flag for permission/auth/data touches.

## Hash-chain construction (tamper-evidence)
1. `canonical(entry)` = JSON of the entry with keys sorted, **excluding** `hash`.
2. `hash = sha256( canonical(entry) + prevHash )`.
3. Genesis entry's `prevHash = "GENESIS"` (or the baseline commit SHA if you want to anchor to it).
4. Each subsequent entry's `prevHash` = the previous entry's `hash`.

Because every hash folds in the previous hash, editing any past entry changes its hash, which
breaks `prevHash` of the next entry, cascading to the end. `checklist.mjs --chain <file>`
recomputes the whole chain and reports `brokenAt` if anyone tampered.

## Append-only discipline
- The log is **append-only**. To correct a mistake, append a new entry
  (`"op": "correction"`, referencing the `seq` it corrects) — never edit an existing entry.
- Editing an existing entry is exactly what the hash chain is designed to expose.

## Timeline reconstruction order
Merge and sort by timestamp:
- step `startedAt` → a "step-begin" marker (optional, low value; usually fold into first change)
- each `checkpoint.at` → a checkpoint entry (rollback point established)
- each edit (`lastEdit` history / git commit) → a change entry
- each `verify` result → attached to its change entry
- each self-heal (`retries` bump + rollback) → a "drift-detected + rolled-back + retried" entry sequence

## Output
- Human: fill `templates/output.md` (the readable table + a "sensitive events" section).
- Machine: append each entry as one line to `<target>/.refactor-chain/audit-log.jsonl` so the
  chain persists and can be re-verified later by `checklist.mjs --chain`.
