<!-- refactor-chain-readiness-report -->

## refactor-chain — refactor-readiness report

Report-only. Nothing in this repository was edited, pushed, or merged.

| Signal | Value |
| --- | --- |
| Lane | `<lane>` (<case>) |
| Confidence | <NN>% |
| In scope | <yes/no> |
| Languages | <languages or n/a> |
| Platform / OS | <platform> / <os> |
| Harness health | <healthy / needs attention> |

### Guideline gaps (most important first)

<!-- One line per gap, ranked; or the single line "None — this codebase already meets the baseline." -->
- 🔴 **blocker** — <plain-English gap> (`<gap-id>`)
- 🟡 **worth-fixing** — <plain-English gap> (`<gap-id>`)
- ⚪ **optional** — <plain-English gap> (`<gap-id>`)

_<one-line audit summary>_

### Agent review (read-only)

<!-- Agent mode only; delete otherwise. Ranked findings, plain language, under 400
words — the action caps this section at 20,000 bytes regardless. -->
<agent findings, ranked by severity>

---

<!--
Appendix (not part of the posted report) — minimal deterministic workflow:

on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: <owner>/refactor-chain@<pinned-sha>
        with:
          comment: "true"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
-->
