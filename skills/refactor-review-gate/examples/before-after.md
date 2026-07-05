# Worked example — four raw reviews → one ranked go/no-go

A Web lane refactor extracted an order-parsing god-function into a `services/orders/`
module and introduced a repository interface. The lane finished, `refactor-code-principles`
consolidated, and the gate ran against the accumulated diff.

---

## The four raw inputs (what the gate received)

### `refactor-security` returned
1. `[Blocker] orders.ts:88` — order id concatenated into a raw SQL string
   (`"... WHERE id = " + id`). SQL injection. CWE-89. Confidence: high.
2. `[Optional] config.ts:12` — CORS `origin: "*"` unchanged by the refactor
   (pre-existing). Confidence: high.

### `refactor-performance` returned
1. `[Worth-fixing] orders.ts:120` — the extracted `enrichOrders()` now calls the
   repository inside a loop (N+1) where the old code batched. ~1.8× slower on the
   1k-order path. Confidence: high.

### `refactor-red-team` returned
1. `[Blocker] orders.ts:88` — `parseOrder()` now returns `undefined` for a malformed
   line where the original **threw** `ParseError`. A downstream caller
   (`checkout.ts:40`) branches on the throw. Behavior changed. Cheapest test written.
   Confidence: high.

### Gate's own correctness read returned
1. `[Optional] orders.ts:64` — `formatLine()` duplicated from `shared/format.ts`;
   could be reused. Confidence: medium.
2. `[Worth-fixing] orders.ts:88` — same widened-return as red-team flagged, from the
   contract angle.

---

## What the gate does with them (the actual work)

**Normalize + de-dupe.** Three different sources all point at `orders.ts:88`:
- security sees SQL injection (the *string-building*),
- red-team sees the throw→undefined behavior change (the *return contract*),
- correctness sees the same widened return.

These are **two distinct items at the same line**, not three or one:
- Item A: SQL injection (security) — the concatenation.
- Item B: throw→undefined behavior change (red-team + correctness, merged) — the
  contract. Tagged `[red-team+correctness]`, severity Blocker (behavior changed).

**Rank by impact, then confidence.** Two Blockers, one Worth-fixing, one Optional.

---

## The gate's output (ONE calm list)

> **Decision: NO-GO — 2 must-fix items, both in `orders.ts`. Here they are, most
> important first. The rest is minor.**
>
> **1. [Blocker · do this first] `orders.ts:88` — behavior changed.**
> `parseOrder()` now returns `undefined` for a malformed line where it used to throw.
> `checkout.ts:40` still branches on the throw, so a bad order will now slip through
> silently instead of being rejected. A refactor must keep behavior identical — this
> one didn't. **Fix:** restore the throw (or update the caller deliberately, as its own
> change). A one-line test is written that fails today. `[red-team+correctness]` · high.
>
> **2. [Blocker] `orders.ts:88` — SQL injection.**
> The order id is glued straight into the SQL string, so a crafted id can read or wipe
> the table. **Fix:** parameterized query (`WHERE id = ?`, bind `id`). CWE-89.
> `[security]` · high.
>
> **3. [Worth-fixing] `orders.ts:120` — got ~1.8× slower.**
> `enrichOrders()` now hits the database once per order (N+1) instead of batching. Fine
> for small lists, noticeable at 1k+. **Fix:** restore the batched fetch. `[perf]` · high.
>
> **Assurances (good news):** no secrets in the diff; no weak crypto; the rest of the
> behavior-preservation checks passed; the new module layering is clean.
>
> **Appendix (optional nits):** `formatLine()` duplicates `shared/format.ts:8` — could
> reuse. Pre-existing CORS `*` in `config.ts:12` (not from this refactor).

---

## Why this is the right shape

- **One list, not four reports.** The reader gets a single ranked view, not four tools
  to reconcile.
- **De-dupe made the truth clearer.** The `orders.ts:88` line had a security bug AND a
  behavior change — two real, different items — while the duplicate contract finding
  folded into one. Neither over- nor under-counted.
- **Behavior change sorted to the top.** It's the load-bearing promise of a refactor,
  so it leads even above the injection.
- **Calm, honest, actionable.** Good news is surfaced; each Blocker has a concrete fix;
  the long tail didn't drown the two things that matter.
- **No-go, cleanly.** The gate paused for a human and edited nothing. Once items 1–2 are
  fixed in a labeled change and the gate re-runs clean, the chain advances to docs → ship.
