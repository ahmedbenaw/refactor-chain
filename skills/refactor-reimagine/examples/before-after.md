# Worked example — a god-service reimagined three ways (advisory)

> Reminder: this skill produced a **proposal**. No code changed. The "after" here
> is a *proposed* target, contingent on the user opting in.

## Before — the pain

`refactor-assessment-map` flagged `BillingService`:

- 1,900 lines in one class.
- Responsibilities tangled: pricing, tax calculation, invoice rendering, and
  email delivery all inline.
- 41 inbound couplings; appears in ~60% of recent PRs (top churn hotspot).
- Nothing can be unit-tested without a live database and an SMTP server.

Behavior-preserving cleanup (rename, extract-method, dedupe) was tried and helped
readability, but the *shape* is the problem — every change still touches the one
god-class. The user asks: "what would this look like if we did it right?"

## The proposal (excerpt)

### Option 0 — Minimal / do-nothing
Keep cleaning up in place. Low risk, but pricing stays untestable and the hotspot
stays hot. Choose if billing is about to be frozen.

### Option A — Split by responsibility (4 focused services)
```
BillingService (thin orchestrator)
 ├─ PricingService     (pure, testable)
 ├─ TaxService         (pure, testable)
 ├─ InvoiceRenderer    (I/O at edge)
 └─ InvoiceNotifier    (email at edge)
```
- Solves: testability of pricing/tax; shrinks the hotspot; clear ownership.
- Does NOT solve: the DB coupling in rendering (left for later).
- Cost: medium. Risk: medium, mitigated by extracting one service at a time.

### Option B — Ports & adapters (hexagonal)
```
        [Pricing/Tax domain — pure policy]
              ▲                 ▲
   InvoiceRepo(port)      Notifier(port)
        │                       │
   JpaInvoiceRepo         SmtpNotifier   (adapters, swappable)
```
- Solves: everything Option A does, plus DB/SMTP become swappable (in-memory in
  tests). Highest testability.
- Cost: high. Risk: medium. Team familiarity: low (no hexagonal code today).

### Comparison

| Criterion | Option 0 | Option A | Option B |
|-----------|:--------:|:--------:|:--------:|
| Solves core pain | ✗ | ✓ | ✓ |
| Effort | low | medium | high |
| Testability gained | none | high | very high |
| Team familiarity | high | high | low |

### Recommendation
**Option A.**
- Choose this if: pricing/tax rules keep changing and you want them testable now,
  without asking the team to learn a new architecture.
- Avoid this if: billing is frozen this year (then Option 0), or you already run
  hexagonal elsewhere and want consistency (then Option B).

### Incremental migration sketch (strangler + seam-first)
1. Extract `PricingService` as a pure class; `BillingService` delegates to it.
   Behavior-preserving. Verify: full suite identical pass-set.
2. Extract `TaxService` the same way. Verify: identical pass-set.
3. Extract `InvoiceRenderer`, then `InvoiceNotifier`. Verify each step.
4. `BillingService` becomes a thin orchestrator. Verify: identical pass-set.

Every step is independently shippable and reversible. Each is handed to
`refactor-transform`, which checkpoints, applies the one step, and confirms
behavior is identical before advancing.

### Opt-in gate
- [ ] Proceed with Option A → hand steps 1–4 to `refactor-transform`.
- [ ] Not now → keep the safe cleanup.

## Outcome in this example
The user checked "Proceed with Option A." Only then did step 1 flow to
`refactor-transform`. Had they checked "Not now," the working tree would remain
exactly as it was — this skill changed nothing on its own.
