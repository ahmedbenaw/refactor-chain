# Worked example — raw run state → a hash-linked audit log

## Context
A short web-lane run touched a permission guard and renamed a function. The reviewer is in a
regulated context and needs defensible evidence, not a summary.

## Raw sources (excerpt)

`state.json` (trimmed):
```json
{
  "checkpoints": [
    { "label": "pre-web-04-layout", "sha": "a1b2c3d", "at": "2026-07-01T13:58:10Z", "step": 3 },
    { "label": "pre-web-05-naming",  "sha": "e4f5a6b", "at": "2026-07-01T14:02:41Z", "step": 4 }
  ],
  "steps": [
    { "skill": "refactor-web-04-layout", "verify": { "delta": "clean" }, "retries": 0 },
    { "skill": "refactor-web-05-naming", "verify": { "delta": "legal" }, "retries": 0 }
  ]
}
```

`refactor-artifacts-sync` permission-delta list: `RouteGuard for /admin moved to src/guards/admin.ts` (moved, not changed).

`git log`:
```
e4f5a6b pre-web-05-naming checkpoint
9c8d7e6 rename getUsr -> getUser across services
```

## Reconstructed audit log (human view)

| seq | when (UTC) | step | what | checkpoint | why | verify | sensitive |
|---|---|---|---|---|---|---|---|
| 1 | 13:58:10 | web-04-layout | checkpoint established | `pre-web-04-layout@a1b2c3d` | rollback point before layout extraction | — | no |
| 2 | 13:59:04 | web-04-layout | extract shared layout shells (3 files) | `pre-web-04-layout@a1b2c3d` | dedupe repeated page chrome | clean | no |
| 3 | 14:01:20 | web-04-layout | move `RouteGuard` → `src/guards/admin.ts` | `pre-web-04-layout@a1b2c3d` | co-locate guards (relocated, behavior identical) | clean | **yes (permission touch)** |
| 4 | 14:02:41 | web-05-naming | checkpoint established | `pre-web-05-naming@e4f5a6b` | rollback point before rename | — | no |
| 5 | 14:03:22 | web-05-naming | rename `getUsr` → `getUser` (4 files) | `pre-web-05-naming@e4f5a6b` | consistent API naming | legal | no |

### Sensitive events (reviewer jump)
- **seq 3** — a permission guard was relocated. Confirmed **moved, not changed**: the `/admin`
  route still requires the `admin` role; only the file path changed. Corroborated by verify `clean`
  and the artifacts-sync note. No access-control behavior changed.

## Machine form (`.refactor-chain/audit-log.jsonl`, hashes abbreviated)

```jsonl
{"seq":1,"when":"2026-07-01T13:58:10Z","step":"refactor-web-04-layout","what":{"op":"checkpoint"},"checkpoint":"pre-web-04-layout@a1b2c3d","why":"rollback point","verify":null,"sensitive":false,"prevHash":"GENESIS","hash":"11aa…"}
{"seq":2,"when":"2026-07-01T13:59:04Z","step":"refactor-web-04-layout","what":{"op":"extract","files":["…"]},"checkpoint":"pre-web-04-layout@a1b2c3d","why":"dedupe page chrome","verify":"clean","sensitive":false,"prevHash":"11aa…","hash":"22bb…"}
{"seq":3,"when":"2026-07-01T14:01:20Z","step":"refactor-web-04-layout","what":{"op":"move","symbols":["RouteGuard"]},"checkpoint":"pre-web-04-layout@a1b2c3d","why":"co-locate guards","verify":"clean","sensitive":true,"prevHash":"22bb…","hash":"33cc…"}
{"seq":4,"when":"2026-07-01T14:02:41Z","step":"refactor-web-05-naming","what":{"op":"checkpoint"},"checkpoint":"pre-web-05-naming@e4f5a6b","why":"rollback point","verify":null,"sensitive":false,"prevHash":"33cc…","hash":"44dd…"}
{"seq":5,"when":"2026-07-01T14:03:22Z","step":"refactor-web-05-naming","what":{"op":"rename","symbols":["getUsr -> getUser"],"files":["…x4"]},"checkpoint":"pre-web-05-naming@e4f5a6b","why":"consistent API naming","verify":"legal","sensitive":false,"prevHash":"44dd…","hash":"55ee…"}
```

## Tamper check
```
$ node scripts/checklist.mjs --chain /repo/.refactor-chain/audit-log.jsonl
{ "skill": "refactor-audit-trail", "ok": true, "entries": 5, "brokenAt": null, "chain": [ … ] }
```
If someone later edited seq 3's `why`, the recompute would report `"ok": false, "brokenAt": 2`
(zero-indexed) — the evidence would show it had been altered.
