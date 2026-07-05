# Worked example — a quality-only simplification pass

After a lane extracted `services/pricing/`, the pricing module works but reads as
bloated. This pass simplifies it — same behavior, no bug-hunting.

---

## Before

```ts
// services/pricing/total.ts
interface IDiscountStrategy { apply(n: number): number; }      // one impl only
class PercentDiscount implements IDiscountStrategy {
  constructor(private pct: number) {}
  apply(n: number) { return n - (n * this.pct) / 100; }
}
function makeDiscount(pct: number): IDiscountStrategy {          // factory for one type
  return new PercentDiscount(pct);
}

export function total(items: Item[], pct: number) {
  let data = 0;                                                 // vague name
  for (let i = 0; i < items.length; i++) {                      // reinvented sum
    data = data + items[i].price;
  }
  // const legacyTax = data * 0.05;                             // dead, commented out
  const strategy = makeDiscount(pct);
  if (pct > 0) {
    return strategy.apply(data);
  } else {
    return strategy.apply(data);                               // both branches identical
  }
}
```

---

## The pass (four lenses, one step each, verified after each)

1. **Clarity — rename.** `data` → `subtotal`. Type-aware rename; baseline green. ✅
2. **Reuse — reinvented sum.** Replace the manual loop with
   `items.reduce((s, it) => s + it.price, 0)`. Baseline green (same value). ✅
3. **Dead code — commented block.** Delete the `legacyTax` line. Baseline green. ✅
4. **Clarity — identical branches.** The `if/else` returns the same thing both ways →
   collapse to a single `return strategy.apply(subtotal)`. Baseline green (behavior was
   already identical on both branches — this only removes the redundant fork). ✅
5. **Altitude — one-impl interface + factory (OFFERED, then applied on OK).** The
   `IDiscountStrategy` interface has one implementation and no test seam, and
   `makeDiscount` builds exactly one type. Offered as a choice; user said yes. Collapse
   to a plain function. Baseline green. ✅

---

## After

```ts
// services/pricing/total.ts
function applyPercentDiscount(n: number, pct: number) {
  return n - (n * pct) / 100;
}

export function total(items: Item[], pct: number) {
  const subtotal = items.reduce((s, it) => s + it.price, 0);
  return applyPercentDiscount(subtotal, pct);
}
```

Same inputs → same outputs, proven by the baseline pass-set after every step. Half the
lines, one clear function, no speculative abstraction.

---

## The report

> **Simplified 5 things — behavior identical (baseline green after each step):**
> 1. clarity: `data`→`subtotal` (`total.ts:12`)
> 2. reuse: manual sum loop → `reduce` (`total.ts:13`)
> 3. dead-code: removed commented `legacyTax` (`total.ts:15`)
> 4. clarity: collapsed identical if/else branches (`total.ts:17`)
> 5. altitude: removed one-impl `IDiscountStrategy` + `makeDiscount` factory → plain
>    `applyPercentDiscount` (offered first; approved) (`total.ts:1`)
>
> **Out of lane — noted, NOT touched:** `applyPercentDiscount` doesn't guard `pct > 100`
> (would yield a negative total). That's a possible **correctness** issue, not a
> simplification — I left it exactly as it was and flagged it for the review gate. I did
> not "fix" it, because that would change behavior inside a cleanup.

---

## Why this is the right shape

- **Every step behavior-preserving and proven.** No change shipped without a green
  baseline after it; drift would have been undone immediately.
- **Genuinely simpler, not just different.** Fewer lines, one meaning per piece, no
  speculative interface. Altitude corrected downward (removed a fake seam) — the common
  case.
- **Stayed in lane.** The `pct > 100` bug was spotted and **left untouched**, handed to
  the reviewer. That restraint is the whole point: simplify quality, don't smuggle
  behavior changes.
- **Big move gated.** Collapsing the interface/factory was offered as a choice, not done
  silently, because it reshapes structure others might lean on.
