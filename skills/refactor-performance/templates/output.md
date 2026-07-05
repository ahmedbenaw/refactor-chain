# Performance review — ranked findings (advisory)

**Project:** `<path>`
**Scope:** the refactor diff  ·  **Date:** `<iso date>`
**Prerequisite met:** `refactor-verify` confirmed behavior preserved on this diff: `<yes>`
**Posture:** advisory — findings only, no code changed.

## Ranked findings (worst first)

### Finding 1 — `<one-line title>`  ·  Rank: HIGH
- **Location:** `<file:line>`
- **Cost class:** `<algorithmic | n+1/data-access | repeated-work | bundle/query>`
- **Cost:** `<what got more expensive, quantified where possible: e.g. 1 query → N queries>`
- **Why the refactor caused it:** `<the specific move that introduced it>`
- **Rank rationale:** `<data-size sensitivity × call frequency × per-item cost>`
- **Runtime confirmation (if any):** `<measurement + tool, or "static evidence">`
- **Behavior-preserving fix sketch:**
  ```
  <minimal fix — same results, ordering, side effects>
  ```

### Finding 2 — `<title>`  ·  Rank: MEDIUM
`<same shape>`

### Finding 3 — `<title>`  ·  Rank: LOW
`<same shape>`

## Checked and clean
- `<e.g. no heavy dependency added; sort still O(n log n); no SELECT *; no dropped memo>`

## Hand-off
Ranked findings above are for `refactor-review-gate` to de-dupe and merge with the
security and red-team legs into the single go/no-go ship report. None of these were
applied — each fix, if taken, is a deliberate change that must re-pass `refactor-verify`.

## Note (plain language)
`<one line: "N ways the change could be slower, worst first, each with a fix — nothing
edited. Biggest is <finding 1>.">`
