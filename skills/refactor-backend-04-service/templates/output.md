# Output scaffolds — service-layer structure (step 04)

## A. Check report

```markdown
# Service-layer check — {project} — {date}

Scope: {N} module(s) scanned · interface package convention: `{interfacePkg}/`
Scan coverage: service roots, business sub-packages, nested */service/ trees, scattered impl/ folders

## Summary
| Rule | Check | FAIL | WARN | INFO |
|------|-------|------|------|------|
| SVC-1 | interface/impl separation        | {n} | {n} | – |
| SVC-2 | interface-package existence/coverage | {n} | – | – |
| SVC-3 | interface ownership              | {n} | {n} | – |
| SVC-4 | implementation ownership         | {n} | – | – |
| SVC-5 | non-service file handling        | –   | {n} | {n} |

## Findings
| # | Rule | Severity | File | Current package | Expected package | Note |
|---|------|----------|------|-----------------|------------------|------|
| 1 | SVC-3 | FAIL | {File.java} | {pkg} | {service.interfacePkg} | {…} |

## Excluded (with reasons)
| File | Reason |
|------|--------|
| {Client.java} | remote-client interface (@FeignClient) — stays in place |

## Left in place (ambiguous / out of scope)
| File | Rule hit | Suggested follow-up |
|------|----------|---------------------|
```

## B. Fix plan (requires explicit confirmation)

```markdown
# Service-layer fix plan — {project}

Execution order: interfaces first, then implementations; alphabetical by module, then filename; one file at a time.

## Conflict pre-check
- Same-name collisions at destinations: {none | list → HARD STOP}
- Duplicate basenames among candidates: {none | list → HARD STOP}
- Wildcard imports affected: {n} (rewrite plan below)

## Moves
| # | Kind | File | From | To |
|---|------|------|------|-----|
| 1 | interface | {UserService.java} | {…service.basedata} | {…service.{interfacePkg}} |

Totals: {i} interfaces, {m} implementations, {k} files left in place.
Reply "confirm" to execute, or name the rows to exclude.
```

## C. Completion report

```markdown
# Service-layer fix — completion

| Verification | Result |
|--------------|--------|
| Structure (packages hold exactly the classified files) | PASS/FAIL |
| References (0 old-path hits project-wide)              | PASS/FAIL |
| Content (only package lines changed, Δ ≤ 1 line/file)  | PASS/FAIL |
| Counts (before == after: {i}/{m})                      | PASS/FAIL |

Moved: {i} interfaces, {m} implementations · Residual service files outside targets: {0}
Empty directories removed: {list} · Test-source references noted (not modified): {list}
Idempotence: re-scan plans 0 further moves ✔
→ Hand off to the chain verify gate, then step 05 (controller layer).
```
