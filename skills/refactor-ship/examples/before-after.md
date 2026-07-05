# Worked example — a finished lane → branch, commit, drafted PR, push

## Context
The web lane finished and `refactor-publish-checklist` returned **GO**. The user says "ship it."
Current branch is `main`.

## 1. GO guard
```
$ node ~/.claude/skills/refactor-publish-checklist/scripts/checklist.mjs --state /repo
{ "verdict": "GO", "blockers": [] }
```
Clear to ship.

## 2. Branch (off main)
```
$ git switch -c refactor/web-refactor-web
Switched to a new branch 'refactor/web-refactor-web'
```

## 3. Draft
```
$ node scripts/draft-ship.mjs --target /repo
{
  "branch": "refactor/web-refactor-web",
  "commit": "refactor(web): web lane cleanup (behavior preserved)\n\nBehavior-preserving refactor via refactor-chain. Every step re-ran the recorded\nbaseline and matched; review gate passed; publish checklist GO.\n\n- web-01-structure: standardized src/ layout, added services/ layer\n- web-02-modules: grouped feature code under modules/\n- web-03-components: split common/layout/business tiers\n- web-04-layout: extracted shared layout shells\n- web-05-naming: use- prefix on composables, consistent names\n- code-principles: one-responsibility tidy on 3 modules\n\nSelf-healed steps (drift caught & re-done): refactor-web-03-components, refactor-web-05-naming.\n\nCo-Authored-By: Claude <noreply@anthropic.com>",
  "prTitle": "refactor(web): web lane cleanup — behavior preserved",
  "prBody": "## What & why\nBehavior-preserving refactor produced by the refactor-chain pipeline...\n## Changes\n- ...\n## Safety\n- Baseline: recorded; every step verified against it.\n- Review gate: passed.\n..."
}
```
The drafted commit + PR body are shown to the user, who approves them unchanged.

## 4. Commit
```
$ git add -A
$ git commit -F <(drafted commit message)
[refactor/web-refactor-web 9f1c2ab] refactor(web): web lane cleanup (behavior preserved)
 41 files changed, 512 insertions(+), 498 deletions(-)
```

## 5. Push & open the PR (GitHub CLI present)
```
$ git push -u origin refactor/web-refactor-web
$ gh pr create --title "refactor(web): web lane cleanup — behavior preserved" --body-file <(drafted PR body)
https://github.com/acme/app/pull/482
```
(No `gh`? The skill instead prints the PR body and the compare URL
`https://github.com/acme/app/compare/refactor/web-refactor-web` for the user to paste.)

## 6. CI
> Pushed and opened PR #482. CI is running now — watch it on the PR's Checks tab (or `gh run watch`).
> I did NOT merge and did NOT force-push; the merge is your call.

## 7. Handoff
`refactor-improve` is invoked to record the run outcome (2 self-heals on the web lane) to
`history.jsonl` for the history prior.

## Why this is a good ship
- Gated on GO — a NO-GO run would have been refused here.
- Off `main`, one clean commit, conventional message + co-author trailer.
- Host-agnostic: `gh` was a convenience; the plain-git path (push + paste) works identically on GitLab.
- No merge, no force-push — the human stays in control of landing it.
