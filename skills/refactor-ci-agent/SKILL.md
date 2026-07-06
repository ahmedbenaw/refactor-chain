---
name: refactor-ci-agent
description: "Use this skill when refactor-chain runs in CI — setting up, explaining, or debugging the repo's composite GitHub Action (`action.yml`), which publishes a refactor-readiness report (classify + guidelines audit + doctor) to the job summary and optionally as a PR comment. Trigger phrases include \"run refactor-chain in CI\", \"add the readiness report to our PRs\", \"set up the GitHub Action\", \"why is the bot commenting twice\", \"agent mode in the pipeline\", or a workflow file referencing the refactor-chain action. Covers the two modes — deterministic (zero keys, analysis scripts only) and opt-in agent mode (the user's OWN agent CLI and credentials, report-only) — plus secrets hygiene and PR-comment etiquette. Phase: ship/verify; conditional — only applies when the chain runs inside CI rather than a chat session."
---

# CI Agent — the chain as a pipeline citizen — refactor-chain · ship/verify

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** ship/verify — the readiness report runs on PRs and pushes · **Prerequisite:** the repo consumes the composite action (a workflow step uses it) · **Next:** humans read the report; the chain itself runs in chat, not CI.
**Adaptivity / conditional:** conditional on CI — this skill only activates when refactor-chain is being wired into or debugged inside a CI pipeline. Report-only in every mode: the action never edits, pushes, or merges.

## Purpose
In chat, the chain refactors. In CI, it only *reports*. The composite GitHub Action
(`action.yml` at the plugin root) produces a refactor-readiness report for any
repository — what lane it is, how confident the classification is, which guideline
gaps exist and how severe — and publishes it where engineers already look: the job
summary and, optionally, one calm PR comment. Two modes, one hard line: deterministic
mode needs zero credentials; agent mode borrows the *user's own* agent CLI and key,
and even then remains read-only. CI is the one place a wrong move is amplified by
automation, so the guardrails here are the point.

## When to use
- Wiring the action into a workflow ("add the readiness report to our PRs").
- Choosing or explaining modes ("do we need an API key for this?" — deterministic: no).
- Debugging CI behavior: duplicate comments, missing job summary, a failing agent step.
- Reviewing a workflow that calls the action, for secrets hygiene and least privilege.
- NOT for chat-session refactoring — the interactive chain owns that; CI never edits.

## What I'll tell you (plain-language / ADHD-friendly)
- "This adds a health report to your PRs — like a code-quality weather forecast. It reads your repo and writes a summary; it never changes a single file."
- "Default mode needs no API keys, no secrets, nothing — it's just analysis scripts. You can turn it on in two minutes."
- "Agent mode is opt-in and uses *your* agent CLI with *your* key. The action never sees or stores credentials, and even the agent is told: report only, touch nothing."
- "It posts ONE comment per PR and edits that same comment on every re-run — no comment spam drowning your review thread."
- "If the agent step fails, the deterministic report still stands — you never lose the whole signal because one layer hiccuped."

## Method
1. **Know the action** (`the repo's `action.yml``, composite).
   Inputs: `mode` (`deterministic` default | `agent`), `target` (dir, default `.`),
   `agent-cmd` (the user's agent CLI, e.g. `claude -p` — required for agent mode, guarded
   by an early failing step if missing), `comment` (`"true"` posts/edits the PR comment).
   Steps, in order: guard agent mode → setup Node 20 → run the read-only trio
   (`diagnose.mjs classify`, `lib/guidelines.mjs audit`, `orchestrate.mjs doctor`) into
   `$RUNNER_TEMP/refactor-chain/*.json` → assemble `report.md` (lane/case, confidence %,
   in-scope, languages, platform/OS, harness health, then ranked guideline gaps
   🔴 blocker / 🟡 worth-fixing / ⚪ optional) and append it to `$GITHUB_STEP_SUMMARY` →
   optional agent review → optional PR comment.
2. **Recommend deterministic mode first.** It is zero-dependency (Node scripts only),
   needs no secrets, and already answers "how refactor-ready is this repo?". Minimal
   workflow snippet in `templates/output.md`'s appendix.
3. **Agent mode, only when asked for.** It pipes a bounded prompt ("review gate,
   read-only, findings only, ranked, under 400 words") into `agent-cmd`, caps output at
   20,000 bytes (`head -c`) so a chatty agent can't flood the summary, and appends the
   result under "Agent review (read-only)". The command runs with the *caller's*
   environment and auth — the action never supplies, reads, or stores credentials. If
   the agent command fails, the step fails loudly but the deterministic report above it
   still stands.
4. **Secrets hygiene** (full checklist in `references/method.md`): keys live in GitHub
   Secrets, exposed only as env to the step that needs them; never echoed, never
   interpolated into the report, never in `agent-cmd` itself; `GITHUB_TOKEN` with
   least privilege (`pull-requests: write` only when `comment: true`). The comment step
   degrades gracefully — no token, it says so and exits 0.
5. **PR-comment etiquette:** one calm ranked comment per PR, marked with the hidden
   marker `<!-- refactor-chain-readiness-report -->`; on re-runs the action finds that
   marker and PATCHes the existing comment in place rather than posting again. Never
   restate the whole report in review-thread replies; never post on every push without
   the edit-in-place mechanism.
6. **Report per run** using `templates/output.md` — the PR-comment report scaffold the
   action's assembled `report.md` follows.

## Guardrails
- **Report-only in every mode.** The action never edits files, never pushes, never
  merges, never approves. Anything that changes the repo belongs to a human or to an
  interactive chain session — not CI.
- Agent mode never runs without an explicit `agent-cmd`; there is no bundled agent and
  no bundled key, by design.
- Secrets never appear in logs, reports, or comments; treat the job summary and PR
  comment as public surfaces.
- One PR = one comment, edited in place. Comment spam is a bug.
- A failed agent step must not erase the deterministic signal.

## Verify
- Plain: "The PR shows one tidy readiness report that updates itself on re-runs, nothing in the repo changed, and no secret ever showed up anywhere readable."
- Technical: job summary contains the report table + ranked gaps; with `comment: true`,
  exactly one PR comment starts with `<!-- refactor-chain-readiness-report -->` and its
  edit history shows in-place updates; `git status` in the workspace after the run is
  clean; workflow logs contain no credential material; in agent mode, the review
  section exists and is ≤ 20,000 bytes.

## Resources
- `references/method.md` — action anatomy, workflow recipes, secrets-hygiene checklist, comment etiquette rules, failure modes.
- `examples/before-after.md` — worked example: a spammy, key-leaking workflow vs. the disciplined one.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the PR-comment report scaffold (matches the action's assembled report).

## Chain position
Runs in the **ship/verify** neighborhood, but outside the interactive chain: it gives
every PR the *diagnose-shaped* signal (classify + guidelines audit + doctor) without a
chat session. It consumes the same harness scripts the chain uses (`diagnose.mjs`,
`lib/guidelines.mjs`, `orchestrate.mjs doctor`) and feeds humans — a red gap in the CI
report is a natural trigger to open an interactive refactor-chain run, where
`refactor-code-principles` + the review gate still close every lane.
