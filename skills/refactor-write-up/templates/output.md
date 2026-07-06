# Change Report — <project name>

> Refactor-chain run · lane `<lane>` · <date> · behavior preserved: <yes / partially / see notes>

---

## What changed (plain English)

<One-sentence lead: what you did and the promise that the app behaves the same.>

**What changed:**
- <plain bullet — no jargon>
- <plain bullet>
- <plain bullet>

**What a user would notice:** <usually "nothing — that's the goal of a refactor">.

**What's safer / cleaner now:** <plain sentence>.

**What I checked:** <baseline + "green after every step"; be honest about any self-heal or open decision>.

*(show technical details below)*

---

## Technical appendix

### Before → after
| Aspect | Before (from Project Profile) | After |
|---|---|---|
| Structure | <…> | <…> |
| Layering | <…> | <…> |
| Naming | <…> | <…> |
| Tests | <…> | <…> |

### Per-step summary
| Step | What it did | Files touched | Verify delta |
|---|---|---|---|
| `<step>` | <…> | <n moved/renamed/edited> | legal / clean / drift→healed |

### Moves & renames
- `<old path>` → `<new path>`

### Checkpoints (rollback points)
- `<label>` — `git stash apply <sha>`

### Behavior-preservation evidence
- Baseline: `<framework>` `<N passing>`.
- Every completed step reproduced the identical pass-set (`verify.delta`: <…>).
- Not-fully-verified steps (if any): <list / "none">.

---

*Feeds:* `refactor-artifacts-sync` (durable docs), `refactor-audit-trail` (evidence log),
`refactor-publish-checklist` / `refactor-ship` (handoff).
