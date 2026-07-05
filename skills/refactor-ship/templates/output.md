# Ship Record — <project name>

> Refactor-chain · ship phase · lane `<lane>` · run <date> · gated on publish-checklist: **GO**

## Branch
- `<type>/<lane>-<slug>` (off `<default branch>` — default branch untouched)

## Commit message (shown to user before committing)
```
<type>(<lane>): <summary> (behavior preserved)

Behavior-preserving refactor via refactor-chain. Every step re-ran the recorded
baseline and matched; review gate passed; publish checklist GO.

- <step>: <what>
- <step>: <what>

<self-heal note, or "No drift; all steps clean on first apply.">

Co-Authored-By: Claude <noreply@anthropic.com>
```

## PR / MR summary
**Title:** `<type>(<lane>): <summary> — behavior preserved`

**Body:**
```
## What & why
<one-paragraph from the change write-up>

## Changes
- <step>: <what>

## Safety
- Baseline recorded; every step verified against it.
- Review gate: passed.
- Self-healed: <list, or "none">.

## Docs
- Change write-up · durable artifacts synced · audit trail (hash-linked).

🤖 Generated with refactor-chain
```

## Ship status
- Push: `<pushed to origin/<branch> | printed for manual push>`
- PR/MR: `<link | paste-ready body printed (no host CLI)>`
- Merge: **not merged** (human decision) · Force-push: **never**
- CI: running — watch at `<PR checks tab / gh run watch / glab ci status>`

## Handoff
- `refactor-improve` invoked to record the run outcome (history prior).
