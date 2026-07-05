# Output scaffolds — component standards & generation (step 03)

## A. Audit report

```markdown
# Component-standard audit — {project} — {date}

Framework: {react|vue|svelte|angular} · Component library: {lib | none}
Token map: primary→`{--token}` · danger→`{--token}` · body size→`{--token}` · … {or "no token layer — color ERRORs downgraded; see refactor-ui-tokens"}
Thresholds: primary/view {1} · danger/view {1} · actions-before-collapse {4} · panel width {200px} · label width {8ch} · frozen cols/side {3} {overrides noted}
Scope: {paths} · Categories: {CLR TYP BTN INP TBL | subset}

## Findings
| # | Rule | Severity | File:line | Finding | Token-resolved fix |
|---|------|----------|-----------|---------|--------------------|
| 1 | CLR-1 | ERROR | {path}:{ln} | literal `#…` on a primary action | replace with `var({--token})` |

## Unmappable literals (human decision needed)
| File:line | Literal | Nearest tokens | Why not auto-fixed |
|-----------|---------|----------------|--------------------|

Summary: ERROR {e} · WARN {w} · SUGGESTION {s} · Verdict: {pass | blocked by ERROR tier}
```

## B. Fix plan (requires explicit confirmation)

```markdown
# Component-standard fix plan — {project} — {date}

Checkpoint: {label}. Batch 1: literal→token swaps ({n} files). Batch 2: structural
rules ({rules}). Baseline re-run after each batch. Confirm to proceed: yes/no.
```

## C. Generation request + delivery note

```markdown
# Generated: {query panel | data table | form card | detail card | log view | progress}

Inputs: fields/columns {list} · framework {detected} · tokens {map excerpt}
Recipe applied: method.md §7 ({name}) · Thresholds honored: {list}

## Self-audit (blocking before delivery)
| Category | Rules evaluated | ERROR | WARN | Notes |
|----------|-----------------|-------|------|-------|
| CLR/TYP/BTN/INP/TBL | {…} | 0 required | {n} | {…} |
Accessible names on all interactive elements: PASS/FAIL

Delivered files: {paths}
```
