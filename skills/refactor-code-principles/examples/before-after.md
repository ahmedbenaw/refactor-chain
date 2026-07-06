# Worked examples — principle-driven structural passes

Two complete passes through the engine, each showing the decision window, the smell → principle →
transform chain, and the proof that behavior never moved. Names and code are illustrative, not from
any real project.

---

## Example 1 — OO/SOLID: splitting a god class (decision window: accept)

### Detected stack
`diagnose.mjs classify` reports TypeScript, OO-family (class-based services, DI container present).

### The decision window (as shown to the user)

> I detected a **TypeScript / OO service** stack. The registry recommends:
> **SOLID + separation of concerns + composition-over-inheritance + CQS**, on top of the agnostic
> baseline (DRY/KISS/YAGNI, cohesion/coupling, Demeter, fail-fast, least astonishment).
>
> **(a) Accept** this set · **(b) Mix and match** from the full menu · **(c) Unconventional** —
> e.g. functional-core on this OO codebase (risk: fights the DI container and team idiom).
>
> One choice, then I work.

**User chose (a).** Recorded: `principles: SOLID+SoC+CoI+CQS (recommended, user-accepted, no risk overrides)`.

### Before

```ts
// order-manager.ts — 412 lines, one class, four jobs
class OrderManager {
  constructor(private db: Db, private smtp: Smtp) {}

  async placeOrder(cart: Cart, user: User) {
    // 1. validation
    if (!cart.items.length) throw new Error("empty cart");
    for (const it of cart.items) {
      if (it.qty <= 0) throw new Error(`bad qty for ${it.sku}`);
    }
    // 2. pricing (tax rules inlined, duplicated in invoice-preview.ts)
    let total = 0;
    for (const it of cart.items) {
      const base = it.unitPrice * it.qty;
      const tax = user.region === "EU" ? base * 0.2
                : user.region === "UK" ? base * 0.2
                : base * 0.0825;
      total += base + tax;
    }
    // 3. persistence
    const id = await this.db.insert("orders", { userId: user.id, total, items: cart.items });
    // 4. notification (formatting welded to SMTP transport)
    await this.smtp.send(user.email, "Order placed",
      `Hi ${user.name}, your order #${id} for $${total.toFixed(2)} is confirmed.`);
    return { id, total };
  }

  // ...9 more methods mixing the same four concerns...
}
```

### Findings (smell → principle)

| # | Smell @ location | Principle violated |
|---|---|---|
| 1 | Four change-reasons in one class (validation, pricing, persistence, notification) | SRP (SOLID) |
| 2 | Region tax branch grows with every new region; duplicated in `invoice-preview.ts` | OCP (SOLID) + DRY |
| 3 | Email body formatting welded to the SMTP transport | Separation of concerns |
| 4 | `placeOrder` both mutates state and computes/returns the total | CQS (noted; kept — return value is part of the public contract, see not-done list) |

### Transforms (one reversible move per commit, verified after each)

1. **Extract `CartValidator`** (SRP). Move the two validation loops verbatim; `OrderManager`
   delegates. *Verify:* type-check clean, all 61 existing tests green, error messages byte-identical
   (`"empty cart"`, `` `bad qty for ${it.sku}` `` untouched).
2. **Extract `PricingPolicy` with a region table** (OCP + DRY). The `if/else` chain becomes a lookup
   `{ EU: 0.2, UK: 0.2, DEFAULT: 0.0825 }`; `invoice-preview.ts` now imports the same policy.
   *Verify:* a characterization check over all three regions × three carts produces identical totals
   to the old branch, including the `toFixed(2)` rounding.
3. **Extract `OrderNotifier`** (SoC). The message template moves behind a small interface;
   the SMTP transport is injected. *Verify:* the sent subject and body strings are asserted
   byte-identical in the existing notification test.
4. **Slim `OrderManager` to orchestration.** It now composes the three collaborators; 412 → 74 lines
   in the manager, logic count unchanged overall.

### Deliberately not done

- The CQS finding on `placeOrder` (would change the public return contract — a rewrite, not a refactor).
- A latent bug noticed en route: UK tax hardcoded equal to EU. **Parked as a note for reviewers, not fixed** — behavior preservation includes preserving bugs.
- No repository interface extracted for `Db`: only one implementation exists, so the abstraction would not pay for itself.

### Proof of identical behavior
Baseline pass-set identical (61/61 before, 61/61 after), build clean after every move, four commits
each tagged with its principle, ordering and error text verified unchanged.

---

## Example 2 — Functional-core extraction from an imperative module (decision window: mix and match)

### Detected stack
`diagnose.mjs classify` reports JavaScript (Node), script-style imperative module, no classes.

### The decision window (as shown to the user)

> I detected a **Node imperative-script** stack. The registry recommends the agnostic baseline plus
> **separation of concerns + fail-fast + Unix (do one thing)**.
>
> **(a) Accept** · **(b) Mix and match** · **(c) Unconventional**.

**User chose (b): baseline + functional-core/imperative-shell + CQS**, dropping the Unix item.
Registry risk line stated and accepted: *"functional-core: pure/impure boundary discipline is on
you — the language will not enforce it."* Recorded:
`principles: baseline+functional-core+CQS (mix-and-match, risk accepted: unenforced purity boundary)`.

### Before

```js
// report.js — reads, computes, and writes in one interleaved pass
const fs = require("fs");

function run(path) {
  const rows = fs.readFileSync(path, "utf8").split("\n").filter(Boolean);
  let out = "name,avg\n";
  const byName = {};
  for (const row of rows.slice(1)) {
    const [name, score] = row.split(",");
    if (!byName[name]) byName[name] = [];
    byName[name].push(Number(score));
    fs.appendFileSync("audit.log", `seen ${name}\n`);   // I/O mid-computation
  }
  for (const name of Object.keys(byName)) {
    const scores = byName[name];
    out += `${name},${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}\n`;
  }
  fs.writeFileSync("report.csv", out);
  console.log(`wrote ${Object.keys(byName).length} rows`);
}
```

### Findings (smell → principle)

| # | Smell @ location | Principle |
|---|---|---|
| 1 | Parse/aggregate logic interleaved with file reads, appends, writes, and console output | Functional core / imperative shell |
| 2 | `run` both computes the report and performs all side effects; nothing is testable without a filesystem | CQS + SoC |
| 3 | `Number(score)` on unvalidated input silently yields `NaN` averages | Fail-fast (noted; **parked** — adding validation would change behavior on bad input) |

### Transforms

1. **Extract the pure core.** `parseRows(text) -> records`, `aggregate(records) -> {name, avg}[]`,
   `renderCsv(aggregates) -> string` — pure functions, no `fs`, no `console`. The arithmetic,
   `.toFixed(1)`, key iteration order, and the header line move verbatim.
   *Verify:* core output on three fixture inputs is byte-identical to the old `out` string.
2. **Shrink the shell.** `run` becomes: read file → call core → append the same `seen ${name}` audit
   lines **in the same order and at the same point relative to the write** → write `report.csv` →
   same `console.log`. *Verify:* running on the fixture directory produces identical `report.csv`,
   identical `audit.log` line sequence, identical stdout.
3. **CQS inside the core.** Each core function either returns a value or (in the shell) performs an
   effect — never both. No user-visible change; verified by the same fixture run.

### Deliberately not done

- The `NaN`-on-bad-input behavior (finding 3): fail-fast validation would alter outputs for
  malformed files. Parked for the reviewers with a one-line repro.
- No async conversion, no streaming: the sync I/O ordering is observable (audit lines interleave
  with the run) and therefore part of preserved behavior.

### Proof of identical behavior
Three-fixture byte-comparison of `report.csv`, `audit.log`, and stdout: identical before/after.
Three commits, each one reversible move, each tagged with its principle.
