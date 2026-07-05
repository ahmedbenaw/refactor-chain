# refactor-adversarial-verify — worked example

Step under verification: `refactor-web-02-modules` extracted a shared
`formatMoney(amount, currency)` helper into `src/lib/format.js` and updated
"all" call sites. `refactor-verify` just re-ran the baseline: green, pass-set
identical. Author-mode confidence: high.

## Before (no adversarial pass)

"Baseline's green, imports updated, step done" →
`orchestrate.mjs advance --delta legal`. The chain rolls on.

Two steps later, the checkout page renders `undefined NaN` in production preview.
Cause: one call site was never migrated — it lived in an inline `<script>` block in
`templates/checkout.html`, invisible to the import-graph search, calling the old
global `window.formatMoney` that step 02 deleted. The baseline never caught it
because no test renders that template. Now the bad edit is buried under two
subsequent steps' diffs, and unwinding it means bisecting the chain.

## After (attacker gets a turn)

**Claim (numbered per the reasoning protocol):**

> C1. Every call to money formatting now goes through `src/lib/format.js`'s
> `formatMoney`, and the pass-set is identical to baseline.

**Attack A — wrong-assumption.**
Assumption found: "all call sites are reachable through the module import graph."
Check against the live repo, not the editor's reference search:

```
grep -rn "formatMoney" --include="*.html" --include="*.ejs" templates/ public/
```

→ hit: `templates/checkout.html:87` calls `window.formatMoney(...)` from an inline
script. **Attack lands. C1 is revised:** C1' — …every call *including non-module
call sites*… The template is migrated within the step's scope, `refactor-verify`
re-runs (still identical — no test covers it, which is itself noted for the
write-up as a parked test-gap). Re-attack from the top.

**Attack B — edge-case (on the re-attack).**
Most plausible edges for a money formatter: `amount = 0` and a currency code the
old code defaulted silently. Trace: old inline code did `currency || 'USD'`; the
new helper requires `currency`. `checkout.html` passes no currency. Without Attack
A's find, this would have been `undefined` at runtime; with it, the migration adds
the explicit `'USD'`. Evidence: traced both branches in the diff; ran
`node -e 'import("./src/lib/format.js").then(m => console.log(m.formatMoney(0, "USD")))'`
→ `"$0.00"`. Holds.

**Attack C — does-it-actually-run.**
The changed template has no test. Reading is not running: launch the dev server and
load `/checkout` once — renders `$0.00` where `undefined NaN` would have been.
Evidence named (command + observed output). Holds.

**Verdict:** survived (after one landed attack and a fix) →

```
orchestrate.mjs advance --target . --delta legal \
  --note "adversarial-verify: survived 3/3 after A landed (inline template call site); test-gap parked"
```

## Why this works

- The landed attack cost ~3 minutes at the step boundary. The same bug found two
  steps later would have cost a chain bisection — this is the whole economics of
  the skill.
- Attack A's grep was only run because the ritual demands evidence per assumption;
  author-mode had already "searched all call sites" (in the import graph) and
  believed it.
- The landed attack is logged as a success, not hidden — and it left behind a
  parked note ("checkout template untested") that the write-up will surface instead
  of the fix silently expanding the step.
