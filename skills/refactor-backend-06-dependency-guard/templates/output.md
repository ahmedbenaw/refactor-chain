# Output scaffolds — layered dependency guard (step 06)

## A. Check report

```markdown
# Layered dependency check — {project} — {date}

Module map: controllers → `{ctrl-module}` · services → `{svc-module}` · models → `{model-module}`
Scope: {modules/paths scanned} · Controllers scanned: {n}

## Exclusions (gate fired before rules)
| File | Injected type | Exclusion | Reason |
|------|---------------|-----------|--------|
| {file} | {Type} | EXC-{n} | {e.g. @FeignClient remote client} |

## Violations (deterministic first-match labels)
| # | Rule | Severity | File:line | Injected/leaked type | Evidence | Proposed remedy |
|---|------|----------|-----------|----------------------|----------|-----------------|
| 1 | DEP-{n} | FAIL/WARN | {path}:{ln} | {Type} | {matched condition} | {strategy} |

## Summary
FAIL: {f} (DEP-1 {a} · DEP-2 {b} · DEP-3 {c} · DEP-6 {d}) · WARN: {w} · SKIP: {s}
Verdict: {clean | fix required}
```

## B. Fix plan (requires explicit confirmation)

```markdown
# Dependency fix plan — {project} — {date}

Execution order: DEP-6 moves → DEP-1 → DEP-2 → DEP-3 → advisories.
Compile checkpoint every 3–5 fixes. Confirm to proceed: yes/no.

## DEP-2 pre-flight (per delegate service — blocking)
- DAO: `{DaoClass}` in `{dao.package}` → service package `{service.package}`
- New: `I{Name}DelegateService` / `{Name}DelegateServiceImpl` in `{svc-module}`
- Forwarded methods (verbatim signatures): {list}
- Collisions requiring prefixes: {none | list with prefixed names}

## Items
| # | Rule | File | Action | Strategy/branch |
|---|------|------|--------|-----------------|
```

## C. Completion report

```markdown
# Dependency fix report — {project} — {date}

Fixed: {f} · Skipped: {s} (reasons logged) · Reported: {f+s} = plan total {t} ✔/✘

## Completeness loop
- V-1 `service.impl` residue in controller modules: {0 hits | list}
- V-2 DAO/mapper residue in controller modules: {0 hits | list}
- V-3 interface completeness (per swapped field, all overloads): PASS/FAIL
- V-4 batch compiles: {k}/{k} green · V-5 full build: {BUILD SUCCESS | errors}
- V-6 module placement matches map: PASS/FAIL

Handed to: chain verify gate.
```
