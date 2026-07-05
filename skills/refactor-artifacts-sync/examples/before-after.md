# Worked example — architecture.md synced after a folder re-layer

## Context
The web lane's `refactor-web-01-structure` step moved data-access code out of a flat `src/`
into a dedicated `src/services/` layer and split components into tiers. The `refactor-write-up`
Change Report and `git diff` recorded the moves. `architecture.md` still described the OLD flat
layout.

## Finder output

```
$ node scripts/checklist.mjs --find /repo
{
  "skill": "refactor-artifacts-sync",
  "artifacts": [
    { "artifact": "architecture.md", "present": true,  "path": "/repo/docs/architecture.md" },
    { "artifact": "flows.md",        "present": true,  "path": "/repo/docs/flows.md" },
    { "artifact": "permissions.md",  "present": false, "path": null },
    { "artifact": "tests-map.md",    "present": true,  "path": "/repo/docs/tests-map.md" }
  ],
  "missing": ["permissions.md"]
}
```

## architecture.md — the drifted section (BEFORE)

```markdown
## Structure
- `src/`
  - `components/`   — all Vue components
  - `api.ts`        — HTTP calls
  - `helpers.ts`    — shared utilities
  - `pages/`        — routed views

## Dependency direction
Components may import from `pages/` and `api.ts` directly.
```

## AFTER (only the drifted lines changed)

```markdown
## Structure
- `src/`
  - `components/`   — Vue components, tiered:
    - `common/` · `layout/` · `business/`
  - `services/`
    - `http/`       — HTTP client
    - `api/`        — typed API calls (was `src/api.ts`)
  - `utils/`        — shared utilities (was `src/helpers.ts`)
  - `modules/`      — feature modules (routed views live here)

## Dependency direction
`modules/ → components/`, `modules/ → services/`, `components/ → utils/` are allowed.
Components must NOT import from `modules/` (was: "may import from `pages/`").
```

Everything else in `architecture.md` — the "Why this layout" intro paragraph and the deployment
section — was already correct and was **left untouched**.

## Other artifacts this run
- `flows.md`: the "load dashboard" flow named `api.ts`; re-pointed to `services/api`. One label changed.
- `tests-map.md`: 3 test paths updated to their moved locations; nothing else.
- `permissions.md`: **missing**. The skill asked: "You don't have a `permissions.md` — create one
  from the template?" The user said skip (no auth changed this run), so it was not created.

## Verification
- Grepped every path in the updated docs against the tree → all resolve.
- No doc references `src/api.ts` or `src/helpers.ts` (the old paths) anymore.
- Changed artifacts recorded: `{architecture.md, flows.md, tests-map.md}` → handed to the publish checklist.
