# refactor-ci-agent — full method

## Action anatomy (`action.yml`, composite — read it before describing it)

| Input | Default | Meaning |
| --- | --- | --- |
| `mode` | `deterministic` | `deterministic` = analysis scripts only; `agent` = additionally pipe a bounded read-only prompt to `agent-cmd` |
| `target` | `.` | directory to analyze, relative to the workspace |
| `agent-cmd` | `""` | the USER's own agent CLI (e.g. `claude -p`, `codex exec`); required for agent mode; runs with the caller's env + auth |
| `comment` | `"false"` | `"true"` + a `GITHUB_TOKEN` on a `pull_request` event → post/edit the PR comment |

Step order:

1. **Guard agent mode** — `mode == 'agent' && agent-cmd == ''` → fail fast with a
   plain-language message ("the command uses YOUR credentials; this action never
   provides any").
2. **Setup Node 20** (`actions/setup-node@v4`; note the in-file `TODO pin SHA`).
3. **Classify, audit, doctor (read-only)** — into `$RUNNER_TEMP/refactor-chain/`:
   - `scripts/diagnose.mjs classify --target …` → `classify.json` (lane, case, confidence, inScope, signals incl. `languages:` and platform/os)
   - `scripts/lib/guidelines.mjs audit --target …` → `audit.json` (gaps: `{id, severity, plain}` + summary)
   - `scripts/orchestrate.mjs doctor --target …` → `doctor.json` (`ok` → harness health)
4. **Assemble report** — a heredoc `report.mjs` builds `report.md`: header, the
   "Report-only. Nothing … was edited, pushed, or merged." disclaimer, a signal table
   (lane, confidence %, in-scope, languages, platform/OS, harness health), then
   "Guideline gaps (most important first)" with severity icons
   (🔴 blocker, 🟡 worth-fixing, ⚪ optional) or "None — this codebase already meets
   the baseline.", then the audit summary in italics. Appended to `$GITHUB_STEP_SUMMARY`.
5. **Agent review (opt-in)** — pipes a fixed prompt (review gate, read-only, ranked,
   <400 words) into `$RC_AGENT_CMD`, output capped via `head -c 20000`, appended as
   "### Agent review (read-only)" to both `report.md` and the job summary. On failure:
   prints that the deterministic report still stands, exits 1.
6. **PR comment (opt-in)** — prepends marker `<!-- refactor-chain-readiness-report -->`,
   searches existing PR comments for the marker via `gh api --paginate`, PATCHes the
   first match in place, otherwise POSTs once. Missing token → message + `exit 0`
   (graceful skip, not a failure).

## Workflow recipes

Deterministic report on every PR (no secrets at all):

```yaml
on: pull_request
permissions:
  contents: read
  pull-requests: write   # only needed for comment: "true"
jobs:
  readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: <owner>/refactor-chain@<sha>
        with:
          comment: "true"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Agent mode (user's own CLI + key):

```yaml
      - uses: <owner>/refactor-chain@<sha>
        with:
          mode: agent
          agent-cmd: "claude -p"
          comment: "true"
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Secrets-hygiene checklist

- [ ] Keys only in GitHub Secrets; exposed as `env` to the single step that needs them.
- [ ] Never put a key in `agent-cmd`, `with:` inputs, or any interpolated string —
      inputs can end up in logs.
- [ ] Never `echo`/`set -x` around credentialed commands; the report, job summary, and
      PR comment are public surfaces — nothing secret may flow into them.
- [ ] `permissions:` at least-privilege: `contents: read` always;
      `pull-requests: write` only when commenting.
- [ ] Pin third-party actions (including this one and `setup-node`) to a commit SHA.
- [ ] Fork PRs: secrets are unavailable on `pull_request` from forks — deterministic
      mode still works; agent mode will fail its guard or its key, by design.

## PR-comment etiquette

1. **One comment per PR.** The marker `<!-- refactor-chain-readiness-report -->` is
   the identity; re-runs PATCH, never re-POST.
2. **Calm and ranked.** Severity order, plain language, no exclamation marks, the
   report-only disclaimer up top.
3. **Bounded.** The agent section is byte-capped; the deterministic table is fixed-size.
4. **Degrade politely.** No token → skip with a log line, exit 0. Failed agent → keep
   the deterministic report.
5. **Never** comment on every push without edit-in-place, reply to review threads with
   the full report, or @-mention people.

## Failure modes → fixes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Duplicate comments | marker missing/changed, or POST path taken on re-run | keep the exact marker; check the `gh api` search step's jq filter |
| "agent mode needs an agent command" | `mode: agent` without `agent-cmd` | supply the CLI or drop to deterministic |
| Empty agent section | agent CLI not authed in CI env | the key env var is missing on that step |
| No comment, run green | no `GITHUB_TOKEN`, or event isn't `pull_request` | pass the token; the comment step only runs on PR events |
| Report missing from summary | classify/audit/doctor step failed (`set -euo pipefail`) | run the failing script locally with `--target` to reproduce |
