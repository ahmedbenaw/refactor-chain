# Worked example — deriving a green net for an untested module

## Before

A small pricing module, no tests anywhere in the repo. The team wants to refactor
`price.js` (extract a discount strategy, split a long function) but has no way to
tell if the refactor changes results.

```js
// price.js
function priceCart(items, coupon) {
  let total = 0;
  for (const it of items) total += it.qty * it.unit;
  if (coupon === "SAVE10") total = total * 0.9;
  if (coupon === "SAVE10" && total > 100) total = total - 5; // stacks on top of 10%
  return Math.round(total * 100) / 100;
}
module.exports = { priceCart };
```

`orchestrate.mjs status` → `phase: "baseline"`, `baseline: false`. No suite detected.

### Two quirks worth noticing (we pin them, we do NOT fix them)
- `SAVE10` **stacks** a further `-5` on top of the 10% when total > 100. Possibly a
  bug — but it is current behavior, so it gets pinned.
- Rounding is half-up via `Math.round`, so `-0.005` cases round toward `+0`.

---

## Action — derive minimal characterization tests

We enumerate the seams (the one public function `priceCart`) and capture *actual*
output for representative + edge inputs, including the quirks.

```js
// price.characterization.test.js  (derived — pins CURRENT behavior)
const { priceCart } = require("./price");

test("no coupon sums qty*unit", () => {
  expect(priceCart([{ qty: 2, unit: 10 }, { qty: 1, unit: 5 }], null)).toBe(25);
});

test("SAVE10 applies 10% under threshold", () => {
  expect(priceCart([{ qty: 1, unit: 50 }], "SAVE10")).toBe(45); // 50 * 0.9
});

test("SAVE10 STACKS extra -5 over 100 (pinned quirk, not endorsed)", () => {
  // 200 -> 180 (10%) -> 175 (extra -5). We pin 175, bug and all.
  expect(priceCart([{ qty: 2, unit: 100 }], "SAVE10")).toBe(175);
});

test("empty cart is 0", () => {
  expect(priceCart([], "SAVE10")).toBe(0);
});
```

Run against **unmodified** `price.js`:

```
$ npx jest price.characterization
 PASS  ./price.characterization.test.js  (4 passed)
```

All green on untouched code — the net correctly describes today's behavior.

---

## After — baseline recorded

```
$ node <orchestrate.mjs> baseline --target . \
    --cmd "npx jest price.characterization" --framework jest \
    --derived --passset "4 passed"
{ "ok": true, "phase": "lane", "baseline": { "derived": true, ... },
  "firstStep": "refactor-web-03-components" }
```

`orchestrate.mjs status` → `baseline: true`, phase advanced to `lane`.

**Why this is the right net:** it is minimal (one function, four cases), fast, and it
locks the exact numbers — including the `-5` stacking quirk — so when the refactor
extracts the discount strategy, `refactor-verify` will re-run these four and flag any
number that moves. If someone "cleans up" the stacking during the refactor, the net
turns red and the chain stops that as behavior drift, exactly as intended.

**What we did NOT do:** we did not fix the stacking bug, add coverage for internal
helpers, or assert "correct" prices. That is out of scope for a safety net.
