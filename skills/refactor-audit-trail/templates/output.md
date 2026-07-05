# Audit Trail — <project name>

> Refactor-chain evidence log · lane `<lane>` · run <date> · chain integrity: <intact / BROKEN@seq>
> Baseline anchor: `<baseline commit / GENESIS>` · entries: <N> · sensitive events: <k>

## Chain of custody (chronological, hash-linked)

| seq | when (UTC) | step | what | checkpoint (rollback) | why | verify | sensitive |
|---:|---|---|---|---|---|---|:--:|
| 1 | <ts> | `<step>` | <op + files/symbols> | `<label>@<sha>` | <intent / "unstated"> | legal/clean/drift→healed | no |
| 2 | <ts> | `<step>` | <…> | `<label>@<sha>` | <…> | <…> | <yes/no> |

## Sensitive events (permission / auth / data touches)
- **seq <n>** — <what> — <moved vs changed>; behavior <preserved/changed>; corroboration: <verify + artifacts-sync note>.
- <or "none this run">

## Self-heal record (drift caught & corrected)
| seq | step | what drifted | rolled back to | re-done how | final verify |
|---:|---|---|---|---|---|
| <n> | `<step>` | <…> | `<checkpoint>` | <…> | legal |

## Machine log
- File: `<target>/.refactor-chain/audit-log.jsonl` (append-only, one entry per line).
- Hash rule: `sha256( canonical(entry-without-hash) + prevHash )`, genesis `prevHash = "GENESIS"`.
- Re-verify: `node scripts/checklist.mjs --chain <target>/.refactor-chain/audit-log.jsonl`.

## Integrity statement
- Entry count matches change events in `state.json`/git: <yes/no>.
- Every `checkpoint` SHA exists in `state.json.checkpoints`: <yes/no>.
- Hash chain recomputes intact top-to-bottom: <yes / BROKEN at seq N>.
