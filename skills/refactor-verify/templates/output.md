# Verify — step verdict

**Project:** `<path>`
**Step verified:** `<skill / step label>`  ·  **Scope:** `<per-step | FINAL GATE>`
**Date:** `<iso date>`

## 1. Baseline re-run
- Command (verbatim from safety-net): `<command>`
- Result: `<N passed, M failed>` / snapshot `<id>`

## 2. Pass-set comparison
- Recorded baseline pass-set: `<summary>`
- Post-step pass-set: `<summary>`
- Diff: `<empty | list of tests that changed>`

## 3. Verdict
- Classification: `<identical | rename-churn | drift>`
- **delta:** `<legal | drift>`

### If rename-churn (legal fix applied)
- Imports/paths repaired (rename-induced only): `<list>`
- Re-run after fix: `<identical? yes>`

### If drift (rolled back — NOT fixed)
- Assertion that moved: `<test name>` — expected `<baseline>`, actual `<post-step>`
- Rollback: `git stash apply <checkpoint sha>` → baseline green again: `<yes>`
- Self-heal signalled: `orchestrate.mjs fail --reason "<...>"` → attempt `<n>` of 3

## 4. Harness transition
- Command run: `orchestrate.mjs advance --delta <legal|drift> [--note "<...>"]`
- Result: `<advanced to next: <skill> | blocked: rolled back>`

## 5. Note (plain language)
`<one line the user reads: "Same tests pass — advancing" OR "That step changed
behavior, I undid it, retrying differently.">`
