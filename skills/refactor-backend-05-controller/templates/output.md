# Output scaffolds — controller-layer structure (step 05)

## A. Check report

```markdown
# Controller-layer check — {project} — {date}

Audience packages: `{ext}/` (external APIs) · `{int}/` (internal APIs)

## Scan reconciliation (blocking)
| Area | Controllers found |
|------|-------------------|
| {legacy area 1} | {n1} |
| {legacy area 2} | {n2} |
| controller/ + other + fallback sweep | {n3} |
| **Partition sum** | **{N}** |
| **Full-sweep total** | **{Nfull}** |
Result: {N == Nfull ? PASS : FAIL — list diff files and re-scan}

## Admission audit trail
| File | Verdict | Evidence (annotation line or EX-n reason) |
|------|---------|-------------------------------------------|

## Rule results
| Rule | Check | Result |
|------|-------|--------|
| CTL-1 | `{ext}/` and `{int}/` both exist | PASS/FAIL |
| CTL-2 | placement == computed target | {f} FAIL |
| CTL-3 | group capacity ≤ 10, no root-level files | {w} WARN |
| CTL-4 | no controller outside a controller package | {f} FAIL |
| CTL-5 | non-controllers inside controller packages | {i} INFO |

## Placement findings (CTL-2 / CTL-4)
| Class | Current package | Level | Rule hit | Target package | Status |
|-------|-----------------|-------|----------|----------------|--------|
```

## B. Fix plan (requires explicit confirmation)

```markdown
# Controller-layer fix plan — {project}

| # | Class | Current package | Target package | Level | Rule hit | Action |
|---|-------|-----------------|----------------|-------|----------|--------|

Totals: {N} controllers = {M} MIGRATE + {K} SKIP (must reconcile) · excluded non-controllers: {J}
Order: {int} first, then {ext}; alphabetical within; one file at a time.
Import tracking map: {M} entries (built before migration, read-only after).
Reply "confirm" to execute.
```

## C. Progress block (every 10 files; batches of ≤20 when M > 20)

```markdown
Progress: [{X}/{M}] ({pct}%)
├── this round: {file list}
├── done: {X} · remaining: {M-X}
└── sequence check: counters continuous ✔
```

## D. Completion report

```markdown
# Controller-layer fix — completion

Phase gate: planned {M} == moved {X} → {PASS/FAIL — FAIL blocks verification}

| Verification | Result |
|--------------|--------|
| 1. External references (old-path importers)     | {0 residual} PASS/FAIL |
| 2. Internal cross-references (moved files' own imports) | {0 residual} PASS/FAIL |
| 3. Global import consistency (full-tree grep)   | PASS/FAIL |
| 4. Content fidelity (per-file Δlines ≤ 2)       | PASS/FAIL (+ table on failure) |

Cleanup: {d} emptied legacy dirs removed (`{ext}/`/`{int}/` kept even if empty)
CTL-3 advisories left for the user: {list}
→ Hand off to the chain verify gate, then step 06 (dependency guard).
```
