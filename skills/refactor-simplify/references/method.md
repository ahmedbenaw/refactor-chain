# Quality-Only Simplification Pass — full method

Make the changed code **simpler and clearer** while keeping behavior **exactly**
identical, and **without hunting for bugs.** Four lenses only — reuse, dead code,
altitude, clarity. It *applies* the fixes in verified, reversible steps. It stays
rigorously in its lane: correctness/security/performance defects are **noted and left**
for the reviewers, never fixed here.

Absorbs: `simplify` — the quality-only "reuse / simplification / efficiency of
expression / right altitude" cleanup pass, with efficiency scoped to *clarity of
expression*, not runtime performance (that's `refactor-performance`).

---

## 0. The lane — what this skill is and is NOT

| In lane (this skill) | Out of lane (note, don't touch) |
|---|---|
| Reuse an existing helper instead of a duplicate | A logic bug / off-by-one → `refactor-review-gate` |
| Delete unreachable / unused code | Injection, secret, unsafe input → `refactor-security` |
| Collapse a needless layer of indirection | An N+1 / O(n²) / heavy dependency → `refactor-performance` |
| Rename `data` → `invoice`; flatten nesting | A changed-behavior risk → `refactor-red-team` |

**The lane test, applied to every candidate change:** *"Does this make the code simpler
or clearer while doing the exact same thing?"* If yes → in lane. If it changes what the
code *does* (even to make it "more correct") → out of lane: note it, leave it. Fixing a
bug inside a cleanup is exactly the smuggled behavior change a refactor must never make.

---

## 1. Behavior is the invariant — prove it every step

A simplification is only legitimate if behavior is provably unchanged. So:

```
node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs status --target <dir>   # baseline: true?
```

No green baseline → stop and get one (`refactor-safety-net`). The baseline pass-set is
the ground truth every step is checked against by `refactor-verify`. Output, side
effects, error type/trigger, ordering, and timing must all come out identical.

---

## 2. The four lenses (the catalogue)

### Lens 1 — Reuse
- **Duplicated logic.** The same computation/transform in two places → extract once,
  call twice (or reuse the existing one).
- **Reinvented wheel.** A hand-rolled `groupBy`, `clamp`, date format, deep-clone, or
  retry that the stdlib / an existing util already does → use the existing one.
- **Copy-pasted block** that drifted by a constant → parameterize the one function.
- Caution: only merge things that are the *same by intent*, not coincidentally alike —
  merging two things that will evolve apart is a future un-simplification.

### Lens 2 — Dead code
- Unreachable branches (a condition that can't be true; code after an unconditional
  return/throw).
- Unused exports, functions, parameters, variables, imports.
- Commented-out blocks and "temporary" scaffolding left behind.
- A feature flag / config branch that is always one value in practice → collapse to that
  value (only if genuinely always that value — else out of lane).
- Delete decisively. Version control is the safety net; leaving dead code "just in case"
  is the smell, not caution.

### Lens 3 — Altitude (over- AND under-abstraction)
- **Too high (collapse):** a wrapper that only forwards; a one-implementation "interface"
  with no test seam or second impl; a factory that builds one thing; generic machinery
  serving a single caller; premature `<T>`. Inline it to the level that has one caller
  and one meaning.
- **Too low (rare — add the one seam):** a 20-line inline block repeated in three places
  that would read as one well-named function; a magic expression that a single named
  helper would make obvious. Add *exactly one* clarifying function — not a framework.
- The target is "as many layers as the problem has, and no more." Every layer must earn
  its place with a real reason (a genuine boundary, a real second implementation, a true
  test seam). YAGNI beats speculative structure.

### Lens 4 — Clarity
- **Names:** state intent, not mechanics or type (`invoice`, not `data`/`obj`/`temp`;
  `isEligible`, not `flag`). A good name deletes a comment.
- **Shape:** flatten deep nesting with early returns/guards; break a long boolean chain
  into named predicates; split a function that does two things at the seam.
- **Flow:** order code so it reads top-to-bottom; remove misleading or stale comments;
  keep the happy path unindented.
- Clarity changes are the cheapest and safest wins — prioritize them.

---

## 3. Safe-move mechanics

Each simplification is ONE reversible step:

- **Reuse:** introduce/point at the shared function, replace one duplicate, verify,
  then the next; delete the old bodies when unreferenced.
- **Dead code:** delete; let the compiler/tests confirm nothing referenced it.
- **Altitude (collapse):** inline the layer at its single call site; verify; delete the
  now-empty wrapper.
- **Altitude (add seam):** extract the repeated block to one named function, callers
  delegate, verify.
- **Clarity:** use **type-aware rename** so the compiler lists every reference; flatten
  with guards; split at the seam.

One transformation per step. Never a dozen mixed changes in one uncommitted blob.

---

## 4. Verify after every step

Re-run the baseline (`refactor-verify`):

- **Identical pass-set** → keep the step.
- **Any drift** (a failed assertion, a changed output) → **undo that exact step
  immediately**; try a smaller version, or skip it. A simplification that moves behavior
  is not a simplification. The only failures legal to mechanically fix are the
  import/path churn a rename necessarily produces.

---

## 5. Ask before the big moves

- **Proceed silently** on small local wins: delete a dead branch, rename a local, inline
  a trivial forwarder, flatten nesting.
- **Offer as a one-line choice** the larger reshapes: merging layers across a module,
  changing a public function's shape, collapsing an abstraction other code leans on.
  "This could collapse to one function — want me to, or leave it?" One decision at a time.

---

## 6. Report — including what you deliberately left

Fill `templates/output.md`:

- **Simplified** — each change: lens → what → `file:line` → how behavior stayed identical
  (which check proved it).
- **Offered / deferred** — the bigger moves you surfaced and their decision.
- **Out of lane — noted, NOT touched** — anything that looked like a correctness,
  security, or performance issue. This is the explicit hand-off to the reviewers; it is
  the proof this pass didn't stray into bug-fixing.

---

## 7. Relationship to the chain

- **Baseline / verify:** every step is proven against `refactor-safety-net` via
  `refactor-verify` — the same loop the whole chain uses.
- **`refactor-code-principles`:** the broader SOLID/layering consolidation; this skill is its
  narrower quality-only sibling (no architecture theory, just simpler/clearer).
- **The reviewers:** out-of-lane observations go to `refactor-review-gate` (correctness),
  `refactor-security` (safety), `refactor-performance` (speed), `refactor-red-team`
  (behavior). This skill *feeds* them notes; it never does their job.
