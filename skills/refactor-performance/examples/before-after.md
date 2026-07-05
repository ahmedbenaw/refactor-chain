# Worked example — an N+1 introduced by a behavior-preserving extraction

## Context

A refactor step ("extract order enrichment into a helper") passed `refactor-verify` —
the outputs are byte-for-byte identical, so behavior is preserved. But the extraction
moved a data lookup *into a loop*, silently turning one query into N.

### Before the refactor
```js
// one query, then in-memory join
const orders = await db.orders.findMany({ where: { userId } });
const customerIds = [...new Set(orders.map(o => o.customerId))];
const customers = await db.customers.findMany({ where: { id: { in: customerIds } } });
const byId = new Map(customers.map(c => [c.id, c]));
return orders.map(o => ({ ...o, customer: byId.get(o.customerId) }));
```

### After the refactor (behavior identical, but now N+1)
```js
const orders = await db.orders.findMany({ where: { userId } });
return Promise.all(orders.map(o => enrichOrder(o)));      // looks clean...

async function enrichOrder(o) {
  const customer = await db.customers.findUnique({ where: { id: o.customerId } }); // ← one query PER order
  return { ...o, customer };
}
```

`refactor-verify`: **identical pass-set** — the returned data is exactly the same. So the
correctness gate is happy. This performance pass is what catches the cost.

---

## Finding (this skill's output — advisory, no edit)

**Rank 1 (highest) — N+1 query introduced by extraction**
- **`orders/enrichOrder.js:4`** — `db.customers.findUnique` runs **once per order**.
- **Cost class:** N+1 / data-access.
- **Why the refactor caused it:** the pre-refactor code batched all customers in one
  `IN` query and joined in memory; the extraction hid the lookup inside `enrichOrder`,
  which is called per order — so 500 orders = 500 customer queries instead of 1.
- **Impact rank rationale:** data-size sensitive (grows with order count) × per-request
  hot path × per-item DB round-trip = top of the list.
- **Behavior-preserving fix sketch:**
  ```js
  const orders = await db.orders.findMany({ where: { userId } });
  const ids = [...new Set(orders.map(o => o.customerId))];
  const customers = await db.customers.findMany({ where: { id: { in: ids } } });
  const byId = new Map(customers.map(c => [c.id, c]));
  return orders.map(o => ({ ...o, customer: byId.get(o.customerId) }));
  ```
  Same output, one query. (Applied later as a deliberate change that must re-pass
  `refactor-verify`.)

**Checked and clean:** no new heavy dependency added; the `map` is still O(n); no
`SELECT *`; no dropped memo elsewhere in the diff.

---

## Why this belongs in the perf pass, not the correctness gate

`refactor-verify` proved the *results* are identical — it cannot see that the *cost* went
from 1 query to N, because both return the same rows. That is exactly the gap this static
performance review fills: a behavior-preserving refactor can still make code slower, and
this pass flags it, ranks it, and sketches the fix — worst-first — for
`refactor-review-gate` to fold into the go/no-go report.
