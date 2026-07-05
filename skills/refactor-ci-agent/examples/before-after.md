# Worked example — a leaky, spammy CI setup vs. the disciplined one

## Setup

A team wants refactor-readiness feedback on every PR, plus an AI read-through.
Their first attempt at `.github/workflows/readiness.yml`:

## Before

```yaml
on: pull_request
jobs:
  readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: someorg/refactor-chain@main            # unpinned, floating ref
        with:
          mode: agent
          agent-cmd: "ANTHROPIC_API_KEY=sk-ant-xxxx claude -p"   # key in an input!
          comment: "true"
```

What goes wrong:

1. **The key is in the `agent-cmd` input** — it lands in the workflow file (committed),
   can surface in run logs, and is visible to anyone who can read the repo.
2. **`@main`** — the action can change under them between runs; supply-chain risk.
3. **No `permissions:` block** — the default token is broader than needed.
4. A teammate "fixes" duplicate feedback by adding a second plain
   `gh pr comment` step — now every push adds a **new** comment; a 12-push PR has 12
   stale reports drowning the review thread.
5. When the agent CLI hiccups, their wrapper swallows the whole job — PRs lose even
   the free deterministic signal.

## After

```yaml
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: someorg/refactor-chain@8f2c1d9e...     # pinned to a commit SHA
        with:
          mode: agent
          agent-cmd: "claude -p"                     # command only — no credentials
          comment: "true"
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}   # secret → env, one step
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

What changes:

1. **Key lives in GitHub Secrets**, exposed as env only to this step; the action never
   sees it as an input and never writes it anywhere readable.
2. **Pinned SHA** — the action's behavior is what was reviewed.
3. **Least privilege** — `contents: read` plus comment permission, nothing else.
4. **One comment, edited in place** — the action's built-in marker
   (`<!-- refactor-chain-readiness-report -->`) makes re-runs PATCH the same comment;
   the hand-rolled `gh pr comment` step is deleted. A 12-push PR shows one current
   report with an edit history.
5. **Layered degradation** — if `claude -p` fails, the step fails loudly but the
   deterministic report (lane, confidence, ranked guideline gaps) is already in the
   job summary and comment. Reviewers never lose the free signal.
6. **Still report-only** — in both versions the action never edits, pushes, or merges;
   the after version just makes that promise auditable (clean `git status`, no
   write-capable permissions beyond the comment).

## Why the after wins

Same feature set — deterministic report + agent review + PR comment — but zero
credential exposure, a reviewable supply chain, one calm comment instead of twelve,
and a report that survives its flakiest layer.
