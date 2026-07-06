# refactor-ship — full method: the deterministic, host-agnostic finish

This skill lands a verified refactor. It is deterministic (same run → same shape of commit/PR),
source-control-agnostic (plain `git`), and safe (never merges, never force-pushes, only ships on GO).

## Preconditions (hard)
1. `refactor-publish-checklist` returned **GO**. Re-verify with
   `node ~/.claude/skills/refactor-publish-checklist/scripts/checklist.mjs --state <target>` if unsure.
   NO-GO → stop, surface blockers, do not ship.
2. Working tree contains the finished refactor. `git status` should show the intended changes only.

## Sequence

### 1. Branch (never the default branch)
- `git rev-parse --abbrev-ref HEAD`. If it's `main`/`master`/`develop`, create a branch:
  `git switch -c <type>/<lane>-<slug>` where `<type>` = `fix` for the debug lane, else `refactor`.
- If already on a feature branch, use it.

### 2. Draft the messages
- `node scripts/draft-ship.mjs --target <target>` returns `{ branch, commit, prTitle, prBody }`,
  built from `state.json` (completed steps, self-heals, baseline, gate) + the change write-up +
  the audit trail.
- **Conventional commit** shape: `refactor(<lane>): <summary> (behavior preserved)` with a body of
  per-step bullets and a self-heal note. Debug lane uses `fix(...)`.
- Always append the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer (the user's global
  git convention requires a Claude co-author trailer).
- **Show the drafted commit + PR body to the user and allow edits before committing.**

### 3. Commit
- `git add -A`
- `git commit -m "<subject>" -m "<body...>"` (or a here-doc/file for the multi-line body).
- One clean commit for the refactor is preferred; if the run naturally has meaningful sub-commits
  from checkpoints, keep them coherent — but never leave WIP/checkpoint noise in history.

### 4. Push & open the PR/MR
- `git push -u origin <branch>` (plain push — never `--force`).
- Open the request host-agnostically:
  - GitHub CLI present → `gh pr create --title "<prTitle>" --body "<prBody>"`.
  - GitLab CLI present → `glab mr create --title "<prTitle>" --description "<prBody>"`.
  - Neither present → print `prTitle` + `prBody` and the compare URL (`git remote get-url origin`
    → construct the `/compare/<branch>` link) for the human to open in the web UI.
- PR body follows the user's convention: end with the generated-with trailer.

### 5. Let CI run
- Do NOT block waiting for CI. Report that the push triggered CI and where to watch it
  (the PR/MR checks tab, or `gh run watch` / `glab ci status` if the user wants to follow).

### 6. Hand off to the retro
- Invoke `refactor-improve` so the run's outcome is recorded to `history.jsonl` (the history prior).
  (The orchestrator's `reset` also appends the retro; `refactor-improve` adds the human-facing
  self-improvement note.)

## Guardrails baked in
- **GO-gated:** never ship a NO-GO run.
- **No merge, no force-push:** the human merges; history is never rewritten by this skill.
- **No default-branch commits:** always a branch.
- **Portable:** `git` is the contract; `gh`/`glab` are optional conveniences.
- **Human-in-the-loop on messages:** the commit/PR text is shown for edits before it's committed.

## Output
Fill `templates/output.md`: the final commit message and the PR/MR summary, plus the ship record
(branch, push status, PR/MR link or paste-ready body, CI location).
