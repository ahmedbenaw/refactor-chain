# Worked example — red-teaming a rename + extraction

The do-the-work step renamed `Svc` → `OrderService` and extracted the line-parsing
block out of a 200-line handler into `services/orders/parseLine.ts`. The refactorer
reported "behavior preserved — it compiles and the existing tests pass." The red-team
does not take that at face value.

---

## Step 2 — claims extracted from the diff

| # | Claim (falsifiable) | Type | `file:line` |
|---|---|---|---|
| C1 | Every reference to `Svc` now resolves to `OrderService`. | rename-resolves | `orders.ts:12` |
| C2 | `parseLine()` returns the same value on **every** path the inlined code did. | extraction-equivalent | `parseLine.ts:1` |
| C3 | The parsed rows come out in the same order as before. | order-preserved | `orders.ts:74` |
| C4 | A malformed line is handled the same way (threw before / throws now). | error-contract-same | `parseLine.ts:18` |

---

## Step 3 — the attacks

- **C1 (rename-resolves).** Type-check is green, but I grepped the *old* string `"Svc"`
  across the whole repo, not just TS references. Hit: `di.register("Svc", ...)` in
  `config.ts:30` — the DI container is keyed by the **string** `"Svc"`, which the
  rename did not touch. Counterexample found → **looks BROKEN**.
- **C2 (extraction-equivalent).** Walked the paths. The inlined code had an early
  `continue` on blank lines; the extracted `parseLine("")` returns `undefined`, and the
  caller now pushes `undefined` into the rows array where before it skipped. Possible
  drift → attack with a test.
- **C3 (order-preserved).** The extraction kept the same `for` loop; order is structurally
  unchanged. Attacked with a 2-row input by reading — **held**.
- **C4 (error-contract-same).** Old code `throw new ParseError` on a bad line; new
  `parseLine()` returns `undefined` on a bad line — the throw is gone. `checkout.ts:40`
  wraps the call in `try/catch (ParseError)`. Strong counterexample → **looks BROKEN**.

---

## Step 4 — rank (impact × likelihood × cheapness)

| Claim | Impact | Likelihood | Cheapness | Priority | Order |
|---|---|---|---|---|---|
| C4 error-contract | 5 (bad orders slip through) | 5 (caller demonstrably catches) | 5 (4-line test) | **125** | 1 |
| C1 rename/DI-key | 4 (runtime resolve fails) | 4 (string key found) | 4 (1 assertion) | **64** | 2 |
| C2 blank-line drift | 3 (junk row) | 3 (plausible) | 5 (tiny test) | **45** | 3 |
| C3 order | 2 | 1 (held on read) | 5 | **10** | 4 (skip test) |

Spend effort top-down: test C4, C1, C2; C3 held on reading and scores low — no test.

---

## Step 5 — cheapest tests

```ts
// C4 — pins the pre-refactor throw. FAILS against current code.
test("malformed line still throws ParseError", () => {
  expect(() => parseLine("###")).toThrow(ParseError);   // ← red today: returns undefined
});

// C1 — pins the DI resolution. FAILS against current code.
test("order service resolves from the container", () => {
  expect(container.resolve("Svc")).toBeInstanceOf(OrderService); // ← red: key never renamed
});

// C2 — pins blank-line skipping. FAILS: pushes undefined.
test("blank line is skipped, not parsed to undefined", () => {
  expect(parse("a\n\nb").rows).toEqual([rowA, rowB]);   // ← red: [rowA, undefined, rowB]
});
```

---

## Step 6 — the report (ranked verdicts)

> **3 of 4 behavior-preservation claims are BROKEN. Scariest first.**
>
> 1. **BROKEN · Blocker — `parseLine.ts:18` (error contract).** Bad lines used to throw
>    `ParseError`; now they return `undefined`. `checkout.ts:40` catches the throw, so
>    malformed orders now slip through silently. Test written, red today. Priority 125.
> 2. **BROKEN · Blocker — `config.ts:30` (rename/DI key).** The DI container is keyed by
>    the string `"Svc"`, which the rename missed; `container.resolve("Svc")` will fail at
>    runtime. Test written, red today. Priority 64.
> 3. **BROKEN · Worth-fixing — `parseLine.ts:1` (blank line).** Blank lines used to be
>    skipped; now they become `undefined` rows. Test written, red today. Priority 45.
> 4. **HELD — `orders.ts:74` (order).** Row order is unchanged. Verified by reading.
>
> Product code untouched; three characterization tests added under `test/orders/`.
> Handing to the review gate — items 1–3 are Blockers/Worth-fixing.

---

## Why this is the right shape

- **Compiles ≠ preserved.** Two of the three real breaks (the DI string key, the caught
  throw) sail past the type-checker. Only the adversarial read + a string grep + a
  caller check caught them.
- **Ranking spent effort well.** Four claims, three tests — C3 held on reading and
  scored too low to bother pinning. Cheapest-first meant maximum caught breakage per line
  of test.
- **Cheapest decisive test.** Each break is a 1–3 line test pinning exactly one behavior,
  red today — undeniable evidence, not an opinion.
- **Right lane.** It found the breaks and wrote the tests; it did **not** fix product
  code. The fixes are a separate, labeled change; the gate turns these into a no-go.
