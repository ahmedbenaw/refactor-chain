# Worked examples — one drift (rolled back), one rename (churn fixed, advanced)

Both use the pricing baseline from `refactor-safety-net`'s example:
`npx jest price.characterization` → recorded green pass-set `4 passed`.

---

## Example A — a step that DRIFTS → roll back, do not fix

**Step:** "extract the SAVE10 discount into a strategy." During the extraction, the
developer 'cleaned up' the `-5` stacking they thought was a bug.

Re-run the exact baseline after the step:

```
$ npx jest price.characterization
 FAIL  ./price.characterization.test.js
  ✕ SAVE10 STACKS extra -5 over 100 (pinned quirk, not endorsed)
    expect(received).toBe(expected)
    Expected: 175
    Received: 180
  3 passed, 1 failed
```

**Classify:** a test's *assertion* changed value (175 → 180). That is **behavior drift**,
not churn. `delta = drift`.

**Action — roll back, do NOT edit the test:**
```
$ git stash apply <pre-step checkpoint sha>     # repo back to last green
$ npx jest price.characterization
 PASS  (4 passed)                                # baseline green again
$ node <orchestrate.mjs> advance --target . --delta drift
{ "ok": false, "blocked": "behavior drifted — roll back this step, do not advance" }
$ node <orchestrate.mjs> fail --target . --reason "priceCart SAVE10 over-100 expected 175 got 180 (stacking removed)"
{ "ok": true, "status": "healing", "retries": 1, "selfHeal": true }
```

The wrong move would have been editing the test to expect `180` — that silently blesses
a behavior change and destroys the safety net. Instead the step is re-attempted as a
*pure* extraction (keep the `-5` stacking exactly), then verified again.

Plain-language line to the user: *"That step actually changed a price (175 became 180),
so I undid it — your code is back to the last good state. I'll redo the extraction
without changing any behavior. (attempt 2 of 3)"*

---

## Example B — a rename step → only import churn, legal to fix → advance

**Step:** `refactor-web-02-modules` moves `price.js` to `pricing/price.js`.

Re-run the baseline:

```
$ npx jest price.characterization
 FAIL  ./price.characterization.test.js
  ● Test suite failed to run
    Cannot find module './price' from 'price.characterization.test.js'
```

**Classify:** the failure is a **module-resolution error caused directly by the move** —
no assertion ran, no output value changed. This is rename-induced churn, the one thing
legal to fix mechanically.

**Action — fix ONLY the import path, re-run:**
```js
// price.characterization.test.js
- const { priceCart } = require("./price");
+ const { priceCart } = require("./pricing/price");
```
```
$ npx jest price.characterization
 PASS  (4 passed)                                # identical pass-set restored
$ node <orchestrate.mjs> advance --target . --delta legal --note "rename churn: updated 1 import path; 4 passed identical"
{ "ok": true, "done": false, "phase": "lane", "next": "refactor-web-03-components" }
```

We touched only the `require` path the move necessitated — no assertion, no logic, no
snapshot. The pass-set is identical again, so `delta = legal` and the chain advances.

Plain-language line: *"The only thing that broke was one import path after moving the
file — expected from the rename, not a behavior change. Fixed just that import,
re-checked, all four tests pass. Moving on."*

---

## The distinction in one line
- Assertion value moved → **drift → roll back** (Example A).
- Import/path broke *because a rename moved a file* → **legal churn → fix path, re-run,
  advance** (Example B).
Everything else that breaks the build is treated as drift until proven pure churn.
