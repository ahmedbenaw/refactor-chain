# Output scaffolds — shared-module extraction (step 08)

## A. Classification report

```markdown
# Common-extraction classification — {project} — {date}

Common module: `{project}-common` (registered in parent build file: {yes/no})
Families scanned: util · cache · constant · enums · exception · config
Modules scanned: {N} · Candidate files: {n}

## Summary
| Grade | Count | Meaning |
|-------|-------|---------|
| EXTRACT  | {n} | moves automatically |
| EVALUATE | {n} | user decides |
| RETAIN   | {n} | stays put |

## EXTRACT (auto-listed)
| # | File | Module | Family | Cross-module refs | Evidence |
|---|------|--------|--------|-------------------|----------|
| 1 | {DateUtil.java} | {orders-service} | util | {2} | no service/DAO imports; no module beans |

## EVALUATE (needs a decision)
| # | File | Module | Family | Why borderline |
|---|------|--------|--------|----------------|
| 1 | {…} | {…} | {…} | referenced by only its own module |

## RETAIN (excluded, with reason)
| # | File | Module | Gate | Reason |
|---|------|--------|------|--------|
| 1 | {OrderMapperScanConfig.java} | {orders-service} | Gate 1 | persistence-scanner config — red line |
```

## B. Migration report

```markdown
# Common-extraction migration — {project}

Migration order: constant → enums → exception → util → cache → config (one file at a time).

## Moves
| # | Family | File | From | To | Package changed? | Imports updated |
|---|--------|------|------|-----|------------------|-----------------|
| 1 | util | {DateUtil.java} | {orders-service/.../util} | {common/.../util} | no | 0 |

## Collisions held for a decision
| File | Existing in common | Chosen action |
|------|--------------------|---------------|
| {…} | {…} | merge / keep / replace |

## Build rewiring
| Module | Change |
|--------|--------|
| {orders-service} | + dependency on {project}-common |
| {project}-common | + third-party libs: {list} |

## Verification
| Check | Result |
|-------|--------|
| Each moved file's package matches its new path | PASS/FAIL |
| Every import of every moved class resolves     | PASS/FAIL |
| Source paths gone; empty source dirs cleaned    | PASS/FAIL |
| Build compiles across all modules               | PASS/FAIL |
| Bean component-scan coverage verified (where applicable) | PASS/FAIL/N/A |
| Idempotence: re-run reports an empty migration list | PASS/FAIL |

Test-source references noted (not modified): {list}
→ Hand off to the chain verify gate + refactor-verify, then step 09 (code optimize).
```
