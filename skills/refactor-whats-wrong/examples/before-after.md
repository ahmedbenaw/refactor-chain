# Worked Example — tracing a surface `TypeError` back to its origin

A concrete run of the loop. The point: the fix does **not** go where the error was thrown.

---

## The report

> "Checkout crashes for some orders. It works for most of them."

Symptom (surface):

```
TypeError: Cannot read properties of undefined (reading 'toFixed')
    at formatTotal (checkout.js:88)
    at renderSummary (checkout.js:41)
```

## Phase 1 — Reproduce (kill the flake)

"Some orders" is the clue. Bisecting the failing orders shows: every crashing order has at least one
line item added **on the last day of a month**. Pinning the clock reproduces it 100%:

```js
test('checkout crashes for month-end items', () => {
  withFrozenClock('2024-01-31T23:00:00Z', () => {
    expect(() => renderSummary(orderWithItemAddedNow())).not.toThrow(); // FAILS here
  });
});
```

Now deterministic → this test is our **oracle**.

## Phase 2 — Observe & bound

- **First observed-bad:** `formatTotal` receives `total === undefined`.
- **Last known-good:** the order object is well-formed when it enters `renderSummary`.
- Cause lives between: `renderSummary → computeTotal → …`.

The naive "fix" would be `total?.toFixed(2) ?? '0.00'` in `formatTotal`. That hides the bug and would
show a **wrong** total to the customer. Rejected — keep tracing.

## Phases 3–5 — hypothesize → probe → walk the chain

| # | Hypothesis (one at a time) | Probe | Result |
|---|---|---|---|
| 1 | `formatTotal` is called with the wrong arg | log the arg at `checkout.js:88` | **Refuted** — it's genuinely `undefined`; caller passes `computeTotal()` |
| 2 | `computeTotal` sums to `undefined` | log its return | **Confirmed** — returns `undefined` when any `item.addedAt` fails to parse |
| 3 | `item.addedAt` is malformed | log the raw value + parse | **Confirmed** — origin: `parseDate('2024-01-31')` returns `undefined` |

Origin found: `parseDate` builds a `Date` from `new Date(y, m, d)` but the caller passes **1-based**
months, so month `1` (January) + day `31` overflows into a February date on non-leap handling, and the
downstream guard `if (!isValidDate) return undefined` fires — silently poisoning the sum.

Evidence chain: `toFixed` on `undefined` ← `computeTotal` returned `undefined` ← one item's date was
`undefined` ← `parseDate` off-by-one month → invalid Date.

## Phase 6 — Fix at the origin + verify

Fix the **parser**, not `formatTotal`:

```diff
- return new Date(year, month, day);      // month treated as 0-based, caller passes 1-based
+ return new Date(year, month - 1, day);  // normalize caller's 1-based month
```

- Re-run the oracle test → **passes**.
- Full suite → **green** (no regression).
- The oracle test stays as a permanent regression test (fails on old code, passes on new).
- All temporary `console.log` probes removed.

## Why this is the right fix

Patching `formatTotal` would have stopped the crash but shipped a wrong total and left every other
consumer of `parseDate` silently broken. Fixing the origin repairs the whole class of bug at once —
that is what "trace the symptom backward to its true origin" buys you.
