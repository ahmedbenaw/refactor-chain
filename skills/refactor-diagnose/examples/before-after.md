# refactor-diagnose — worked example

## Before: a vague request against a mixed repo

Project Profile (from `refactor-understand`) says: root has **both** a `pom.xml`
(Java, `groupId=com.acme.billing`) **and** a `package.json` with a React admin UI
under `web/` → `manifestCount > 1` → **monorepo**.

The user says: *"this codebase is a mess, can you tidy it up?"*

## Classify (harness — single source of detection)

```
node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs classify \
  --target ./acme --utterance "this codebase is a mess, can you tidy it up?" --mode ask
```

Returns (abridged):
```json
{
  "case": "refactor-backend", "lane": "java",
  "os": "posix", "platform": "monorepo", "framework": "react",
  "monorepo": true, "confidence": 0.55, "inScope": true, "mode": "ask",
  "signals": ["maven groupId=com.acme.billing", "framework=react", "monorepo", "has-tests", "utterance:\"this codebase is a mess, can you tidy it up?\""],
  "alternatives": [{ "lane": "web", "score": 4 }],
  "clarify": {
    "question": "This looks like a monorepo (several projects in one folder). Want me to (A) start with the main project I found (restructure your Java back-end code), or (B) pick a specific package to work on first?",
    "optionA": { "lane": "java", "label": "restructure your Java back-end code" },
    "optionB": { "lane": "pick", "label": "let me choose which package" }
  },
  "redirect": null,
  "conditional": { "auth": true, "telemetry": false, "dags": false }
}
```

## Structured reasoning (sequential-thinking, baked in)

1. **Evidence:** Maven groupId, React framework, monorepo, tests present, an
   "it's a mess / tidy" refactor utterance.
2. **Candidates:** java (top) vs web (`alternatives`: score 4).
3. **Winner & why:** Maven votes java +3 and the refactor intent adds +2 to java —
   but two real projects coexist.
4. **What could make me wrong:** the user might mean the React admin UI, not the
   Java service. Monorepo caps confidence at 0.55 → genuinely ambiguous.
5. **Decision:** in-scope, `ask` mode, confidence 0.55 → do **not** guess. Ask the
   one monorepo clarify. Note `auth` conditional is armed for a later gate.

## After: what the skill says + the Diagnosis handoff

Plain-language to the user:
> "This is a monorepo — a Java service and a React admin UI share the folder, so
> I'm only ~55% sure which you mean. Want me to (A) start with the Java back-end,
> or (B) point me at a specific package? (Nothing's changed — this is just me
> figuring out the plan.) I also spotted auth code, so I'll add a security check
> before we ship."

Diagnosis recorded (handed to the plan phase once answered):
- **case:** `refactor-backend` (if A) — re-classify scoped if B.
- **mode:** ask · **confidence:** 0.55 · **platform:** monorepo · **os:** posix.
- **conditional armed:** auth → security gate later.

## Why this matters downstream
- No wrong lane gets chosen silently in a monorepo — the plan phase receives a
  lane the user actually confirmed.
- The armed `auth` conditional means the secure phase will run even though the user
  never mentioned security.
- After the run, `diagnose.mjs learn` records the confirmed lane so the next
  ambiguous request on this repo starts with a higher prior.
