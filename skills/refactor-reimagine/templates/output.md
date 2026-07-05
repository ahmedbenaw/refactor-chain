# Design Proposal (Advisory) — `<module / system name>`

> **This is a proposal, not a change.** `refactor-reimagine` produced this. **No
> code was modified.** Behavior-preserving refactoring remains the default. A
> bolder redesign happens only if you explicitly opt in below, and even then it
> is executed step-by-step by `refactor-transform` with behavior verified at
> every step.

- **Scope:** `<paths / module in question>`
- **Grounded in:** `refactor-understand` summary + `refactor-assessment-map` (hotspots/coupling)
- **Date:** `<ISO timestamp>`

## The structural pain (why reimagine at all)
<Plain-English statement of the specific structural problem — e.g. "`BillingService`
is a 2,000-line god-object: pricing, tax, invoicing, and email all live in one
class, so nothing here can be changed or tested in isolation." Name the evidence:
coupling counts, hotspot churn, the seams that are missing.>

> If the pain is mild, the honest recommendation may be **Option 0 (do the minimal
> safe cleanup)** — bolder is not automatically better.

## Candidate designs

### Option 0 — Minimal / do-nothing (baseline)
- **Shape:** keep the current structure; do only behavior-preserving cleanup.
- **Benefit:** lowest risk, lowest cost, no migration.
- **Cost / risk:** the structural pain remains.
- **Choose if:** the pain isn't actually blocking work.

### Option A — `<name, e.g. "Split by responsibility (extract 4 services)">`
```
<simple ASCII/text diagram of the target shape>
```
- **Solves:** <what improves>
- **Explicitly does NOT solve:** <what it leaves alone>
- **Benefits:** <...>
- **Costs:** <effort, churn, learning curve>
- **Risks:** <what could go wrong; how it's mitigated>

### Option B — `<name, e.g. "Hexagonal / ports-and-adapters">`
```
<diagram>
```
- **Solves / does NOT solve / Benefits / Costs / Risks:** <...>

### Option C (optional) — `<name>`
- <...>

## Comparison

| Criterion | Option 0 | Option A | Option B |
|-----------|:--------:|:--------:|:--------:|
| Solves the core pain | ✗ | ✓ | ✓ |
| Effort / cost | low | medium | high |
| Risk | low | medium | medium |
| Testability gained | none | high | high |
| Reversibility | n/a | high | medium |
| Team familiarity | high | high | low |

## Recommendation
**Recommended: `<Option X>`.**
- **Choose this if:** `<falsifiable condition — e.g. "you expect to keep changing pricing rules and want them testable in isolation">`
- **Avoid this if:** `<falsifiable condition — e.g. "billing is frozen and unlikely to change this year — then Option 0">`
- **Reasoning:** <2–4 sentences>

## Incremental migration sketch (never big-bang)
A sequence of small, independently shippable, behavior-preserving steps. Each is
something `refactor-transform` can execute and verify.

1. **Step 1 — <seam-creating step>** (behavior-preserving). Verify: `<how>`.
2. **Step 2 — <extract / introduce boundary>** (behavior-preserving). Verify: `<how>`.
3. **Step 3 — <migrate callers behind the abstraction>**. Verify: `<how>`.
4. **Step N — <retire the old shape>**. Verify: `<how>`.

- **Pattern used:** `<strangler | branch-by-abstraction | seam-first extraction>`
- **Stop-anytime:** every step leaves the system shippable; you can halt after any one.

## Opt-in gate
- [ ] **I want to proceed with `<Option X>`.** Hand the approved steps to
  `refactor-transform`, one at a time, behavior verified at each.
- [ ] **Not now.** Keep the default behavior-preserving cleanup; discard this
  proposal.

> Until a box above is explicitly checked by the user, **nothing is executed.**
