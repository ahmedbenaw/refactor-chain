# Output scaffolds — DAO & model-layer tidy-up (step 03)

## A. Check report

```markdown
# DAO-layer check — {project} — {date}

Scope: search root `{root}` · {N} module(s) scanned
Classification: filename + directory position only (no file contents read)

## Summary
| Item | Check | FAIL | WARN | INFO |
|------|-------|------|------|------|
| D-1 | imp -> impl naming                 | {n} | –   | –   |
| D-2 | impl placement / interface at root | {n} | {n} | –   |
| D-3 | mapper / entity split              | {n} | {n} | –   |
| D-4 | four-layer completeness            | –   | {n} | –   |
| D-5 | mapper XML correspondence          | –   | {n} | –   |
| D-6 | model consolidation                | –   | {n} | {n} |
| D-7 | self-contained mini-domains        | –   | –   | {n} |

## Findings
| # | Item | Severity | File / dir | Current location | Target location | Note |
|---|------|----------|------------|------------------|-----------------|------|
| 1 | D-3 | FAIL | {ItemMapper.java} | {dao/} | {dao/mapper/} | {…} |

## Exempted mini-domains (INFO — skipped entirely)
| Directory | Trio matched | Reason |
|-----------|--------------|--------|
| {promo/} | entity + mapper + service | independent vertical slice, not a standard layer |

## Model classes (D-6)
| File | Current module | Shared model target | Package (unchanged) |
|------|----------------|---------------------|---------------------|
| {StockLevel.java} | {inventory-service} | {inventory-model} | {com.acme.inventory.model} |
```

## B. Fix plan (requires explicit confirmation)

```markdown
# DAO-layer fix plan — {project}

Execution order: (a) imp->impl renames · (b) DAO relocation · (c) mapper/entity split
· (d) model consolidation (packages untouched) · (e) create missing dirs.

## Idempotency pre-check
Already compliant (no move): {list}

## Directory renames
| # | From | To |
|---|------|-----|
| 1 | {daoImp/} | {dao/impl/} |

## File moves
| # | Kind | File | From | To | Conflict pre-check |
|---|------|------|------|-----|--------------------|
| 1 | mapper | {ItemMapper.java} | {dao/} | {dao/mapper/} | destination absent → move |

## Model consolidation (compile-neutral — zero imports change)
| # | File | To shared model module | Package |
|---|------|------------------------|---------|
| 1 | {StockLevel.java} | {inventory-model} | {com.acme.inventory.model} (unchanged) |

## Directories to create (dirs only, no files)
{list}

Conflicts held for a human decision (CONFLICT): {none | list}
Reply "confirm" to execute, or name the rows to exclude.
```

## C. Completion report

```markdown
# DAO-layer fix — completion

| Verification | Result |
|--------------|--------|
| V1 no imp residue (0 misspelled dirs, 0 old-path hits) | PASS/FAIL |
| V2 DAO placement (impls in dao/impl/, interfaces at root) | PASS/FAIL |
| V3 mapper/entity split                                    | PASS/FAIL |
| V4 model classes centralized in the shared model module   | PASS/FAIL |
| V5 model package lines before vs after — empty diff       | PASS/FAIL |
| Compile                                                   | PASS/FAIL |

Directories renamed: {list} · Files moved: {n} · Models consolidated: {n}
Directories created: {list} · Conflicts left for a human (CONFLICT): {list}
Idempotence: re-run of the check plans 0 further moves ✔
→ Hand off to the chain verify gate, then step 04 (service layer).
```
