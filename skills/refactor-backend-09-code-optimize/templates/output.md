# Output scaffolds — service & repository quality pass (step 09)

## A. Check report

```markdown
# Quality-pass check — {project} — {date}

Scope: {paths} · Candidates: {n} ( {i} included · {x} excluded by filter · {s} skipped oversized )
Logging idiom detected: {@Slf4j | SLF4J field | other}
Persistence stack detected: {JdbcTemplate | MyBatis | JPA | mixed}

## Findings by severity
| # | File | Rule | Severity | Line(s) | Finding | Proposed repair |
|---|------|------|----------|---------|---------|-----------------|
| 1 | {path} | SQL-1 | P1 | {ln} | value concatenated into SQL | parameterize |

## Skip list
| File | Lines | Reason |
|------|-------|--------|
| {path} | {n} | over size ceiling ({limit}) |

Summary: P1 {a} · P2 {b} · P3 {c} · Verdict: {clean | fix recommended}
```

## B. Change report (fix mode)

```markdown
# Quality-pass change report — {project} — {date}

Style checkpoint: first file `{path}` confirmed by user at {time}.

## Per-file changes
| File | Rules applied | SQL fixes | Logs added | Cleanups | Notes |
|------|---------------|-----------|------------|----------|-------|
| {path} | SQL-1, LOG-1, OPT-4 | {n} | {n} | {n} | {…} |

## Preserved (evidence of red lines)
- Class names changed: 0 · Signatures changed: 0 · Existing logs edited: 0
- Functional comments / TODOs removed: 0 (dead-code comment blocks removed: {n})

## Reconciliation
Processed {p} + skipped {s} = candidates {n} ✔/✘

## Verification
- Residual SQL concatenation grep: {0 hits | list}
- One logger per touched class: PASS/FAIL · Build: {BUILD SUCCESS | errors}
- Baseline tests: {pass-set identical | diff}

Handed to: refactor-code-principles → review gate.
```
