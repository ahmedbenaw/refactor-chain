# Output scaffolds — API & naming conventions (step 07)

Fill every `{placeholder}`. Keep section order and sorting rules exactly
(check id → file path → line) so repeat runs diff clean.

## Check report

```markdown
# API & Naming Convention Check — {project}

## Overview
- Scanned path: {path}
- Files scanned: {file_count}
- Passing items: {pass_count}
- Fixable findings: {fixable_count}
- Constrained findings (report-only): {constrained_count}

## N-01 Endpoint paths ({pass}/{fail})
| # | Class | Full path | Finding | Severity | Class |
|---|-------|-----------|---------|----------|-------|
| 1 | {Controller} | {path} | {finding or —} | {PASS/WARN/FAIL} | {fixable/constrained/—} |

## N-02 Class naming ({pass}/{fail})
| # | File | Class | Finding | Suggested name | Severity | Class |
|---|------|-------|---------|----------------|----------|-------|

## N-03 Property naming ({pass}/{fail})
| # | File | Class | Field | Finding | Severity | Class |
|---|------|-------|-------|---------|----------|-------|

## N-04 Request parameters ({pass}/{fail})
| # | Method | Parameter | Finding | Severity | Class |
|---|--------|-----------|---------|----------|-------|

## N-05 Response wrappers ({pass}/{fail})
| # | Method | Return type | Finding | Severity | Class |
|---|--------|-------------|---------|----------|-------|

## N-06 Bean-name conflicts ({pass}/{fail})
| # | Bean name | Conflicting classes (modules) | Severity | Class |
|---|-----------|-------------------------------|----------|-------|

## Constrained findings (not auto-fixed)
| # | Check | Finding | Why constrained |
|---|-------|---------|-----------------|

## Fix recommendations (fixable only)
| # | Priority | Fix type | Detail | Files affected | Risk |
|---|----------|----------|--------|----------------|------|
```

If a check has no findings, keep its heading and note "all passing" under it.

## Fix plan (shown for confirmation before any edit)

```markdown
# Fix plan — API & naming (step 07)

You are here: step 7 of 9. Everything below is a rename or annotation change;
no endpoint URL, JSON field, or method body will change.

## Item {n}: {fix type}
- File: {path}
- Current: {code or name}
- Target: {code or name}
- References to update: {list or count}
- Risk: {low/medium}
- Idempotence: skipped if already in target state

Reply "go" to apply item by item, or name the items to skip.
```

## Completion note

```markdown
# Step 07 complete
- Fixed: {n} items · Skipped (already compliant): {n} · Constrained (reported): {n}
- Verification: old identifiers grep to 0 · file/class names match ·
  bean names unique · re-check clean · build compiles
- Next: refactor-backend-08-common-extract (shared-code extraction)
```
