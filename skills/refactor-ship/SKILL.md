---
name: refactor-ship
description: "Use this skill as the deterministic finish of a refactor-chain run — commit the refactor with a clear conventional message, draft a PR summary from the change write-up and audit trail, push, and let CI run. It is source-control-agnostic: it uses plain git (works with GitHub, GitLab, or any remote) rather than any one host's API. It only ships on a GO from refactor-publish-checklist. Trigger phrases: \"commit and open a PR\", \"ship it\", \"push this refactor\", \"create the pull request\", \"finish and merge-request this\", \"wrap it up and send it\". This is the ship phase of the refactor-chain pipeline; it runs after refactor-publish-checklist returns GO. It performs git actions (commit/branch/push) — it does not edit product code, and it never merges or force-pushes on its own."
---

# Ship — refactor-chain · ship

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** ship · **Prerequisite:** refactor-publish-checklist returned **GO** · **Next:** refactor-improve (the retro).
**Adaptivity / conditional:** repo-agnostic and source-control-agnostic — native `git` only, so it works on GitHub, GitLab, Bitbucket, or a bare remote. Uses a host CLI (`gh`/`glab`) only if present; otherwise it prints the PR/MR body for the human to paste.

## Purpose
The refactor is done and verified; this skill lands it. Deterministically: it creates (or confirms)
a branch, commits the whole change with a clean conventional-commit message, drafts a
pull/merge-request summary from the change write-up + audit trail, pushes, and lets CI take over.
It stays source-control-agnostic by using plain `git` — no dependency on any single host's API —
and it refuses to run until the publish checklist says GO, so it never ships a half-finished run.

## When to use
- `refactor-publish-checklist` returned **GO** and the change is ready to leave your hands.
- Someone says "ship it", "commit and open a PR", "push this", "create the merge request".
- The orchestrator reaches the end of the ship phase with a clean go/no-go.
- Do NOT run on a NO-GO — clear the blockers first.

## What I'll tell you (plain-language / ADHD-friendly)
- "The checklist says GO, so I'll land this: make a branch, commit with a clear message, draft the PR summary, and push. I won't merge — that stays your call."
- "I'm putting the refactor on a branch called `refactor/web-lane-structure` so `main` stays untouched until you're ready."
- "Here's the commit message and the PR summary I drafted from the write-up — want any edits before I push?"
- "Pushed. CI is running now. I did NOT merge or force-push — the PR is open for review at the link above."
- "No GitHub/GitLab CLI here, so I've printed the PR summary for you to paste into the web UI."

## Method
1. **Guard on GO.** Confirm `refactor-publish-checklist` returned GO (re-run its
   `checklist.mjs --state <target>` if unsure). If NO-GO, stop and surface the blockers — do not ship.
2. **Branch.** If on the default branch (`main`/`master`), create a descriptive branch
   (`refactor/<lane>-<slug>`) so the default branch stays clean. Never commit the refactor directly
   to the default branch.
3. **Draft the messages.** Run `node scripts/draft-ship.mjs --target <target>` to generate a
   conventional-commit message and a PR/MR body from `state.json`, the change write-up, and the
   audit trail. Show them to the user for edits before committing.
4. **Commit.** `git add -A` then commit with the drafted message. Include the required
   `Co-Authored-By` trailer per the user's global git convention.
5. **Push & open the PR/MR.** Push the branch. If `gh`/`glab` is available, open the PR/MR with
   the drafted body; otherwise print the body and the compare URL for the human to open it.
6. **Let CI run.** Do not wait-block on CI; report that it's running and where to watch it.
7. **Hand off to the retro.** Trigger `refactor-improve` (self-improvement) to record the run's outcome.

## Guardrails
- **Ships only on GO.** Never commit/push a run the publish checklist rejected.
- **Never merges. Never force-pushes.** Opens the PR/MR for human review; the merge is the human's decision.
- Never commits the refactor directly to the default branch — always a branch.
- Uses plain `git` for portability; a host CLI is a convenience, never a requirement.
- Show the drafted commit + PR body before committing; let the user edit. Include the
  `Co-Authored-By: Claude ...` trailer the user's git convention requires.

## Verify
- Plain: "The refactor is committed on its own branch with a clear message, the PR/MR is open (or its text is ready to paste), CI is running, and nothing was merged or forced."
- Technical: `git log` shows one clean commit with the conventional message + co-author trailer on
  a non-default branch; the remote branch exists after push; the PR/MR body matches the write-up;
  no `--force`/merge happened; `refactor-improve` was invoked.

## Resources
- `references/method.md` — the deterministic ship sequence, conventional-commit rules, and the
  host-agnostic fallback (print-and-paste when no `gh`/`glab`).
- `examples/before-after.md` — worked example: a finished lane → branch, commit, drafted PR body, push.
- `scripts/draft-ship.mjs` — drafts the commit message + PR/MR body from run state (also prints the step checklist as JSON with `--checklist`).
- `templates/output.md` — the commit-message + PR/MR-summary scaffold.

## Chain position
Runs at the **end of the ship** phase, gated by `refactor-publish-checklist`'s GO. It consumes the
change write-up + audit trail to draft the PR, lands the branch, and hands off to `refactor-improve`
for the improvement retro that closes the run.
