# refactor-plan-gate — worked example

Task as stated: "Refactor the payment module — split the god class and rename the
package while you're at it."

## Before (no plan gate)

The work starts with the first edit that comes to mind:

1. `PaymentService.java` (1,900 lines) gets split into `PaymentService`,
   `RefundService`, `LedgerWriter` — by feel, in one sitting.
2. Mid-split, the package rename starts too (`com.acme.pay` → `com.acme.payments`),
   because "while you're at it".
3. Compile fails: a reflection-based plugin loader resolves `com.acme.pay.*` class
   names from a **string in a YAML file**. Nobody checked for reflective access.
4. Now there are two half-done changes tangled in one working tree. Rolling back the
   rename also rolls back half the split. Two hours in, the honest move is
   `git checkout -- .` and starting over.

The failure was not the code — it was that "hidden callers via reflection?" was never
asked, and "split" and "rename" were never sequenced.

## After (plan gate first)

`orchestrate.mjs init` builds the backend lane. Before baseline, the gate produces
`.refactor-chain/plan.md`:

```markdown
# Mini-plan — payment module split + rename

## Goal
PaymentService's three responsibilities live in three classes, and the package is
`com.acme.payments`, with behavior identical to baseline.

## Unknowns
1. Reflective/string-based access to `com.acme.pay.*`?
   → grep for "com.acme.pay" in resources/, *.yml, *.xml BEFORE any rename step.
2. Is RefundService logic covered by the existing tests at all?
   → check coverage on the refund paths before splitting; if uncovered, the
     safety-net step adds a characterization test first.

## Success criteria
- Recorded baseline pass-set identical after every step (chain invariant).
- No string "com.acme.pay" remains anywhere in the repo (code OR resources).
- Each new class has a single reason to change; no class > 400 lines.

## Step order (from state.steps)
1. refactor-backend-01-architecture — split ONLY; no rename in this step.
   Scope: src/main/java/com/acme/pay/, src/test/java/com/acme/pay/
2. refactor-backend-02-module-rename — rename AFTER split is verified.
   Front-load: resolve unknown #1 before this step starts.
3. …rest of backend lane…
```

The grep from unknown #1 finds `plugin-registry.yml` with three fully-qualified class
names. The rename step's plan note now says "update plugin-registry.yml in the same
step — it is rename churn, legal to fix." What was a two-hour tangle in the "before"
world is one anticipated line item.

Marker note lands on `steps[0].notes`, `plan.md` exists, baseline unlocks.

## Why this works

- **Sequencing was the whole game.** Split-then-rename, each separately verified, is
  trivially rollback-able. Interleaved, neither is.
- **The unknown was resolvable by one grep** — but only if someone asks before
  editing. The plan's format (unknown → resolution → when) forces the ask.
- **Criteria made "done" binary:** the leftover-string check caught a stale
  `com.acme.pay` reference in a README that the compiler never would have.

## Spec-kit variant

Same repo, but diagnose reports `spec-kit` (`.specify/` present, `spec.md` current,
`tasks.md` has an open item "T-14: split PaymentService"). Checkpoint fires:

> "You already keep specs in `.specify/`. This is a bounded refactor and your spec
> looks current, so I recommend **Mode 1 (Integrate)**: T-14 becomes the plan, I fence
> my edits to T-14's paths, verify additionally checks T-14's acceptance criteria, and
> I update the spec artifacts when done. Or **Mode 3 (Adopt)** runs the full
> spec-driven flow as our plan phase — better if the spec were stale. Which one?"

User picks Mode 1 → `plan.md` header records `mode: 1`, goal/criteria are extracted
from T-14 with pointers back, and the rename never leaves T-14's fence.
